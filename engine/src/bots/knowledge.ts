// What a player can work out from what they've seen: which cards are still out,
// which trump is the highest left, and who is winning the current trick.
// Only uses the PlayView, so bots never cheat.

import {
  cardId, effectiveSuit, isTrump, plainRank, trickWinnerIndex, trumpRank, type Card, type Suit,
} from '../cards.ts';
import { newDeck } from '../deck.ts';
import { partnerOf, type Seat } from '../deal.ts';
import type { PlayView } from '../game.ts';

export interface Knowledge {
  /** Cards that might still be in another player's hand. */
  unseen: Card[];
  /** All cards played so far this hand (completed tricks and the current one). */
  played: Card[];
}

export function knowledgeOf(v: PlayView): Knowledge {
  const played = [...v.tricks.flatMap((t) => t.plays), ...v.current.plays].map((p) => p.card);
  const known = new Set<string>([...v.hand, ...played].map(cardId));
  // Cards known to be out of play.
  if (v.myDiscard) known.add(cardId(v.myDiscard));
  if (!v.dealerPickedUp) known.add(cardId(v.upcard)); // turned down, or the dealer was dropped
  const unseen = newDeck().filter((c) => !known.has(cardId(c)));
  return { unseen, played };
}

/** Highest trump rank among cards that could be in another player's hand (0 if none). */
export function highestUnseenTrump(k: Knowledge, trump: Suit): number {
  return Math.max(0, ...k.unseen.filter((c) => isTrump(c, trump)).map((c) => trumpRank(c, trump)));
}

export function unseenTrumpCount(k: Knowledge, trump: Suit): number {
  return k.unseen.filter((c) => isTrump(c, trump)).length;
}

/** Is this card the highest of its suit still in play (nobody else can beat it in that suit)? */
export function isBoss(card: Card, k: Knowledge, trump: Suit): boolean {
  const suit = effectiveSuit(card, trump);
  if (suit === trump) return trumpRank(card, trump) > highestUnseenTrump(k, trump);
  if (card.kind !== 'suited') return false;
  return !k.unseen.some((c) => c.kind === 'suited' && effectiveSuit(c, trump) === suit && plainRank(c) > plainRank(card));
}

/** Seat currently winning the trick in progress, or null if nothing has been played. */
export function currentWinner(v: PlayView): Seat | null {
  const plays = v.current.plays;
  if (plays.length === 0) return null;
  return plays[trickWinnerIndex(plays.map((p) => p.card), v.trump)]!.seat;
}

/** Would playing this card win the trick as it stands right now? */
export function wouldWinNow(v: PlayView, card: Card): boolean {
  const plays = v.current.plays.map((p) => p.card);
  if (plays.length === 0) return true;
  return trickWinnerIndex([...plays, card], v.trump) === plays.length;
}

/** Number of players still to play after me in the current trick. */
export function playersAfterMe(v: PlayView): number {
  const active = 4 - v.sittingOut.length;
  return active - v.current.plays.length - 1;
}

export function partnerIsWinning(v: PlayView): boolean {
  const w = currentWinner(v);
  return w !== null && w === partnerOf(v.seat);
}
