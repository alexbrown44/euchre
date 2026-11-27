// The bidding quiz ("Would you call?"): its questions, how answers are marked, and the words used
// to explain them. Questions come from engine/experiments/quiz-bank.ts (see app/scripts/build-bidding-bank.ts).

import { effectiveSuit, isTrump, parseCard, sameColourSuit, SUITS, SUIT_NAME, SUIT_SYMBOL, trumpRank, type Card, type Suit } from '../../../engine/src/cards.ts';
import { bennyDealerShouldGoAlone, bestAfterPickup } from '../../../engine/src/bots/evaluate.ts';
import { leftOf, partnerOf, type Seat } from '../../../engine/src/deal.ts';
import type { BidAction } from '../../../engine/src/bidding.ts';

export type Level = 'beginner' | 'seasoned';
export type Role = 'left' | 'dealersPartner' | 'right' | 'dealer';

export interface BankOption {
  action: BidAction;
  /** Average net points per hand for your team with this choice. */
  mean: number;
  /** Two standard errors of (this choice minus the best), from the paired redeals. */
  margin: number;
}

export interface BankQuestion {
  id: string;
  level: Level;
  dealer: Seat;
  seat: Seat;
  /** 'bennyAlone': the Benny was turned up, you (the dealer) named `trump` blind, picked up and discarded. */
  phase: 'round1' | 'round2' | 'bennyAlone';
  /** bennyAlone: the suit you named blind, and the card you discarded. */
  trump?: Suit;
  discard?: string;
  hand: string[];
  upcard: string;
  history: { seat: Seat; action: BidAction }[];
  options: BankOption[];
  /** What the strategy guide's written rules say to do (guideChoice). */
  guide: BidAction;
  samples: number;
}

/** Differences smaller than this (points per hand) are too small to matter at the table. */
export const CLOSE = 0.05;

export const actionKey = (a: BidAction): string =>
  a.type === 'pass' ? 'pass' : a.type === 'orderUp' ? `orderUp${a.alone ? '-alone' : ''}` : a.type === 'name' ? `name-${a.suit}${a.alone ? '-alone' : ''}` : a.type;

export function roleOf(seat: Seat, dealer: Seat): Role {
  if (seat === dealer) return 'dealer';
  if (seat === partnerOf(dealer)) return 'dealersPartner';
  return leftOf(dealer) === seat ? 'left' : 'right';
}

/** Seat names from your point of view: you, then clockwise West (your left), Partner, East. */
const REL = ['You', 'West', 'Partner', 'East'] as const;
export const seatName = (q: BankQuestion, s: Seat) => REL[(s - q.seat + 4) % 4]!;

export const ROLE_TEXT: Record<Role, string> = {
  left: 'on the dealer\'s left (first to speak)',
  dealersPartner: 'the dealer\'s partner',
  right: 'on the dealer\'s right',
  dealer: 'the dealer (last to speak)',
};

export const cards = (ids: readonly string[]): Card[] => ids.map(parseCard);

export function turnedDown(q: BankQuestion): Suit | null {
  const up = parseCard(q.upcard);
  return q.phase === 'round2' && up.kind === 'suited' ? up.suit : null;
}

/** The words on a choice's button. */
export function optionLabel(q: BankQuestion, a: BidAction): string {
  if (q.phase === 'bennyAlone') return a.type === 'goAlone' ? 'Go alone' : 'Keep your partner';
  const role = roleOf(q.seat, q.dealer);
  if (a.type === 'pass') return 'Pass';
  if (a.type === 'orderUp') {
    if (role === 'dealersPartner') return 'Up and Down (you play alone)';
    if (role === 'dealer') return a.alone ? 'Pick it up, alone' : 'Pick it up';
    return a.alone ? 'Order it up, alone' : 'Order it up';
  }
  if (a.type === 'name') return `${SUIT_NAME[a.suit]} ${SUIT_SYMBOL[a.suit]}${a.alone ? ', alone' : ''}`;
  return a.type;
}

