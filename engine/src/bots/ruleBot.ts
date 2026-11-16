// A rule-based bot: simple, fast, explainable strategy.
// Bidding uses a hand-strength score with thresholds; play uses common table habits
// (draw trump when you hold the boss, lead off-aces, let it go when partner is winning,
// win cheaply, throw your lowest card).
//
// The thresholds are deliberately adjustable: experiments test which values win most.

import { SUITS, isTrump, sameColourSuit, trumpRank, type Card, type Suit } from '../cards.ts';
import { leftOf, partnerOf, teamOf, type Seat } from '../deal.ts';
import type { BidAction } from '../bidding.ts';
import type { Agent, BidView, PlayView } from '../game.ts';
import { bestAfterPickup, chooseDiscard, keepValue, strength } from './evaluate.ts';
import {
  highestUnseenTrump, isBoss, knowledgeOf, partnerIsWinning, playersAfterMe, unseenTrumpCount, wouldWinNow,
} from './knowledge.ts';

export interface RuleBotParams {
  /** Round one, player on the dealer's left or right (ordering up hands the dealer the upcard). */
  orderThreshold: number;
  /** Round one, dealer's left or right: order up alone. */
  orderAloneThreshold: number;
  /** Round one, the dealer picking up (judged on the best hand after picking up and discarding). */
  dealerPickupThreshold: number;
  /** Round one, the dealer picking up alone. */
  dealerAloneThreshold: number;
  /** Round one, the dealer's partner: Up and Down is always alone. */
  upAndDownThreshold: number;
  /** Round two thresholds by seat: name a suit, and name it alone. */
  round2: Record<SeatRole, { name: number; alone: number }>;
  /**
   * Round two: strength bonus for the suit that follows the usual colour expectation,
   * i.e. "next" (same colour as the turned-down card) for the non-dealing team, and the
   * opposite colour for the dealing team. Calling the other way is "against colour".
   */
  colourBonus: number;
  /** Take over a partner's loner (not the dealer in Up and Down). Infinity = never. */
  takeOverThreshold: number;
  /** The dealer taking over Up and Down (judged with the upcard picked up). */
  dealerTakeOverThreshold: number;
  /** Defend alone against two makers (the dealer judges with the upcard picked up, if ordered up). */
  defendAloneThreshold: number;
  /** Defend alone against a loner. */
  defendAloneVsLonerThreshold: number;
  /** Take over a partner's lone defence. Infinity = never. */
  takeOverDefenceThreshold: number;
  /** Maker's partner going alone in answer to a lone defender. Infinity = never. */
  answerThreshold: number;
}

export type SeatRole = 'left' | 'dealersPartner' | 'right' | 'dealer';

export function seatRole(seat: Seat, dealer: Seat): SeatRole {
  if (seat === dealer) return 'dealer';
  if (seat === partnerOf(dealer)) return 'dealersPartner';
  return leftOf(dealer) === seat ? 'left' : 'right';
}

const sameForAllSeats = (name: number, alone: number): RuleBotParams['round2'] => ({
  left: { name, alone }, dealersPartner: { name, alone }, right: { name, alone }, dealer: { name, alone },
});

/** First guesses, before any experiments. Kept for comparison. */
export const INITIAL_PARAMS: RuleBotParams = {
  orderThreshold: 6.5,
  orderAloneThreshold: 10.5,
  dealerPickupThreshold: 6.5,
  dealerAloneThreshold: 10.5,
  upAndDownThreshold: 9.5,
  round2: sameForAllSeats(6.5, 10.5),
  colourBonus: 0,
  takeOverThreshold: 11,
  dealerTakeOverThreshold: 11,
  defendAloneThreshold: 9,
  defendAloneVsLonerThreshold: 9,
  takeOverDefenceThreshold: 10.5,
  answerThreshold: 11.5,
};

/** Round-one thresholds tuned by experiments/order-up.ts (2026-11-16). */
export const ROUND1_TUNED_PARAMS: RuleBotParams = {
  ...INITIAL_PARAMS,
  orderThreshold: 9,
  orderAloneThreshold: 9.5,
  dealerPickupThreshold: 4,
  dealerAloneThreshold: 8,
  upAndDownThreshold: 9,
};

/** Plus round-two thresholds and colour bonus tuned by experiments/round-two.ts (2026-11-16). */
export const ROUND2_TUNED_PARAMS: RuleBotParams = {
  ...ROUND1_TUNED_PARAMS,
  round2: {
    left: { name: 5, alone: 9 },
    dealersPartner: { name: 6, alone: 10 },
    right: { name: 4, alone: 10 },
    dealer: { name: 5, alone: 9 },
  },
  colourBonus: 1.5,
};

