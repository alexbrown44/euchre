// "What would you play?": card-play puzzles from real hands, marked against the simulator.
//
// Each puzzle is one of your turns part-way through a hand. Every card you could play was
// measured by dealing the cards you can't see hundreds of ways (keeping only deals that fit the
// calls and the cards played so far) and playing the hand out after each card.

import { cardLabel, parseCard, SUIT_NAME, SUIT_SYMBOL, type Card, type Suit } from '../../../engine/src/cards.ts';
import type { Seat } from '../../../engine/src/deal.ts';
import { teamOf } from '../../../engine/src/deal.ts';
import type { BidAction, Contract } from '../../../engine/src/bidding.ts';
import type { PlayState, Trick } from '../../../engine/src/play.ts';
import { CLOSE, type Grade, type Level } from './bidding.ts';

export interface PlayOption {
  card: string;
  /** Average net points per hand for your team after playing this card. */
  mean: number;
  /** Two standard errors of (this card minus the best card), from the paired deals. */
  margin: number;
}

export interface PlayQuestion {
  id: string;
  level: Level;
  topic: string;
  dealer: Seat;
  seat: Seat;
  upcard: string;
  trump: Suit;
  maker: Seat;
  makerLoner: Seat | null;
  loneDefender: Seat | null;
  dealerPickedUp: boolean;
  myDiscard: string | null;
  history: { seat: Seat; action: BidAction }[];
  tricks: { leader: Seat; winner: Seat | null; plays: { seat: Seat; card: string }[] }[];
  current: { leader: Seat; plays: { seat: Seat; card: string }[] };
  hand: string[];
  options: PlayOption[];
  /** The card the guide's rules (the Medium bot) would play. */
  guide: string;
  samples: number;
}

const REL = ['You', 'West', 'Partner', 'East'] as const;
export const seatName = (s: Seat) => REL[s]!;

const plays = (ps: { seat: Seat; card: string }[]) => ps.map((p) => ({ seat: p.seat, card: parseCard(p.card) }));

/** The position as a play state at your turn (other players' hands left empty: you can't see them). */
export function toState(q: PlayQuestion): PlayState {
  const sittingOut = [q.makerLoner, q.loneDefender].filter((s): s is Seat => s !== null).map((s) => ((s + 2) % 4) as Seat);
  const contract: Contract = {
    trump: q.trump,
    maker: q.maker,
    makerTeam: teamOf(q.maker),
    makerLoner: q.makerLoner,
    loneDefender: q.loneDefender,
    sittingOut,
    dealerPickedUp: q.dealerPickedUp,
    discard: q.myDiscard ? parseCard(q.myDiscard) : null,
    hands: [],
  };
  const tricks: Trick[] = q.tricks.map((t) => ({ leader: t.leader, winner: t.winner, plays: plays(t.plays) }));
  const tricksWon: [number, number] = [0, 0];
  for (const t of tricks) tricksWon[teamOf(t.winner!)]++;
  const hands: Card[][] = [[], [], [], []];
  hands[q.seat] = q.hand.map(parseCard);
  return {
    contract,
    dealer: q.dealer,
    trump: q.trump,
    active: ([0, 1, 2, 3] as Seat[]).filter((s) => !sittingOut.includes(s)),
    hands,
    tricks,
    current: { leader: q.current.leader, plays: plays(q.current.plays), winner: null },
    tricksWon,
    turn: q.seat,
  };
}

export function bestPlay(q: PlayQuestion): PlayOption {
  return q.options.reduce((a, b) => (b.mean > a.mean ? b : a));
}

export function gradePlay(q: PlayQuestion, card: string): Grade {
  const best = bestPlay(q);
  if (best.card === card) return 'best';
  const o = q.options.find((x) => x.card === card)!;
  return best.mean - o.mean <= Math.max(CLOSE, o.margin) ? 'fine' : 'wrong';
}

export const label = (id: string) => cardLabel(parseCard(id));
export const isMakers = (q: PlayQuestion) => teamOf(q.seat) === teamOf(q.maker);