/** What someone said earlier, in table language. */
export function saidLabel(a: BidAction): string {
  if (a.type === 'pass') return 'Pass';
  if (a.type === 'orderUp') return a.alone ? 'Order it up, alone' : 'Order it up';
  if (a.type === 'name') return `${SUIT_NAME[a.suit]}${a.alone ? ', alone' : ''}`;
  return a.type;
}

export type Grade = 'best' | 'fine' | 'wrong';

export function bestOption(q: BankQuestion): BankOption {
  return q.options.reduce((a, b) => (b.mean > a.mean ? b : a));
}

/** "Fine" means within the measuring error of the best, or within CLOSE points a hand of it. */
export function grade(q: BankQuestion, key: string): Grade {
  const best = bestOption(q);
  if (actionKey(best.action) === key) return 'best';
  const o = q.options.find((x) => actionKey(x.action) === key)!;
  return best.mean - o.mean <= Math.max(CLOSE, o.margin) ? 'fine' : 'wrong';
}

const isTop = (c: Card, trump: Suit) => c.kind === 'benny' || (c.kind === 'suited' && c.rank === 'J' && (c.suit === trump || c.suit === sameColourSuit(trump)));
const topName = (c: Card, trump: Suit) => (c.kind === 'benny' ? 'the Benny' : c.kind === 'suited' && c.suit === trump ? 'the Right Bower' : 'the Left Bower');

