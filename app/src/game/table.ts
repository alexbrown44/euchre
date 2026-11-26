// The table: one game of Euchre from the first deal to the winning point.
//
// Everything here is pure data and pure functions, with no React and no bots inside the state.
// That keeps it ready for remote play later: a server can hold a TableState, apply each player's
// move, and send every player only their own TableView.

import { sortHand, SUIT_NAME, SUIT_SYMBOL, type Card, type Suit } from '../../../engine/src/cards.ts';
import { chooseFirstDealer, dealHand, leftOf, partnerOf, teamOf, type Seat, type Team } from '../../../engine/src/deal.ts';
import {
  applyBidAction, contractOf, legalBidActions, makerTeam, startBidding, turnedDownSuit,
  type BidAction, type BidPhase, type BiddingState, type Contract,
} from '../../../engine/src/bidding.ts';
import { applyPlay, legalPlays, makerTricks, startPlay, type Play, type PlayState, type Trick } from '../../../engine/src/play.ts';
import { scoreHand, type HandScore } from '../../../engine/src/scoring.ts';
import { bidView, playView, type Agent, type Score } from '../../../engine/src/game.ts';
import { createRng } from '../../../engine/src/rng.ts';

export type Stage = 'bidding' | 'playing' | 'trickEnd' | 'handEnd' | 'gameOver';

/** The call, without anyone's cards (the starting hands and the discard stay secret). */
export type PublicContract = Omit<Contract, 'hands' | 'discard'>;

export interface HandSummary {
  thrownIn: boolean;
  contract: PublicContract | null;
  makerTricks: number;
  result: HandScore | null;
  scoreBefore: Score;
  scoreAfter: Score;
}

export interface TableState {
  readonly seed: number;
  readonly target: number;
  readonly names: readonly string[];
  readonly score: Score;
  readonly dealer: Seat;
  readonly handNumber: number;
  readonly stage: Stage;
  readonly bidding: BiddingState;
  readonly play: PlayState | null;
  /** A completed trick still on the table (stage 'trickEnd'). */
  readonly shownTrick: Trick | null;
  /** The most recent completed trick this hand, for "last trick". */
  readonly lastTrick: Trick | null;
  readonly summary: HandSummary | null;
  /** What each seat last said during this hand's bidding. */
  readonly said: readonly (string | null)[];
  /** This hand's calls, in table language. */
  readonly log: readonly string[];
  readonly winner: Team | null;
}

export interface NewGameOptions {
  target: number;
  names: readonly string[];
  seed: number;
}

export function newGame(opts: NewGameOptions): TableState {
  const dealer = chooseFirstDealer(createRng(opts.seed));
  return startHand({ seed: opts.seed, target: opts.target, names: opts.names, score: [0, 0], winner: null }, dealer, 1);
}

function startHand(
  s: Pick<TableState, 'seed' | 'target' | 'names' | 'score' | 'winner'>,
  dealer: Seat,
  handNumber: number,
): TableState {
  const deal = dealHand(dealer, createRng(s.seed * 7919 + handNumber));
  return {
    ...s,
    dealer,
    handNumber,
    stage: 'bidding',
    bidding: startBidding(deal),
    play: null,
    shownTrick: null,
    lastTrick: null,
    summary: null,
    said: [null, null, null, null],
    log: [],
  };
}

/** Whose move it is, or null when the table is waiting (end of a trick, hand or game). */
export function turnOf(s: TableState): Seat | null {
  if (s.stage === 'bidding') return s.bidding.turn;
  if (s.stage === 'playing') return s.play!.turn;
  return null;
}

// ---------------------------------------------------------------------------
// Moves

export function applyBid(s: TableState, action: BidAction): TableState {
  if (s.stage !== 'bidding') throw new Error('applyBid: not bidding');
  const seat = s.bidding.turn!;
  const words = sayBid(s.bidding, seat, action);
  const said = s.said.map((x, i) => (i === seat ? words : x));
  const log = [...s.log, `${s.names[seat]}: ${words}`];
  let bidding = applyBidAction(s.bidding, action);
  // After trump is made, skip anyone whose only choice is to pass (for example the maker's
  // partner when nobody has gone alone): there's nothing for them to decide.
  while (bidding.phase === 'afterCall' && legalBidActions(bidding).every((a) => a.type === 'pass')) {
    bidding = applyBidAction(bidding, { type: 'pass' });
  }

  if (bidding.phase === 'thrownIn') {
    return {
      ...s, bidding, said, log, stage: 'handEnd',
      summary: { thrownIn: true, contract: null, makerTricks: 0, result: null, scoreBefore: s.score, scoreAfter: s.score },
    };
  }
  if (bidding.phase === 'done') {
    return { ...s, bidding, said, log, stage: 'playing', play: startPlay(contractOf(bidding), s.dealer) };
  }
  return { ...s, bidding, said, log };
}

