// Monte Carlo bot: before each card it plays, it imagines many possible deals of the cards it
// can't see ("worlds"), consistent with everything it has seen. In each world it tries every
// card it could legally play and plays the rest of the hand out with rule bots. It then plays
// the card that scored best on average.
//
// It never peeks: worlds are built only from the player's own view (its hand, the cards played,
// who has shown out of a suit, and whether the dealer picked up the upcard).
//
// Bidding is delegated to the rule bot (with whatever settings are given); this bot improves
// card play, which is where the rule bots are weakest.

import { cardId, effectiveSuit, sameCard, type Card, type Suit } from '../cards.ts';
import { teamOf, type Seat } from '../deal.ts';
import type { Contract } from '../bidding.ts';
import { playView, type Agent, type PlayView } from '../game.ts';
import { applyPlay, makerTricks, type PlayState } from '../play.ts';
import { scoreHand } from '../scoring.ts';
import { createRng, shuffle, type Rng } from '../rng.ts';
import { knowledgeOf } from './knowledge.ts';
import { DEFAULT_PARAMS, ruleBot, type RuleBotParams } from './ruleBot.ts';

export interface MonteCarloOptions {
  /** Number of imagined deals per decision. More = stronger but slower. */
  worlds: number;
  /** Rule-bot settings for bidding and for playing out the imagined hands. */
  params: RuleBotParams;
  seed: number;
}

const DEFAULTS: MonteCarloOptions = { worlds: 40, params: DEFAULT_PARAMS, seed: 1 };

export function monteCarloBot(options: Partial<MonteCarloOptions> = {}, name = 'MonteCarlo'): Agent {
  const o = { ...DEFAULTS, ...options };
  const rng = createRng(o.seed);
  const base = ruleBot(o.params);
  return {
    name,
    bid: (v) => base.bid(v),
    play: (v) => chooseCard(v, o, rng, base),
  };
}

// ---------------------------------------------------------------------------
// What the player knows about hidden hands

/** Suits each seat has shown out of (failed to follow), from the tricks seen so far. */
export function knownVoids(v: PlayView): Map<Seat, Set<Suit>> {
  const voids = new Map<Seat, Set<Suit>>();
  for (const trick of [...v.tricks, v.current]) {
    const first = trick.plays[0];
    if (!first) continue;
    const led = effectiveSuit(first.card, v.trump)!;
    for (const p of trick.plays.slice(1)) {
      if (effectiveSuit(p.card, v.trump) !== led) {
        if (!voids.has(p.seat)) voids.set(p.seat, new Set());
        voids.get(p.seat)!.add(led);
      }
    }
  }
  return voids;
}

function cardsPlayedBy(v: PlayView, seat: Seat): number {
  return [...v.tricks, v.current].reduce((n, t) => n + t.plays.filter((p) => p.seat === seat).length, 0);
}

/**
 * Deal the unseen cards to the other active players at random, respecting what's known:
 * hand sizes, suits they've shown out of, and the dealer holding a picked-up upcard.
 * Returns hands indexed by seat (own hand as is, sitting-out players empty), or null if no
 * consistent deal was found (very rare).
 */
export function sampleWorld(v: PlayView, rng: Rng, tries = 50): Card[][] | null {
  const k = knowledgeOf(v);
  const voids = knownVoids(v);
  const active = ([0, 1, 2, 3] as Seat[]).filter((s) => !v.sittingOut.includes(s));
  const others = active.filter((s) => s !== v.seat);
  const canHold = (s: Seat, c: Card) => !voids.get(s)?.has(effectiveSuit(c, v.trump)!);

  // The dealer holds the upcard they picked up, unless it's been played (or they can't have it).
  const fixed = new Map<Seat, Card[]>();
  let pool = k.unseen;
  const upPlayed = k.played.some((c) => sameCard(c, v.upcard));
  if (v.dealerPickedUp && v.dealer !== v.seat && !upPlayed && others.includes(v.dealer) && canHold(v.dealer, v.upcard)) {
    fixed.set(v.dealer, [v.upcard]);
    pool = pool.filter((c) => !sameCard(c, v.upcard));
  }

  const need = new Map<Seat, number>();
  for (const s of others) need.set(s, 5 - cardsPlayedBy(v, s) - (fixed.get(s)?.length ?? 0));
  // Fill the most constrained players first.
  const order = [...others].sort((a, b) => (voids.get(b)?.size ?? 0) - (voids.get(a)?.size ?? 0));

  for (let attempt = 0; attempt < tries; attempt++) {
    let remaining = shuffle(pool, rng);
    const hands: Card[][] = [[], [], [], []];
    hands[v.seat] = [...v.hand];
    let ok = true;
    for (const s of order) {
      const n = need.get(s)!;
      const picked: Card[] = [];
      const rest: Card[] = [];
      for (const c of remaining) {
        if (picked.length < n && canHold(s, c)) picked.push(c);
        else rest.push(c);
      }
      if (picked.length < n) { ok = false; break; }
      hands[s] = [...(fixed.get(s) ?? []), ...picked];
      remaining = rest;
    }
    if (ok) return hands; // whatever is left over is in the kitty or a sitting-out hand
  }
  return null;
}

// ---------------------------------------------------------------------------
// Choosing a card

function stateForWorld(v: PlayView, hands: Card[][]): PlayState {
  const contract: Contract = {
    trump: v.trump,
    maker: v.maker,
    makerTeam: v.makerTeam,
    makerLoner: v.makerLoner,
    loneDefender: v.loneDefender,
    sittingOut: v.sittingOut,
    dealerPickedUp: v.dealerPickedUp,
    discard: null,
    hands: [],
  };
  return {
    contract,
    dealer: v.dealer,
    trump: v.trump,
    active: ([0, 1, 2, 3] as Seat[]).filter((s) => !v.sittingOut.includes(s)),
    hands,
    tricks: v.tricks,
    current: v.current,
    tricksWon: v.tricksWon,
    turn: v.seat,
  };
}

/** Play the hand out with rule bots and return net points for `seat`'s team. */
function rollout(state: PlayState, seat: Seat, policy: Agent, v: PlayView): number {
  let s = state;
  while (s.turn !== null) s = applyPlay(s, policy.play(playView(s, s.turn, v.score, v.target, v.upcard)));
  const result = scoreHand(s.contract, makerTricks(s));
  return result.team === teamOf(seat) ? result.points : -result.points;
}

function chooseCard(v: PlayView, o: MonteCarloOptions, rng: Rng, policy: Agent): Card {
  if (v.legal.length === 1) return v.legal[0]!;
  const totals = new Map<string, number>(v.legal.map((c) => [cardId(c), 0]));
  let worlds = 0;
  for (let w = 0; w < o.worlds; w++) {
    const hands = sampleWorld(v, rng);
    if (!hands) continue;
    worlds++;
    const start = stateForWorld(v, hands);
    // Same world for every candidate card, so the comparison is fair.
    for (const card of v.legal) {
      totals.set(cardId(card), totals.get(cardId(card))! + rollout(applyPlay(start, card), v.seat, policy, v));
    }
  }
  // Ties go to the rule bot's own choice.
  let best = policy.play(v);
  if (worlds === 0) return best;
  for (const c of v.legal) if (totals.get(cardId(c))! > totals.get(cardId(best))!) best = c;
  return best;
}
