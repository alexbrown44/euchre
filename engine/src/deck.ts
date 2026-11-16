// The 25-card deck: 9-A in four suits plus the Benny (Joker).

import { BENNY, RANKS, SUITS, card, type Card } from './cards.ts';

export const DECK_SIZE = 25;

export function newDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(card(rank, suit));
  deck.push(BENNY);
  return deck;
}