/** "Partner ordered up the 9♥, alone." */
export function contractText(q: PlayQuestion): string {
  const ev = [...q.history].reverse().find((e) => e.seat === q.maker && (e.action.type === 'orderUp' || e.action.type === 'name'));
  const who = q.maker === q.seat ? 'You' : seatName(q.maker);
  const suit = `${SUIT_NAME[q.trump].toLowerCase()} ${SUIT_SYMBOL[q.trump]}`;
  let text: string;
  if (q.upcard === 'BENNY') text = `The Benny was turned up, so ${who === 'You' ? 'you' : who} (the dealer) named ${suit} blind`;
  else if (ev?.action.type === 'orderUp') text = q.maker === q.dealer ? `${who} picked up the ${label(q.upcard)}` : `${who} ordered up the ${label(q.upcard)}`;
  else text = `${who} named ${suit}`;
  if (q.makerLoner !== null) text += q.makerLoner === q.seat ? ', and you are playing alone' : `, and ${seatName(q.makerLoner)} is playing alone`;
  if (q.loneDefender !== null) text += q.loneDefender === q.seat ? '. You are defending alone' : `. ${seatName(q.loneDefender)} is defending alone`;
  return `${text}.`;
}

/** The guide section and a short name for each kind of decision. */
const TOPICS: Record<string, { name: string; heading: string }> = {
  'maker-opening-lead': { name: 'Opening lead, your side made trumps', heading: "The makers' opening lead" },
  'defender-opening-lead': { name: 'Opening lead, defending', heading: "The defenders' opening lead" },
  'maker-later-lead': { name: 'Your lead, your side made trumps', heading: 'Later leads' },
  'defender-later-lead': { name: 'Your lead, defending', heading: 'Later leads' },
  'void-opponent-winning': { name: "Out of the suit, an opponent winning", heading: 'Trumping in' },
  'void-partner-winning': { name: 'Out of the suit, your partner winning', heading: 'Let it go' },
  'follow-partner-winning': { name: 'Following suit, your partner winning', heading: 'Let it go' },
  'follow-opponent-winning': { name: 'Following suit, an opponent winning', heading: 'Let it go' },
  'loner-maker-lead': { name: "You're playing alone: your lead", heading: "When you're the loner" },
  'loner-maker-follow': { name: "You're playing alone", heading: "When you're the loner" },
  'loner-defend-lead': { name: 'Against a loner: your lead', heading: 'Defending against a loner' },
  'loner-defend-follow': { name: 'Against a loner', heading: 'Defending against a loner' },
  'vs-lone-defender-lead': { name: 'Against a lone defender: your lead', heading: "Makers against a lone defender: don't draw" },
  'vs-lone-defender-follow': { name: 'Against a lone defender', heading: "Makers against a lone defender: don't draw" },
  'lone-defender-lead': { name: "You're defending alone: your lead", heading: "The lone defender's own leads" },
  'lone-defender-follow': { name: "You're defending alone", heading: "The lone defender's own leads" },
};

export const topicName = (q: PlayQuestion) => TOPICS[q.topic]?.name ?? 'Your turn';
export const topicHeading = (q: PlayQuestion) => TOPICS[q.topic]?.heading ?? 'Card play';
export const TOPIC_IDS = Object.keys(TOPICS);

/** Why the guide's rule of thumb and the measured best card can differ. */
export function whyPlaysDiffer(q: PlayQuestion): string[] {
  const reasons = [
    "The guide's card-play rules are averages over many positions. This puzzle is one exact position: which cards have gone, who has run out of what, and how many tricks each side has.",
  ];
  if (q.tricks.length >= 2) reasons.push('Late in a hand, the cards already played tell you a lot. The simulator uses all of it; a rule of thumb only uses some.');
  if (q.makerLoner !== null || q.loneDefender !== null) reasons.push('With a player sitting out, a single trick can be worth several points, so small differences in the odds matter more.');
  reasons.push('If the gap is small, both cards are reasonable: the rule is still a good habit.');
  return reasons;
}