function list(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** A plain description of the hand for one possible trump suit. */
export function handFor(hand: readonly Card[], trump: Suit): string {
  const trumps = hand.filter((c) => isTrump(c, trump));
  const tops = trumps.filter((c) => isTop(c, trump)).map((c) => topName(c, trump));
  const aces = hand.filter((c) => c.kind === 'suited' && c.rank === 'A' && !isTrump(c, trump)).length;
  const n = trumps.length;
  let s = `${n === 0 ? 'no' : n} trump${n === 1 ? '' : 's'}`;
  if (tops.length) s += ` (including ${list(tops)})`;
  s += aces ? `, and ${aces === 1 ? 'an' : aces} off-suit Ace${aces === 1 ? '' : 's'}` : ', and no off-suit Ace';
  return s;
}

/** One or two lines saying what the hand holds for the choices that matter. */
export function describeHand(q: BankQuestion): string[] {
  const hand = cards(q.hand);
  const up = parseCard(q.upcard);
  if (q.phase === 'bennyAlone' && q.trump) return [`With ${SUIT_NAME[q.trump].toLowerCase()} as trumps you have ${handFor(hand, q.trump)}.`];
  if (q.phase === 'round1' && up.kind === 'suited') {
    const role = roleOf(q.seat, q.dealer);
    if (role === 'dealer') {
      return [`Picking up the ${up.rank}${SUIT_SYMBOL[up.suit]} would give you ${handFor([...hand, up], up.suit)} (before your discard).`];
    }
    return [`With ${SUIT_NAME[up.suit].toLowerCase()} as trumps you'd have ${handFor(hand, up.suit)}.`];
  }
  const banned = turnedDown(q);
  return (['S', 'H', 'D', 'C'] as Suit[])
    .filter((s) => s !== banned)
    .map((s) => ({ s, n: hand.filter((c) => isTrump(c, s)).length }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map(({ s }) => `With ${SUIT_NAME[s].toLowerCase()} as trumps you'd have ${handFor(hand, s)}.`);
}

/** The guide section to read for this decision (a heading in STRATEGY_GUIDE.md). */
export function guideHeading(q: BankQuestion): string {
  if (q.phase === 'bennyAlone') return 'The Benny turned up: the blind call';
  const role = roleOf(q.seat, q.dealer);
  const best = bestOption(q).action;
  const alone = (best.type === 'orderUp' || best.type === 'name') && best.alone;
  if (q.phase === 'round1') {
    if (role === 'dealer') return alone ? 'The dealer\'s loner' : 'Dealer';
    return { left: 'Left of dealer', dealersPartner: 'Dealer\'s partner: Up and Down', right: 'Right of dealer' }[role];
  }
  if (alone) return 'Going alone in round two';
  if (role === 'dealer') return 'The dealer, last to speak';
  if (role === 'dealersPartner') return 'Dealing team, dealer\'s partner: against colour (avoid next)';
  return 'Non-dealing team (left and right of dealer): make next, but with 3';
}

/** Points per hand, signed: "+0.42", "−0.10". */
export const pts = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}`;

// ---------------------------------------------------------------------------
// When the guide's rule of thumb and the simulator disagree

const RULE_ROUND1: Record<Role, string> = {
  left: 'Order up almost never: pass with 3 trumps. Go alone with 4+ trumps including two top trumps, or any 5 trumps (but with the Benny, Right and Left, pass and name next in round two).',
  dealersPartner: 'Call Up and Down (always alone) with 4+ trumps.',
  right: 'Order up almost never: pass with 3 trumps, and with 4 if only one is a top trump. Go alone with 4+ trumps including two top trumps, or any 5 trumps.',
  dealer: 'Pick up with 3 trumps, or the Right Bower + 1 unless your outside cards are in three different suits. Go alone with 3 big trumps and one outside suit (the league rule), 3 trumps (2 big) and an outside Ace, 3 trumps including a top trump with two outside Aces, 4 trumps including a top trump, or any 5 trumps.',
};

const RULE_ROUND2: Record<Role, string> = {
  left: 'Name next with 3 trumps, or 2 in next plus an off-suit Ace; the opposite colour needs 3 including a top trump.',
  right: 'Name next with 3 trumps, or 2 in next plus an off-suit Ace; the opposite colour needs 3 including a top trump.',
  dealersPartner: 'Name with 3 trumps, preferably the opposite colour; next only with 3 including a top trump. Pass with 2.',
  dealer: 'With 3 trumps, name next if you have an off-suit Ace, or the opposite colour with a top trump (or one outside suit and its Ace). Pass with 2 and let it be thrown in.',
};

/** The guide's rule of thumb for this seat and round, in a sentence or two. */
export const BENNY_RULE = 'After a blind call, go alone with 4 or 5 trumps, or 3 trumps with an off-suit Ace (the Benny and both Bowers are also enough). Otherwise keep your partner.';

export function guideRule(q: BankQuestion): string {
  if (q.phase === 'bennyAlone') return BENNY_RULE;
  const role = roleOf(q.seat, q.dealer);
  if (q.phase === 'round1') return RULE_ROUND1[role];
  return `${RULE_ROUND2[role]} Go alone in round two only with 4+ trumps.`;
}

/** What the hand holds with `trump` as trumps: trumps, top trumps (Benny, Right, Left), big trumps (and the Ace). */
function count(hand: readonly Card[], trump: Suit) {
  const trumps = hand.filter((c) => isTrump(c, trump));
  const outside = hand.filter((c) => !isTrump(c, trump));
  const aces = outside.filter((c) => c.kind === 'suited' && c.rank === 'A');
  return {
    n: trumps.length,
    top: trumps.filter((c) => trumpRank(c, trump) >= 6).length,
    big: trumps.filter((c) => trumpRank(c, trump) >= 5).length,
    right: trumps.some((c) => trumpRank(c, trump) === 7),
    benny: trumps.some((c) => c.kind === 'benny'),
    left: trumps.some((c) => trumpRank(c, trump) === 6),
    aces: aces.length,
    outsideSuits: new Set(outside.map((c) => effectiveSuit(c, trump))).size,
    /** Every outside card is in one suit, and its Ace is among them. */
    oneSuitWithAce: outside.length > 0 && new Set(outside.map((c) => effectiveSuit(c, trump))).size === 1 && aces.length > 0,
  };
}

/**
 * The choice the strategy guide's written rules give (the one-page card and sections 1 and 2),
 * so "the guide's view" in the quiz is exactly what the guide says.
 */
export function guideChoice(q: BankQuestion): BidAction {
  const role = roleOf(q.seat, q.dealer);
  const hand = cards(q.hand);
  const up = parseCard(q.upcard);
  const pass: BidAction = { type: 'pass' };
  if (q.phase === 'bennyAlone') return q.trump && bennyDealerShouldGoAlone(hand, q.trump) ? { type: 'goAlone' } : pass;
  if (up.kind !== 'suited') return pass;
  if (q.phase === 'round1') {
    const t = up.suit;
    const h = count(hand, t);
    const brl = h.benny && h.right && h.left;
    if (role === 'dealersPartner') return h.n >= 4 ? { type: 'orderUp', alone: true } : pass;
    if (role === 'left' || role === 'right') {
      if (brl) return role === 'left' ? pass : { type: 'orderUp', alone: true };
      return h.n >= 5 || (h.n >= 4 && h.top >= 2) ? { type: 'orderUp', alone: true } : pass;
    }
    // The dealer: judge the hand after picking up and discarding.
    const a = count(bestAfterPickup(hand, up, t), t);
    const alone =
      (a.big >= 3 && a.outsideSuits <= 1) ||
      (a.n === 3 && a.big >= 2 && a.aces >= 1) ||
      (a.n === 3 && a.top >= 1 && a.aces >= 2) ||
      (a.n === 4 && a.top >= 1) ||
      a.n >= 5;
    if (alone) return { type: 'orderUp', alone: true };
    if (a.n >= 3 || (a.n === 2 && a.right && a.outsideSuits < 3)) return { type: 'orderUp', alone: false };
    return pass;
  }
  // Round two.
  const next = sameColourSuit(up.suit);
  let best: { suit: Suit; score: number; n: number } | null = null;
  for (const s of SUITS) {
    if (s === up.suit) continue;
    const h = count(hand, s);
    const isNext = s === next;
    let ok: boolean;
    if (h.n >= 4) ok = true;
    else if (role === 'left' || role === 'right') ok = isNext ? h.n >= 3 || (h.n === 2 && h.aces >= 1) : h.n >= 3 && h.top >= 1;
    else if (role === 'dealersPartner') ok = h.n >= 3 && (!isNext || h.top >= 1);
    else ok = h.n >= 3 && (h.top >= 1 || (isNext ? h.aces >= 1 : h.oneSuitWithAce));
    if (!ok) continue;
    // More trumps first, then top trumps, then the colour each seat prefers.
    const prefersNext = role !== 'dealersPartner';
    const score = h.n * 10 + h.top * 3 + (isNext === prefersNext ? 1 : 0);
    if (!best || score > best.score) best = { suit: s, score, n: h.n };
  }
  return best ? { type: 'name', suit: best.suit, alone: best.n >= 4 } : pass;
}

const isAlone = (a: BidAction) => a.type === 'goAlone' || ((a.type === 'orderUp' || a.type === 'name') && a.alone);
/** How bold a choice is: pass, call, call alone. */
const boldness = (a: BidAction) => (a.type === 'pass' ? 0 : isAlone(a) ? 2 : 1);

/** The trump suit the disagreement is about. */
function suitInQuestion(q: BankQuestion): Suit | null {
  if (q.phase === 'bennyAlone') return q.trump ?? null;
  const up = parseCard(q.upcard);
  if (q.phase === 'round1') return up.kind === 'suited' ? up.suit : null;
  for (const a of [bestOption(q).action, q.guide]) if (a.type === 'name') return a.suit;
  return null;
}

/**
 * Why the rule of thumb and the simulator can disagree on this hand: the general reason first,
 * then what is particular about this hand and these calls.
 */
export function whyTheyDiffer(q: BankQuestion): string[] {
  const best = bestOption(q);
  const guideOpt = q.options.find((o) => actionKey(o.action) === actionKey(q.guide));
  const gap = guideOpt ? best.mean - guideOpt.mean : 0;
  const bolder = boldness(best.action) > boldness(q.guide);
  const role = roleOf(q.seat, q.dealer);
  const reasons: string[] = [
    'A rule of thumb sorts hands by a few things you can count at a glance (trumps, top trumps, off-suit Aces) and gives the answer that pays best on average for that kind of hand. The simulator answers for this exact hand, so a hand with something unusual about it can land on the other side of the line.',
  ];

  const suit = suitInQuestion(q);
  if (suit) {
    const up = parseCard(q.upcard);
    const hand = [...cards(q.hand), ...(q.phase === 'round1' && role === 'dealer' ? [up] : [])];
    const trumps = hand.filter((c) => isTrump(c, suit));
    const tops = trumps.filter((c) => isTop(c, suit));
    const offAces = hand.filter((c) => c.kind === 'suited' && c.rank === 'A' && !isTrump(c, suit));
    const offSuits = new Set(hand.filter((c) => !isTrump(c, suit)).map((c) => (c.kind === 'suited' ? c.suit : null)));
    const voids = (['S', 'H', 'D', 'C'] as Suit[]).filter((s) => s !== suit && !offSuits.has(s));
    const name = SUIT_NAME[suit].toLowerCase();
    if (bolder) {
      if (tops.length >= 2) reasons.push(`Quality as well as quantity: with ${name} as trumps you'd hold ${list(tops.map((c) => topName(c, suit)))}. A count of trumps treats these like any other trumps, but they win tricks almost for certain.`);
      if (offAces.length >= 1) reasons.push(`Your ${offAces.length === 1 ? 'off-suit Ace is' : `${offAces.length} off-suit Aces are`} likely ${offAces.length === 1 ? 'a trick' : 'tricks'} of ${offAces.length === 1 ? 'its' : 'their'} own on top of your trumps.`);
      if (voids.length >= 1 && trumps.length >= 2) reasons.push(`You're void in ${list(voids.map((s) => SUIT_NAME[s].toLowerCase()))}, so you can trump in early when ${voids.length === 1 ? 'it is' : 'they are'} led.`);
      if (role === 'dealer' && q.phase === 'round1') reasons.push('As dealer you also get to discard your worst card, which a count of the hand as dealt doesn\'t fully credit.');
    } else {
      // Passing in round one keeps round two open: a better suit may be waiting.
      if (q.phase === 'round1' && best.action.type === 'pass') {
        const own = cards(q.hand);
        const strength = (s: Suit) => {
          const t = own.filter((c) => isTrump(c, s));
          return t.length + t.filter((c) => isTop(c, s)).length;
        };
        const other = (['S', 'H', 'D', 'C'] as Suit[]).filter((s) => s !== suit).sort((a, b) => strength(b) - strength(a))[0]!;
        if (strength(other) > strength(suit) || strength(other) >= 4) {
          reasons.push(`Passing isn't giving up. If the ${SUIT_NAME[suit].toLowerCase()} are turned down, you may get to name ${SUIT_NAME[other].toLowerCase()} in round two, where you'd hold ${handFor(own, other)}.`);
        }
      }
      if (tops.length === 0 && trumps.length > 0) reasons.push(`Your ${name} trumps are all low (no Benny or Bower), so the opponents' top trumps can take tricks from you.`);
      if (offAces.length === 0) reasons.push('You have no off-suit Ace, so outside trumps you may win nothing.');
      if (trumps.length >= 3 && tops.length === 1) reasons.push('Only one of your trumps is a top trump, so the count flatters the hand.');
    }
  }

  if (q.history.length > 0 && q.phase !== 'bennyAlone') {
    reasons.push(
      `The calls so far are evidence. ${q.history.length === 1 ? 'One player has' : `${q.history.length} players have`} already spoken, and the simulator only deals the hidden cards in ways that fit what they did; the rule of thumb ignores what the others said.`,
    );
  }
  if (gap < 0.15) {
    reasons.push(`The difference is small (${pts(gap).replace('+', '')} points a hand), so at the table the guide's choice is a reasonable one.`);
  }
  reasons.push('The simulator\'s bots play the hand out well but not perfectly, so a small edge may partly reflect how they play.');
  return reasons;
}