/**
 * Calibrated to league play: the dealer picks up from 5.5 instead of 4, so round two is
 * reached in roughly a third of hands, as at the Lizard Peninsula league (the player's
 * estimate: 30-35%). Head to head this costs nothing (the dealer threshold is a flat
 * region between about 4 and 6.5), and it keeps the bots' bidding closer to human play.
 */
export const LEAGUE_PARAMS: RuleBotParams = {
  ...ROUND2_TUNED_PARAMS,
  dealerPickupThreshold: 5.5,
};

/** Plus after-call decisions tuned by experiments/alone-after-call.ts (2026-11-16). */
export const AFTER_CALL_TUNED_PARAMS: RuleBotParams = {
  ...LEAGUE_PARAMS,
  defendAloneThreshold: 7,
  defendAloneVsLonerThreshold: 7.5,
  dealerTakeOverThreshold: 8,
  takeOverThreshold: Infinity,
  takeOverDefenceThreshold: Infinity,
  answerThreshold: Infinity,
};

/**
 * League-calibrated opponents, version 2: after-call tuned, but the dealer only goes alone
 * from strength 11, so makers go alone in about 1 hand in 7 (14.5%), as at the league
 * (the player's estimate). Defending alone happens in about 1 hand in 20 (4.4%) and round
 * two in about a third of hands (33.7%), also matching the league.
 * This costs about 2% of games against AFTER_CALL_TUNED_PARAMS (dealer alone from 8):
 * either league players could go alone more, or the bots defend loners poorly. Unresolved.
 * Use these as realistic opponents in experiments.
 */
export const LEAGUE_V2_PARAMS: RuleBotParams = {
  ...AFTER_CALL_TUNED_PARAMS,
  dealerAloneThreshold: 11,
};

/**
 * League-calibrated opponents, version 3: makers go alone in about 1 hand in 10 (9.6%),
 * after the player revised the league estimate to "1 in 10 or 1 in 12". Dealer alone from
 * 12, every other "alone" threshold half a point higher. Lone defence 4.5%, round two
 * 33.6% (both still matching the league). Costs ~2.5% of games against
 * AFTER_CALL_TUNED_PARAMS. Use these as realistic opponents in experiments.
 */
export const LEAGUE_V3_PARAMS: RuleBotParams = {
  ...LEAGUE_V2_PARAMS,
  dealerAloneThreshold: 12,
  orderAloneThreshold: LEAGUE_V2_PARAMS.orderAloneThreshold + 0.5,
  round2: Object.fromEntries(
    Object.entries(LEAGUE_V2_PARAMS.round2).map(([k, v]) => [k, { ...v, alone: v.alone + 0.5 }]),
  ) as RuleBotParams['round2'],
};

/** The strongest bot settings against other bots so far. */
export const DEFAULT_PARAMS: RuleBotParams = AFTER_CALL_TUNED_PARAMS;

export const PARAM_SETS: Record<string, RuleBotParams> = {
  initial: INITIAL_PARAMS,
  round1: ROUND1_TUNED_PARAMS,
  round2: ROUND2_TUNED_PARAMS,
  league: LEAGUE_PARAMS,
  'after-call': AFTER_CALL_TUNED_PARAMS,
  'league-v2': LEAGUE_V2_PARAMS,
  'league-v3': LEAGUE_V3_PARAMS,
  /** For testing the colour rule on its own: round-two tuned, but ignoring colour. */
  'round2-no-colour': { ...ROUND2_TUNED_PARAMS, colourBonus: 0 },
};

export function ruleBot(params: Partial<RuleBotParams> = {}, name = 'RuleBot'): Agent {
  const p = { ...DEFAULT_PARAMS, ...params };
  return { name, bid: (v) => bid(v, p), play: (v) => play(v) };
}

// ---------------------------------------------------------------------------
// Bidding

function has(v: BidView, action: BidAction): boolean {
  return v.legal.some((a) => JSON.stringify(a) === JSON.stringify(action));
}

