// Seats, choosing the first dealer, and dealing.
// See ../../EUCHRE_RULES.md sections 3 and 4.
//
// Seats are numbered 0-3 clockwise. Partners sit opposite: 0 & 2 are team 0, 1 & 3 are team 1.

import { type Card } from './cards.ts';
import { newDeck } from './deck.ts';
import { shuffle, type Rng } from './rng.ts';

export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** The next seat clockwise ("to the left"). */
export function leftOf(s: Seat): Seat {
  return ((s + 1) % 4) as Seat;
}

export function partnerOf(s: Seat): Seat {
  return ((s + 2) % 4) as Seat;
}

export function teamOf(s: Seat): Team {
  return (s % 2) as Team;
}

/** Seats in clockwise order starting from `first`. */
export function clockwiseFrom(first: Seat): Seat[] {
  return [0, 1, 2, 3].map((i) => ((first + i) % 4) as Seat);
}

export interface Deal {
  dealer: Seat;
  /** hands[seat] = that player's 5 cards, in the order received. */
  hands: Card[][];
  /** The 5 undealt cards. kitty[0] is the upcard (turned face up). */
  kitty: Card[];
  upcard: Card;
}

/**
 * Traditional deal pattern, starting with the player on the dealer's left:
 * first pass 3-2-3-2, second pass 2-3-2-3. Every player ends with 5 cards.
 */
export const DEAL_PATTERN: readonly (readonly number[])[] = [
  [3, 2, 3, 2],
  [2, 3, 2, 3],
];

/** Deal from an already-ordered deck (deck[0] is the top card). Used directly by tests. */
export function dealFromDeck(dealer: Seat, deck: readonly Card[]): Deal {
  if (deck.length !== 25) throw new Error(`dealFromDeck: expected 25 cards, got ${deck.length}`);
  const hands: Card[][] = [[], [], [], []];
  const order = clockwiseFrom(leftOf(dealer));
  let next = 0;
  for (const pass of DEAL_PATTERN) {
    order.forEach((seat, i) => {
      for (let n = 0; n < pass[i]!; n++) hands[seat]!.push(deck[next++]!);
    });
  }
  const kitty = deck.slice(next);
  return { dealer, hands, kitty, upcard: kitty[0]! };
}

/** Shuffle a fresh deck and deal. */
export function dealHand(dealer: Seat, rng: Rng): Deal {
  return dealFromDeck(dealer, shuffle(newDeck(), rng));
}

/**
 * Choose the first dealer: deal cards face up around the table, starting with
 * `startSeat`, and the first player to get a Jack (any suit) deals.
 */
export function chooseFirstDealer(rng: Rng, startSeat: Seat = 0): Seat {
  const deck = shuffle(newDeck(), rng);
  let seat = startSeat;
  for (const c of deck) {
    if (c.kind === 'suited' && c.rank === 'J') return seat;
    seat = leftOf(seat);
  }
  throw new Error('unreachable: the deck contains four Jacks');
}
