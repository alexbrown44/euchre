// Cards, suits and card ranking for Lizard Peninsula Euchre League rules.
// See ../../EUCHRE_RULES.md sections 1 and 2.

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Colour = 'black' | 'red';

export type SuitedCard = { readonly kind: 'suited'; readonly suit: Suit; readonly rank: Rank };
export type Benny = { readonly kind: 'benny' };
export type Card = SuitedCard | Benny;

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
/** Ranks from lowest to highest in a plain (non-trump) suit. */
export const RANKS: readonly Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export const BENNY: Benny = Object.freeze({ kind: 'benny' });

export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME: Record<Suit, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };

export function card(rank: Rank, suit: Suit): SuitedCard {
  return { kind: 'suited', suit, rank };
}

export function isBenny(c: Card): c is Benny {
  return c.kind === 'benny';
}

export function colourOf(s: Suit): Colour {
  return s === 'S' || s === 'C' ? 'black' : 'red';
}

/** The other suit of the same colour (Spades <-> Clubs, Hearts <-> Diamonds). */
export function sameColourSuit(s: Suit): Suit {
  switch (s) {
    case 'S': return 'C';
    case 'C': return 'S';
    case 'H': return 'D';
    case 'D': return 'H';
  }
}

export function isRightBower(c: Card, trump: Suit): boolean {
  return c.kind === 'suited' && c.rank === 'J' && c.suit === trump;
}

export function isLeftBower(c: Card, trump: Suit): boolean {
  return c.kind === 'suited' && c.rank === 'J' && c.suit === sameColourSuit(trump);
}

/**
 * The suit a card belongs to for this hand.
 * - The Benny is always trump. Before trump is known (trump = null) it has no suit.
 * - The Left Bower belongs to the trump suit, not its printed suit.
 */
export function effectiveSuit(c: Card, trump: Suit | null): Suit | null {
  if (c.kind === 'benny') return trump;
  if (trump !== null && isLeftBower(c, trump)) return trump;
  return c.suit;
}

export function isTrump(c: Card, trump: Suit): boolean {
  return effectiveSuit(c, trump) === trump;
}

/**
 * Rank within the trump suit: Benny 8, Right Bower 7, Left Bower 6,
 * A 5, K 4, Q 3, 10 2, 9 1. Returns 0 for a non-trump card.
 */
export function trumpRank(c: Card, trump: Suit): number {
  if (c.kind === 'benny') return 8;
  if (isRightBower(c, trump)) return 7;
  if (isLeftBower(c, trump)) return 6;
  if (c.suit !== trump) return 0;
  switch (c.rank) {
    case 'A': return 5;
    case 'K': return 4;
    case 'Q': return 3;
    case '10': return 2;
    case '9': return 1;
    case 'J': throw new Error('unreachable: Jack of trump is the Right Bower');
  }
}

/** Rank within a plain suit: A 6, K 5, Q 4, J 3, 10 2, 9 1. */
export function plainRank(c: SuitedCard): number {
  return RANKS.indexOf(c.rank) + 1;
}

/**
 * How strong a card is in a trick. Higher wins.
 * Any trump beats any non-trump; otherwise only cards of the led suit can win.
 * Returns 0 for a card that can't win (off-suit, non-trump).
 */
export function cardPower(c: Card, trump: Suit, ledSuit: Suit): number {
  if (isTrump(c, trump)) return 100 + trumpRank(c, trump);
  if (c.kind === 'suited' && c.suit === ledSuit) return plainRank(c);
  return 0;
}

/** Index (in play order) of the card that wins the trick. The first card is the lead. */
export function trickWinnerIndex(played: readonly Card[], trump: Suit): number {
  if (played.length === 0) throw new Error('trickWinnerIndex: no cards played');
  const ledSuit = effectiveSuit(played[0]!, trump)!;
  let best = 0;
  for (let i = 1; i < played.length; i++) {
    if (cardPower(played[i]!, trump, ledSuit) > cardPower(played[best]!, trump, ledSuit)) best = i;
  }
  return best;
}

export function sameCard(a: Card, b: Card): boolean {
  if (a.kind === 'benny' || b.kind === 'benny') return a.kind === b.kind;
  return a.suit === b.suit && a.rank === b.rank;
}

/** Short id: "AS", "10H", "JD", "BENNY". */
export function cardId(c: Card): string {
  return c.kind === 'benny' ? 'BENNY' : `${c.rank}${c.suit}`;
}

/** Human label: "A♠", "10♥", "Benny". */
export function cardLabel(c: Card): string {
  return c.kind === 'benny' ? 'Benny' : `${c.rank}${SUIT_SYMBOL[c.suit]}`;
}

/** Parse "AS", "10h", "JD", "Benny". Handy for tests and scripts. */
export function parseCard(text: string): Card {
  const t = text.trim().toUpperCase();
  if (t === 'BENNY' || t === 'JOKER') return BENNY;
  const suit = t.slice(-1) as Suit;
  const rank = t.slice(0, -1) as Rank;
  if (!SUITS.includes(suit) || !RANKS.includes(rank)) throw new Error(`parseCard: bad card "${text}"`);
  return card(rank, suit);
}

export function parseCards(text: string): Card[] {
  return text.split(/[\s,]+/).filter(Boolean).map(parseCard);
}

/**
 * Sort a hand for display. With a trump suit: trumps first (highest first), then
 * other suits. Without trump: by suit, highest first, Benny at the front.
 */
export function sortHand(hand: readonly Card[], trump: Suit | null): Card[] {
  const suitOrder = (s: Suit | null): number => {
    if (s === null) return -1; // Benny before trump is known
    if (trump !== null && s === trump) return -1;
    return SUITS.indexOf(s);
  };
  const strength = (c: Card): number => {
    if (trump !== null && isTrump(c, trump)) return trumpRank(c, trump);
    return c.kind === 'benny' ? 99 : plainRank(c);
  };
  return [...hand].sort((a, b) => {
    const sa = suitOrder(effectiveSuit(a, trump));
    const sb = suitOrder(effectiveSuit(b, trump));
    if (sa !== sb) return sa - sb;
    return strength(b) - strength(a);
  });
}