function bid(v: BidView, p: RuleBotParams): BidAction {
  const pass: BidAction = { type: 'pass' };
  const isDealer = v.seat === v.dealer;
  const up = v.upcard;

  switch (v.phase) {
    case 'round1': {
      if (up.kind !== 'suited') return pass;
      const trump = up.suit;
      if (isDealer) {
        const s = strength(bestAfterPickup(v.hand, up, trump), trump);
        if (s >= p.dealerPickupThreshold) return { type: 'orderUp', alone: s >= p.dealerAloneThreshold };
        return pass;
      }
      const s = strength(v.hand, trump);
      if (v.seat === partnerOf(v.dealer)) {
        return s >= p.upAndDownThreshold ? { type: 'orderUp', alone: true } : pass;
      }
      if (s >= p.orderThreshold) return { type: 'orderUp', alone: s >= p.orderAloneThreshold };
      return pass;
    }

    case 'round2': {
      const banned = up.kind === 'suited' ? up.suit : null;
      const nonDealerTeam = teamOf(v.seat) !== teamOf(v.dealer);
      const t = p.round2[seatRole(v.seat, v.dealer)];
      let best: { suit: Suit; score: number } | null = null;
      for (const suit of SUITS) {
        if (suit === banned) continue;
        let score = strength(v.hand, suit);
        const sameColour = banned !== null && suit === sameColourSuit(banned);
        if (sameColour === nonDealerTeam) score += p.colourBonus; // follows the usual colour expectation
        if (!best || score > best.score) best = { suit, score };
      }
      if (best && best.score >= t.name) {
        return { type: 'name', suit: best.suit, alone: best.score >= t.alone };
      }
      return pass;
    }

    case 'bennyCall':
      // Blind: the dealer can't see their hand, so every suit is equally likely to be good.
      return { type: 'name', suit: 'S', alone: false };

    case 'afterCall': {
      if (!has(v, { type: 'goAlone' })) return pass;
      const trump = v.trump!;
      const orderedUp = v.history.some((e) => e.action.type === 'orderUp');
      const myHand = isDealer && orderedUp && up.kind === 'suited' ? bestAfterPickup(v.hand, up, trump) : v.hand;
      const s = strength(myHand, trump);
      const onMakers = v.maker !== null && teamOf(v.seat) === teamOf(v.maker);
      let threshold: number;
      if (onMakers) {
        const upAndDown = isDealer && orderedUp && v.maker === partnerOf(v.seat);
        if (v.makerLoner === partnerOf(v.seat)) threshold = upAndDown ? p.dealerTakeOverThreshold : p.takeOverThreshold;
        else threshold = p.answerThreshold;
      } else if (v.loneDefender === partnerOf(v.seat)) {
        threshold = p.takeOverDefenceThreshold;
      } else {
        threshold = v.makerLoner !== null ? p.defendAloneVsLonerThreshold : p.defendAloneThreshold;
      }
      return s >= threshold ? { type: 'goAlone' } : pass;
    }

    case 'discard':
      return { type: 'discard', card: chooseDiscard(v.hand, v.trump!) };

    default:
      return v.legal[0]!;
  }
}

// ---------------------------------------------------------------------------
// Play

const lowest = (cards: Card[], trump: Suit) => [...cards].sort((a, b) => keepValue(a, trump) - keepValue(b, trump))[0]!;
const highest = (cards: Card[], trump: Suit) => [...cards].sort((a, b) => keepValue(b, trump) - keepValue(a, trump))[0]!;

function play(v: PlayView): Card {
  const legal = v.legal;
  if (legal.length === 1) return legal[0]!;
  const trump = v.trump;
  const k = knowledgeOf(v);
  const onMakers = teamOf(v.seat) === v.makerTeam;
  const trumps = legal.filter((c) => isTrump(c, trump));
  const nonTrumps = legal.filter((c) => !isTrump(c, trump));

  // Leading.
  if (v.current.plays.length === 0) {
    if (onMakers && trumps.length > 0 && unseenTrumpCount(k, trump) > 0) {
      const top = highest(trumps, trump);
      // Draw trump with the boss, or when holding plenty of trump.
      if (trumpRank(top, trump) > highestUnseenTrump(k, trump) || trumps.length >= 3) return top;
    }
    const bossOff = nonTrumps.filter((c) => isBoss(c, k, trump));
    if (bossOff.length > 0) return highest(bossOff, trump);
    if (nonTrumps.length > 0) return lowest(nonTrumps, trump);
    return onMakers ? highest(trumps, trump) : lowest(trumps, trump);
  }

  // Following.
  const winners = legal.filter((c) => wouldWinNow(v, c));
  if (partnerIsWinning(v)) {
    // Let it go, unless an opponent still to play could beat partner and we can make the trick safe.
    const partnerCard = v.current.plays.find((pl) => pl.seat === partnerOf(v.seat))!.card;
    if (playersAfterMe(v) === 0 || isBoss(partnerCard, k, trump)) return lowest(nonTrumps.length > 0 ? nonTrumps : legal, trump);
    const safe = winners.filter((c) => isBoss(c, k, trump));
    return safe.length > 0 ? lowest(safe, trump) : lowest(nonTrumps.length > 0 ? nonTrumps : legal, trump);
  }
  if (winners.length > 0) {
    // Last to play: win as cheaply as possible. Otherwise win with a card that can't be beaten if we have one.
    if (playersAfterMe(v) === 0) return lowest(winners, trump);
    const safe = winners.filter((c) => isBoss(c, k, trump));
    if (safe.length > 0) return lowest(safe, trump);
    return lowest(winners, trump);
  }
  // Can't win: throw the least useful card, keeping trump if possible.
  return lowest(nonTrumps.length > 0 ? nonTrumps : legal, trump);
}
