// Hand evaluation: how good is this hand if a given suit is trump?

import {
  SUITS, effectiveSuit, isTrump, plainRank, sameCard, trumpRank, type Card, type Suit,
} from '../cards.ts';

export interface HandFeatures {
  trumps: number;      // number of trump cards
  topTrumps: number;   // Benny, Right Bower, Left Bower held
  benny: boolean;
  offAces: number;     // aces of non-trump suits
  voids: number;       // non-trump suits with no cards
}

export function features(hand: readonly Card[], trump: Suit): HandFeatures {
  const trumps = hand.filter((c) => isTrump(c, trump));
  const offSuits = SUITS.filter((s) => s !== trump);
  return {
    trumps: trumps.length,
    topTrumps: trumps.filter((c) => trumpRank(c, trump) >= 6).length,
    benny: hand.some((c) => c.kind === 'benny'),
    offAces: hand.filter((c) => c.kind === 'suited' && c.rank === 'A' && !isTrump(c, trump)).length,
    voids: offSuits.filter((s) => !hand.some((c) => effectiveSuit(c, trump) === s)).length,
  };
}

/** Points for each trump by rank: 9 1, 10 1.2, Q 1.4, K 1.7, A 2, Left 2.6, Right 3, Benny 3.4. */
const TRUMP_VALUE = [0, 1, 1.2, 1.4, 1.7, 2, 2.6, 3, 3.4];

/**
 * A rough strength score for the hand with `trump` as trump.
 * About 6 = a reasonable call with partner's help, about 9+ = strong enough to consider going alone.
 */
export function strength(hand: readonly Card[], trump: Suit): number {
  let score = 0;
  let trumpCount = 0;
  for (const c of hand) {
    if (isTrump(c, trump)) {
      score += TRUMP_VALUE[trumpRank(c, trump)]!;
      trumpCount++;
    } else if (c.kind === 'suited' && c.rank === 'A') {
      score += 1;
    } else if (c.kind === 'suited' && c.rank === 'K') {
      score += 0.3;
    }
  }
  // Voids let you trump in, but only if you have trumps to do it with.
  if (trumpCount >= 2) score += 0.5 * features(hand, trump).voids;
  return score;
}

/** Card value for throwing away / discarding: lower means less useful. */
export function keepValue(c: Card, trump: Suit): number {
  if (isTrump(c, trump)) return 100 + trumpRank(c, trump);
  return c.kind === 'suited' ? plainRank(c) * (c.rank === 'A' ? 3 : 1) : 999;
}

/**
 * Best card to discard from a 6-card hand: the least useful non-trump, preferring one that
 * leaves a void (a lone card in its suit). Aces are kept over other non-trumps; trump is
 * only discarded if every card is trump.
 */
export function chooseDiscard(hand: readonly Card[], trump: Suit): Card {
  const candidates = [...hand].sort((a, b) => discardScore(a, hand, trump) - discardScore(b, hand, trump));
  return candidates[0]!;
}

function discardScore(c: Card, hand: readonly Card[], trump: Suit): number {
  let v = keepValue(c, trump);
  if (!isTrump(c, trump)) {
    const suit = effectiveSuit(c, trump);
    const inSuit = hand.filter((x) => effectiveSuit(x, trump) === suit).length;
    if (inSuit === 1 && !(c.kind === 'suited' && c.rank === 'A')) v -= 2.5; // discarding it makes a void
  }
  return v;
}

export interface HandShape {
  trumps: number;
  /** Benny, Right Bower, Left Bower, Ace of trumps. */
  big: number;
  /** Number of non-trump suits held. */
  outsideSuits: number;
  outsideAce: boolean;
}

export function handShape(hand: readonly Card[], trump: Suit): HandShape {
  const trumps = hand.filter((c) => isTrump(c, trump));
  return {
    trumps: trumps.length,
    big: trumps.filter((c) => trumpRank(c, trump) >= 5).length,
    outsideSuits: new Set(hand.filter((c) => !isTrump(c, trump)).map((c) => effectiveSuit(c, trump))).size,
    outsideAce: hand.some((c) => !isTrump(c, trump) && c.kind === 'suited' && c.rank === 'A'),
  };
}

/**
 * Dealer go-alone rules by hand shape (after picking up and discarding). See Finding 4.
 * - 'league': the league rule of thumb, at least 3 big trumps and at most one suit outside.
 * - 'shape': what the experiment found pays against league-calibrated opponents.
 */
export function dealerShouldGoAlone(s: HandShape, rule: 'league' | 'shape'): boolean {
  if (rule === 'league') return s.big >= 3 && s.outsideSuits <= 1;
  if (s.trumps >= 5) return true;
  if (s.trumps === 4) return s.big >= 2 || (s.big >= 1 && s.outsideAce);
  if (s.trumps === 3) return s.big >= 2 && s.outsideAce;
  return false;
}

/** Holds the Benny, Right Bower and Left Bower of `trump` (still all top trumps in next). */
export function hasBennyAndBothBowers(hand: readonly Card[], trump: Suit): boolean {
  const ranks = hand.filter((c) => isTrump(c, trump)).map((c) => trumpRank(c, trump));
  return ranks.includes(8) && ranks.includes(7) && ranks.includes(6);
}

/** Hand after the dealer picks up `upcard` and makes their best discard. */
export function bestAfterPickup(hand: readonly Card[], upcard: Card, trump: Suit): Card[] {
  const six = [...hand, upcard];
  const discard = chooseDiscard(six, trump);
  return six.filter((c) => !sameCard(c, discard));
}