export function applyCard(s: TableState, card: Card): TableState {
  if (s.stage !== 'playing') throw new Error('applyCard: not playing');
  const before = s.play!.tricks.length;
  const play = applyPlay(s.play!, card);
  if (play.tricks.length > before) {
    const trick = play.tricks[play.tricks.length - 1]!;
    return { ...s, play, stage: 'trickEnd', shownTrick: trick, lastTrick: trick };
  }
  return { ...s, play };
}

/** Clear a finished trick from the table; after the fifth, score the hand. */
export function clearTrick(s: TableState): TableState {
  if (s.stage !== 'trickEnd') return s;
  const play = s.play!;
  if (play.turn !== null) return { ...s, stage: 'playing', shownTrick: null };

  const { trump, maker, makerTeam: team, makerLoner, loneDefender, sittingOut, dealerPickedUp } = play.contract;
  const contract: PublicContract = { trump, maker, makerTeam: team, makerLoner, loneDefender, sittingOut, dealerPickedUp };
  const taken = makerTricks(play);
  const result = scoreHand(play.contract, taken);
  const score: [number, number] = [s.score[0], s.score[1]];
  score[result.team] += result.points;
  const winner: Team | null = score[0] >= s.target ? 0 : score[1] >= s.target ? 1 : null;
  return {
    ...s, score, winner, stage: 'handEnd', shownTrick: null,
    summary: { thrownIn: false, contract, makerTricks: taken, result, scoreBefore: s.score, scoreAfter: score },
  };
}

/** After the hand summary: deal the next hand, or finish the game. */
export function nextHand(s: TableState): TableState {
  if (s.stage !== 'handEnd') return s;
  if (s.winner !== null) return { ...s, stage: 'gameOver' };
  return startHand(s, leftOf(s.dealer), s.handNumber + 1); // the deal passes left, thrown in or not
}

/** Let a bot make the move for whoever's turn it is. */
export function botMove(s: TableState, agent: Agent): TableState {
  const seat = turnOf(s);
  if (seat === null) return s;
  if (s.stage === 'bidding') return applyBid(s, agent.bid(bidView(s.bidding, seat, s.score, s.target)));
  return applyCard(s, agent.play(playView(s.play!, seat, s.score, s.target, s.bidding.deal.upcard)));
}

// ---------------------------------------------------------------------------
// Table language

export function sayBid(b: BiddingState, seat: Seat, a: BidAction): string {
  const dealer = b.deal.dealer;
  switch (a.type) {
    case 'pass':
      return b.phase === 'afterCall' ? 'No' : 'Pass';
    case 'orderUp':
      if (seat === partnerOf(dealer)) return 'Up and Down!';
      if (seat === dealer) return a.alone ? 'Pick it up, alone!' : 'Pick it up';
      return a.alone ? 'Order it up, alone!' : 'Order it up';
    case 'name':
      if (b.phase === 'bennyCall') return `Benny turned up! Blind shout: ${SUIT_NAME[a.suit]} ${SUIT_SYMBOL[a.suit]}${a.alone ? ', alone!' : ''}`;
      return `${SUIT_NAME[a.suit]} ${SUIT_SYMBOL[a.suit]}${a.alone ? ', alone!' : ''}`;
    case 'goAlone': {
      const ours = teamOf(seat) === makerTeam(b);
      if (ours) return b.makerLoner === partnerOf(seat) ? 'Take over, alone!' : b.loneDefender !== null ? 'Answer, alone!' : 'Going alone!';
      return b.loneDefender === partnerOf(seat) ? 'Take over the defence!' : 'Defend alone!';
    }
    case 'discard':
      return 'Discards';
  }
}

/** Label for the human's "go alone" button after trump is made. */
export function goAloneLabel(b: BiddingState, seat: Seat): string {
  const ours = teamOf(seat) === makerTeam(b);
  if (ours) return b.makerLoner === partnerOf(seat) ? 'Take over the loner' : b.loneDefender !== null ? 'Answer: go alone' : 'Go alone (partner sits out)';
  return b.loneDefender === partnerOf(seat) ? 'Take over the lone defence' : 'Defend alone';
}

