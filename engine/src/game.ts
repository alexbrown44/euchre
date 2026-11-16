// Full hands and games, played by "agents" (bots now, people in the app later).
//
// Agents only ever see a *view*: what that player could know at the table.
// - Their own hand (and nothing during a turned-up Benny call: the dealer names trump blind).
// - The upcard, every call made, and every card played so far (a player may remember these).
// - Nobody else's hand, the face-down kitty, or the dealer's discard (only the dealer knows it).

import { type Card, type Suit } from './cards.ts';
import { chooseFirstDealer, dealHand, leftOf, type Deal, type Seat, type Team } from './deal.ts';
import {
  applyBidAction, contractOf, legalBidActions, startBidding,
  type BidAction, type BidEvent, type BidPhase, type BiddingState, type Contract,
} from './bidding.ts';
import { applyPlay, legalPlays, makerTricks, startPlay, type PlayState, type Trick } from './play.ts';
import { scoreHand, type HandScore } from './scoring.ts';
import type { Rng } from './rng.ts';

export type Score = readonly [number, number];

// ---------------------------------------------------------------------------
// Views

export interface BidView {
  seat: Seat;
  dealer: Seat;
  phase: BidPhase;
  upcard: Card;
  /** Own cards. Empty during a turned-up Benny call (the dealer names trump blind). */
  hand: Card[];
  /** Calls so far. The discard is left out for everyone but the dealer. */
  history: BidEvent[];
  /** Current state of the call, once trump is made. */
  trump: Suit | null;
  maker: Seat | null;
  makerLoner: Seat | null;
  loneDefender: Seat | null;
  legal: BidAction[];
  score: Score;
  target: number;
}

export interface PlayView {
  seat: Seat;
  dealer: Seat;
  trump: Suit;
  upcard: Card;
  maker: Seat;
  makerTeam: Team;
  makerLoner: Seat | null;
  loneDefender: Seat | null;
  sittingOut: Seat[];
  dealerPickedUp: boolean;
  /** The dealer's own discard; null for everyone else. */
  myDiscard: Card | null;
  hand: Card[];
  /** Cards played so far in this trick, in order. */
  current: Trick;
  /** Earlier tricks this hand, as the player remembers them. */
  tricks: Trick[];
  tricksWon: readonly [number, number];
  legal: Card[];
  score: Score;
  target: number;
}

export interface Agent {
  name: string;
  bid(view: BidView): BidAction;
  play(view: PlayView): Card;
}

export function bidView(state: BiddingState, seat: Seat, score: Score, target: number): BidView {
  const blind = state.phase === 'bennyCall';
  const isDealer = seat === state.deal.dealer;
  return {
    seat,
    dealer: state.deal.dealer,
    phase: state.phase,
    upcard: state.deal.upcard,
    hand: blind ? [] : [...state.hands[seat]!],
    // Only the dealer knows which card was discarded.
    history: state.history.filter((e) => isDealer || e.action.type !== 'discard'),
    trump: state.trump,
    maker: state.maker,
    makerLoner: state.makerLoner,
    loneDefender: state.loneDefender,
    legal: state.turn === seat ? legalBidActions(state) : [],
    score,
    target,
  };
}

export function playView(state: PlayState, seat: Seat, score: Score, target: number, upcard: Card): PlayView {
  const c = state.contract;
  return {
    seat,
    dealer: state.dealer,
    trump: state.trump,
    upcard,
    maker: c.maker,
    makerTeam: c.makerTeam,
    makerLoner: c.makerLoner,
    loneDefender: c.loneDefender,
    sittingOut: [...c.sittingOut],
    dealerPickedUp: c.dealerPickedUp,
    myDiscard: seat === state.dealer ? c.discard : null,
    hand: [...state.hands[seat]!],
    current: state.current,
    tricks: [...state.tricks],
    tricksWon: state.tricksWon,
    legal: state.turn === seat ? legalPlays(state) : [],
    score,
    target,
  };
}

// ---------------------------------------------------------------------------
// Playing a hand and a game

export interface HandRecord {
  dealer: Seat;
  deal: Deal;
  bidding: readonly BidEvent[];
  /** null when the hand was thrown in. */
  contract: Contract | null;
  tricks: readonly Trick[];
  makerTricks: number;
  result: HandScore | null;
  scoreAfter: Score;
}

export interface GameRecord {
  target: number;
  firstDealer: Seat;
  hands: HandRecord[];
  score: Score;
  winner: Team;
}

export function playHand(deal: Deal, agents: readonly Agent[], score: Score, target: number): HandRecord {
  let bidding = startBidding(deal);
  while (bidding.turn !== null) {
    const seat = bidding.turn;
    const action = agents[seat]!.bid(bidView(bidding, seat, score, target));
    bidding = applyBidAction(bidding, action); // throws if the agent tries something illegal
  }
  if (bidding.phase === 'thrownIn') {
    return { dealer: deal.dealer, deal, bidding: bidding.history, contract: null, tricks: [], makerTricks: 0, result: null, scoreAfter: score };
  }

  const contract = contractOf(bidding);
  let play = startPlay(contract, deal.dealer);
  while (play.turn !== null) {
    const seat = play.turn;
    const card = agents[seat]!.play(playView(play, seat, score, target, deal.upcard));
    play = applyPlay(play, card);
  }

  const taken = makerTricks(play);
  const result = scoreHand(contract, taken);
  const next: [number, number] = [score[0], score[1]];
  next[result.team] += result.points;
  return { dealer: deal.dealer, deal, bidding: bidding.history, contract, tricks: play.tricks, makerTricks: taken, result, scoreAfter: next };
}

export interface GameOptions {
  agents: readonly Agent[];
  /** Agreed winning total, e.g. 10, 15 or 20. */
  target: number;
  rng: Rng;
  firstDealer?: Seat;
  /** Safety limit, in case agents pass forever. */
  maxHands?: number;
}

export function playGame(opts: GameOptions): GameRecord {
  if (opts.agents.length !== 4) throw new Error('playGame: need 4 agents');
  const firstDealer = opts.firstDealer ?? chooseFirstDealer(opts.rng);
  const maxHands = opts.maxHands ?? 1000;
  const hands: HandRecord[] = [];
  let score: Score = [0, 0];
  let dealer = firstDealer;

  while (score[0] < opts.target && score[1] < opts.target) {
    if (hands.length >= maxHands) throw new Error(`playGame: no winner after ${maxHands} hands`);
    const record = playHand(dealHand(dealer, opts.rng), opts.agents, score, opts.target);
    hands.push(record);
    score = record.scoreAfter;
    dealer = leftOf(dealer); // the deal passes left after every hand, thrown in or not
  }
  return { target: opts.target, firstDealer, hands, score, winner: score[0] >= opts.target ? 0 : 1 };
}

// ---------------------------------------------------------------------------
// A random agent: always legal, never clever. Useful for testing the rules.

export function randomAgent(rng: Rng, name = 'Random'): Agent {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;
  return {
    name,
    bid: (v) => pick(v.legal),
    play: (v) => pick(v.legal),
  };
}
