// Playing the five tricks of a hand.
// See ../../EUCHRE_RULES.md section 7.

import { effectiveSuit, sameCard, trickWinnerIndex, type Card, type Suit } from './cards.ts';
import { leftOf, teamOf, type Seat, type Team } from './deal.ts';
import type { Contract } from './bidding.ts';

export interface Play {
  readonly seat: Seat;
  readonly card: Card;
}

export interface Trick {
  readonly leader: Seat;
  readonly plays: readonly Play[];
  /** Set once the trick is complete. */
  readonly winner: Seat | null;
}

export interface PlayState {
  readonly contract: Contract;
  readonly dealer: Seat;
  readonly trump: Suit;
  /** Seats taking part (players sitting out are skipped). */
  readonly active: readonly Seat[];
  readonly hands: readonly (readonly Card[])[];
  readonly tricks: readonly Trick[]; // completed tricks
  readonly current: Trick;           // trick in progress
  readonly tricksWon: readonly [number, number]; // by team
  /** Whose turn it is, or null when all 5 tricks are played. */
  readonly turn: Seat | null;
}

export const TRICKS_PER_HAND = 5;

/** Next seat clockwise that is taking part in the hand. */
export function nextActive(seat: Seat, active: readonly Seat[]): Seat {
  let s = leftOf(seat);
  while (!active.includes(s)) s = leftOf(s);
  return s;
}

export function startPlay(contract: Contract, dealer: Seat): PlayState {
  const active = ([0, 1, 2, 3] as Seat[]).filter((s) => !contract.sittingOut.includes(s));
  // The player on the dealer's left leads; if they're sitting out, the next active player clockwise.
  const leader = nextActive(dealer, active);
  return {
    contract,
    dealer,
    trump: contract.trump,
    active,
    hands: contract.hands.map((h) => [...h]),
    tricks: [],
    current: { leader, plays: [], winner: null },
    tricksWon: [0, 0],
    turn: leader,
  };
}

/** The suit led in the current trick (Benny and Left Bower lead trump), or null if nothing led yet. */
export function ledSuit(state: PlayState): Suit | null {
  const first = state.current.plays[0];
  return first ? effectiveSuit(first.card, state.trump) : null;
}

/** Cards the player whose turn it is may play: follow suit if you can, otherwise anything. */
export function legalPlays(state: PlayState): Card[] {
  if (state.turn === null) return [];
  const hand = state.hands[state.turn]!;
  const led = ledSuit(state);
  if (led === null) return [...hand];
  const following = hand.filter((c) => effectiveSuit(c, state.trump) === led);
  return following.length > 0 ? following : [...hand];
}

export function isLegalPlay(state: PlayState, card: Card): boolean {
  return legalPlays(state).some((c) => sameCard(c, card));
}

export function applyPlay(state: PlayState, card: Card): PlayState {
  const seat = state.turn;
  if (seat === null) throw new Error('applyPlay: the hand is over');
  if (!isLegalPlay(state, card)) throw new Error(`applyPlay: illegal card for seat ${seat}`);

  const hand = state.hands[seat]!;
  const i = hand.findIndex((c) => sameCard(c, card));
  const hands = state.hands.map((h, idx) => (idx === seat ? [...hand.slice(0, i), ...hand.slice(i + 1)] : h));
  const plays = [...state.current.plays, { seat, card: hand[i]! }];

  if (plays.length < state.active.length) {
    return { ...state, hands, current: { ...state.current, plays }, turn: nextActive(seat, state.active) };
  }

  // Trick complete: highest trump wins, else highest card of the suit led.
  const winner = plays[trickWinnerIndex(plays.map((p) => p.card), state.trump)]!.seat;
  const done: Trick = { leader: state.current.leader, plays, winner };
  const tricks = [...state.tricks, done];
  const tricksWon: [number, number] = [...state.tricksWon] as [number, number];
  tricksWon[teamOf(winner)]++;
  const over = tricks.length === TRICKS_PER_HAND;
  return {
    ...state,
    hands,
    tricks,
    tricksWon,
    current: { leader: winner, plays: [], winner: null },
    turn: over ? null : winner, // the winner of a trick leads the next one
  };
}

export function makerTricks(state: PlayState): number {
  return state.tricksWon[state.contract.makerTeam];
}

export function isHandOver(state: PlayState): boolean {
  return state.turn === null;
}

export function teamName(team: Team): string {
  return team === 0 ? 'North/South' : 'East/West';
}
