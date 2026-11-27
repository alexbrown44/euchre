// Builds the bidding quiz for the app's Learn mode ("Would you call?").
//
// Each question is a real bidding spot: a random deal, played by league-calibrated bots until a
// chosen player has a round-one or round-two decision. Every legal choice is then scored the way
// the Findings were: the hidden cards are redealt many times (keeping only redeals where the
// earlier players would have made the same calls), each choice is played out with Monte Carlo card
// play, and we average the net points per hand for the player's team. The same redeals are used for
// every choice, so the differences between choices are measured precisely.
//
// Score is 0-0 in a game to 10 for every question, so the score never changes the answer.
//
// Usage:
//   node experiments/quiz-bank.ts run [spots=40] [first=0] [samples=200] [worlds=16] [round2Share=0.5]
//   node experiments/quiz-bank.ts combine results/quiz-bank-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cardId, isTrump, SUITS, type Card, type Suit } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { dealHand, teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng, shuffle, type Rng } from '../src/rng.ts';
import { applyBidAction, legalBidActions, startBidding, turnedDownSuit, type BidAction, type BiddingState, type BidEvent } from '../src/bidding.ts';
import { bidView, finishHand, type Agent } from '../src/game.ts';
import { DEFAULT_PARAMS, LEAGUE_RULE_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';

const SCORE = [0, 0] as const;
const TARGET = 10;

export interface QuizOption {
  action: BidAction;
  /** Average net points per hand for the player's team. */
  mean: number;
  /** Two standard errors of (this option minus the best option), from the paired redeals. */
  margin: number;
}

export interface QuizSpot {
  id: string;
  dealer: Seat;
  seat: Seat;
  phase: 'round1' | 'round2';
  hand: string[];
  upcard: string;
  /** Calls before this player's turn. */
  history: { seat: Seat; action: BidAction }[];
  options: QuizOption[];
  /** What the guide's rules (the Medium bot) would do here. */
  guide: BidAction;
  samples: number;
}

const key = (a: BidAction): string =>
  a.type === 'pass' ? 'pass' : a.type === 'orderUp' ? `orderUp${a.alone ? '-alone' : ''}` : a.type === 'name' ? `name-${a.suit}${a.alone ? '-alone' : ''}` : a.type;

const sameAction = (a: BidAction, b: BidAction) => key(a) === key(b);

/** How many trumps the hand would hold with this suit as trumps (the dealer counts the upcard in round one). */
function trumpsFor(hand: readonly Card[], suit: Suit): number {
  return hand.filter((c) => isTrump(c, suit)).length;
}

/** Most spots are dull passes; keep the ones with something to think about, plus a few dull ones. */
function interesting(b: BiddingState, seat: Seat, rng: Rng): boolean {
  if (rng() < 0.12) return true;
  const hand = b.hands[seat]!;
  if (b.phase === 'round1') {
    const up = b.deal.upcard;
    if (up.kind !== 'suited') return false;
    const n = trumpsFor(hand, up.suit) + (seat === b.deal.dealer ? 1 : 0);
    return n >= 2;
  }
  const banned = turnedDownSuit(b);
  return SUITS.some((s) => s !== banned && trumpsFor(hand, s) >= 2);
}

/** Redeal everything the player can't see, keeping their hand and the upcard. */
function redeal(real: Deal, seat: Seat, rng: Rng): Deal {
  const known = new Set([...real.hands[seat]!, real.upcard].map(cardId));
  const rest = shuffle(newDeck().filter((c) => !known.has(cardId(c))), rng);
  const hands: Card[][] = [[], [], [], []];
  hands[seat] = [...real.hands[seat]!];
  let k = 0;
  for (const s of [0, 1, 2, 3] as Seat[]) if (s !== seat) hands[s] = rest.slice(k, (k += 5));
  return { dealer: real.dealer, hands, upcard: real.upcard, kitty: [real.upcard, ...rest.slice(k, k + 4)] };
}

/** Replay the earlier calls on a redeal; null if the bots there wouldn't have made the same calls. */
function replay(deal: Deal, history: readonly BidEvent[], bidder: Agent): BiddingState | null {
  let b = startBidding(deal);
  for (const ev of history) {
    const a = bidder.bid(bidView(b, ev.seat, SCORE, TARGET));
    if (!sameAction(a, ev.action)) return null;
    b = applyBidAction(b, a);
  }
  return b;
}

function run(spots: number, first: number, samples: number, worlds: number, round2Share: number): void {
  const out: QuizSpot[] = [];
  const rng = createRng(31_000_000 + first);
  const bidder = ruleBot(LEAGUE_RULE_PARAMS);
  const guideBot = ruleBot(DEFAULT_PARAMS);
  let seed = first * 100_000;
  const agentsFor = (seat: Seat): Agent[] =>
    ([0, 1, 2, 3] as Seat[]).map((s) => monteCarloBot({ worlds, params: s === seat ? DEFAULT_PARAMS : LEAGUE_RULE_PARAMS, seed: seed++ }));

  let made = 0;
  for (let attempt = 0; made < spots && attempt < spots * 200; attempt++) {
    const dealer = Math.floor(rng() * 4) as Seat;
    const deal = dealHand(dealer, rng);
    if (deal.upcard.kind !== 'suited') continue;
    const seat = Math.floor(rng() * 4) as Seat;
    // League bots bid until it's the chosen player's turn in the chosen round. For a round-two
    // spot, the player's own round-one turn is played by the league bot too (it must be a pass).
    const wantRound = rng() < round2Share ? 'round2' : 'round1';
    let b = startBidding(deal);
    while (b.turn !== null && (b.phase === 'round1' || b.phase === 'round2') && !(b.turn === seat && b.phase === wantRound)) {
      b = applyBidAction(b, bidder.bid(bidView(b, b.turn, SCORE, TARGET)));
    }
    if (b.turn !== seat || b.phase !== wantRound) continue;
    if (!interesting(b, seat, rng)) continue;

    const options = legalBidActions(b);
    const team = teamOf(seat);
    const sums = options.map(() => 0);
    const diffs: number[][] = options.map(() => []);
    const per: number[][] = options.map(() => []);
    let n = 0;
    for (let tries = 0; n < samples && tries < samples * 40; tries++) {
      const world = replay(redeal(deal, seat, rng), b.history, bidder);
      if (!world) continue;
      n++;
      options.forEach((a, i) => {
        const h = finishHand(applyBidAction(world, a), agentsFor(seat), SCORE, TARGET);
        const v = !h.result ? 0 : h.result.team === team ? h.result.points : -h.result.points;
        sums[i]! += v;
        per[i]!.push(v);
      });
    }
    if (n < samples / 2) continue;
    const means = sums.map((s) => s / n);
    const best = means.indexOf(Math.max(...means));
    options.forEach((_, i) => {
      for (let k = 0; k < n; k++) diffs[i]!.push(per[i]![k]! - per[best]![k]!);
    });
    const margin = (d: number[]) => {
      if (d.length === 0) return 0;
      const m = d.reduce((x, y) => x + y, 0) / d.length;
      const v = d.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, d.length - 1);
      return 2 * Math.sqrt(v / d.length);
    };
    out.push({
      id: `b${first}-${made}`,
      dealer,
      seat,
      phase: b.phase,
      hand: deal.hands[seat]!.map(cardId),
      upcard: cardId(deal.upcard),
      history: b.history.map((e) => ({ seat: e.seat, action: e.action })),
      options: options.map((action, i) => ({ action, mean: means[i]!, margin: margin(diffs[i]!) })),
      guide: guideBot.bid(bidView(b, seat, SCORE, TARGET)),
      samples: n,
    });
    made++;
    // Saved after every spot, so a long run can be stopped early without losing work.
    mkdirSync('results', { recursive: true });
    writeFileSync(`results/quiz-bank-from${first}.json`, JSON.stringify(out));
    process.stdout.write(`spot ${made}/${spots} (${n} redeals)\n`);
  }
}

function combine(files: string[]): void {
  const all: QuizSpot[] = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as QuizSpot[]);
  mkdirSync('results', { recursive: true });
  writeFileSync('results/quiz-bank-all.json', JSON.stringify(all));
  console.log(`${all.length} spots combined into results/quiz-bank-all.json`);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 40), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 200), Number(process.argv[6] ?? 16), Number(process.argv[7] ?? 0.5));