// ---------------------------------------------------------------------------
// What one player sees

export interface SeatInfo {
  seat: Seat;
  name: string;
  cards: number;
  isDealer: boolean;
  sittingOut: boolean;
  said: string | null;
  isMaker: boolean;
  alone: boolean;
}

export type UpcardState = 'up' | 'turnedDown' | 'pickedUp';

export interface TableView {
  me: Seat;
  stage: Stage;
  target: number;
  score: Score;
  handNumber: number;
  dealer: Seat;
  turn: Seat | null;
  seats: SeatInfo[];
  /** My cards, sorted. Empty while I'm the dealer naming trump blind on a turned-up Benny. */
  hand: Card[];
  handHidden: boolean;
  upcard: Card;
  upcardState: UpcardState;
  bidPhase: BidPhase | null;
  /** The suit that can't be named in round two. */
  bannedSuit: Suit | null;
  legalBids: BidAction[];
  goAloneLabel: string | null;
  legalCards: Card[];
  trump: Suit | null;
  maker: Seat | null;
  makerLoner: Seat | null;
  loneDefender: Seat | null;
  tricksWon: readonly [number, number];
  /** Cards on the table now (the trick in progress, or a finished one being shown). */
  trick: Play[];
  trickWinner: Seat | null;
  lastTrick: Trick | null;
  summary: HandSummary | null;
  /** The dealer's own discard, shown only to the dealer. */
  myDiscard: Card | null;
  log: string[];
  winner: Team | null;
}

export function tableView(s: TableState, me: Seat): TableView {
  const b = s.bidding;
  const p = s.play;
  const contract = p?.contract ?? null;
  const trump = contract?.trump ?? b.trump;
  const maker = contract?.maker ?? b.maker;
  const makerLoner = contract?.makerLoner ?? b.makerLoner;
  const loneDefender = contract?.loneDefender ?? b.loneDefender;
  const out = new Set<Seat>([makerLoner, loneDefender].filter((x): x is Seat => x !== null).map(partnerOf));

  const hands = p ? p.hands : b.hands;
  const blind = s.stage === 'bidding' && b.phase === 'bennyCall' && me === s.dealer;
  const turn = turnOf(s);

  let upcardState: UpcardState = 'up';
  if (b.phase === 'round2' || b.phase === 'thrownIn') upcardState = 'turnedDown';
  else if (b.phase === 'discard') upcardState = 'pickedUp';
  else if (b.phase === 'afterCall') upcardState = b.dealerPicksUp ? 'up' : 'turnedDown';
  else if (b.phase === 'done') upcardState = b.dealerPicksUp ? 'pickedUp' : 'turnedDown';

  const trick = s.stage === 'trickEnd' && s.shownTrick ? s.shownTrick : p?.current ?? null;

  return {
    me,
    stage: s.stage,
    target: s.target,
    score: s.score,
    handNumber: s.handNumber,
    dealer: s.dealer,
    turn,
    seats: ([0, 1, 2, 3] as Seat[]).map((seat) => ({
      seat,
      name: s.names[seat]!,
      cards: hands[seat]!.length,
      isDealer: seat === s.dealer,
      sittingOut: out.has(seat),
      said: s.said[seat] ?? null,
      isMaker: seat === maker,
      alone: seat === makerLoner || seat === loneDefender,
    })),
    hand: blind ? [] : sortHand(hands[me]!, trump),
    handHidden: blind,
    upcard: b.deal.upcard,
    upcardState,
    bidPhase: s.stage === 'bidding' ? b.phase : null,
    bannedSuit: turnedDownSuit(b),
    legalBids: s.stage === 'bidding' && turn === me ? legalBidActions(b) : [],
    goAloneLabel: s.stage === 'bidding' && b.phase === 'afterCall' && turn === me ? goAloneLabel(b, me) : null,
    legalCards: s.stage === 'playing' && turn === me ? legalPlays(p!) : [],
    trump,
    maker,
    makerLoner,
    loneDefender,
    tricksWon: p?.tricksWon ?? [0, 0],
    trick: trick ? [...trick.plays] : [],
    trickWinner: s.stage === 'trickEnd' ? s.shownTrick?.winner ?? null : null,
    lastTrick: s.lastTrick,
    summary: s.summary,
    myDiscard: me === s.dealer ? b.discard : null,
    log: [...s.log],
    winner: s.winner,
  };
}
