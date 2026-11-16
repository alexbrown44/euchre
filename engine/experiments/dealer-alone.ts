// Experiment: when should the dealer go alone in round one?
// Tests the league rule of thumb: "at least 3 big trumps and only one suit outside,
// preferably an Ace."
//
// Method: bots bid round one. When it reaches the dealer (everyone else passed), the hand is
// played out three ways from that point: pass, pick it up, pick it up alone. Hands are grouped
// by shape AFTER picking up and discarding (the bot's discard):
//   - trumps, and "big trumps" (Benny, Right Bower, Left Bower, Ace of trumps)
//   - how many outside (non-trump) suits are held
//   - whether the outside cards include an Ace
// Net points = dealer's team points minus the opponents', at 0-0.
//
// Usage: node experiments/dealer-alone.ts [deals=600000] [seed=8]

import { mkdirSync, writeFileSync } from 'node:fs';
import { effectiveSuit, isTrump, trumpRank, type Card, type Suit } from '../src/cards.ts';
import { dealHand, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand } from '../src/game.ts';
import { LEAGUE_V3_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { bestAfterPickup } from '../src/bots/evaluate.ts';

const DEALS = Number(process.argv[2] ?? 600_000);
const SEED = Number(process.argv[3] ?? 8);
const agents = [0, 1, 2, 3].map(() => ruleBot(LEAGUE_V3_PARAMS));

type Opt = 'pass' | 'up' | 'alone';
const ACTIONS: Record<Opt, BidAction> = {
  pass: { type: 'pass' },
  up: { type: 'orderUp', alone: false },
  alone: { type: 'orderUp', alone: true },
};

interface Stat { n: number; sum: Record<Opt, number>; dSum: number; dSq: number; march: number }
const stats = new Map<string, Stat>();
function add(key: string, v: Record<Opt, number>, marchAlone: boolean): void {
  if (!stats.has(key)) stats.set(key, { n: 0, sum: { pass: 0, up: 0, alone: 0 }, dSum: 0, dSq: 0, march: 0 });
  const s = stats.get(key)!;
  s.n++;
  for (const o of ['pass', 'up', 'alone'] as Opt[]) s.sum[o] += v[o];
  s.dSum += v.alone - v.up;
  s.dSq += (v.alone - v.up) ** 2;
  if (marchAlone) s.march++;
}

function shape(hand: Card[], trump: Suit): { trumps: number; big: number; outside: number; outsideAce: boolean } {
  const trumps = hand.filter((c) => isTrump(c, trump));
  const outsideSuits = new Set(hand.filter((c) => !isTrump(c, trump)).map((c) => effectiveSuit(c, trump)));
  return {
    trumps: trumps.length,
    big: trumps.filter((c) => trumpRank(c, trump) >= 5).length, // Benny, Right, Left, Ace
    outside: outsideSuits.size,
    outsideAce: hand.some((c) => !isTrump(c, trump) && c.kind === 'suited' && c.rank === 'A'),
  };
}

function play(state: BiddingState, seat: Seat): { net: number; makerTricks: number } {
  const h = finishHand(state, agents, [0, 0], 10);
  if (!h.result) return { net: 0, makerTricks: 0 };
  return { net: h.result.team === teamOf(seat) ? h.result.points : -h.result.points, makerTricks: h.makerTricks };
}

const rng = createRng(SEED);
const started = performance.now();
let decisions = 0;

for (let i = 0; i < DEALS; i++) {
  const deal = dealHand((i % 4) as Seat, rng);
  if (deal.upcard.kind !== 'suited') continue;
  let state = startBidding(deal);
  while (state.phase === 'round1' && state.turn !== deal.dealer) {
    state = applyBidAction(state, agents[state.turn!]!.bid(bidView(state, state.turn!, [0, 0], 10)));
  }
  if (state.phase !== 'round1') continue; // someone ordered up before the dealer
  const dealer = deal.dealer;
  const v = { pass: play(applyBidAction(state, ACTIONS.pass), dealer).net, up: 0, alone: 0 };
  v.up = play(applyBidAction(state, ACTIONS.up), dealer).net;
  const aloneResult = play(applyBidAction(state, ACTIONS.alone), dealer);
  v.alone = aloneResult.net;
  const hand = bestAfterPickup(deal.hands[dealer]!, deal.upcard, deal.upcard.suit);
  const s = shape(hand, deal.upcard.suit);
  if (s.trumps < 3) continue;
  add(`${s.trumps}|${s.big}|${s.outside}|${s.outside === 0 ? '-' : s.outsideAce ? 'Ace' : 'no Ace'}`, v, aloneResult.makerTricks === 5);
  decisions++;
}

const secs = (performance.now() - started) / 1000;
const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const rows = [...stats.entries()].filter(([, s]) => s.n >= 200).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
let out = `# Experiment: when should the dealer go alone?\n\n${DEALS.toLocaleString()} deals, ${decisions.toLocaleString()} dealer decisions with 3+ trumps after picking up, seed ${SEED}, ${secs.toFixed(0)}s. Bots: league-calibrated (v3).\n\n`;
out += `Hand shape is **after picking up and discarding**. Big trumps = Benny, Right, Left, Ace of trumps. "Outside suits" = how many non-trump suits are left in hand.\n\n`;
out += `| Trumps | Big trumps | Outside suits | Outside Ace? | Hands | Pass | Pick up | Alone | Alone march | Best |\n|---:|---:|---:|---|---:|---:|---:|---:|---:|---|\n`;
for (const [k, s] of rows) {
  const [t, b, o, a] = k.split('|');
  const mean = s.dSum / s.n;
  const se = Math.sqrt(Math.max(0, s.dSq / s.n - mean * mean) / s.n);
  const best = mean > 0 ? 'Alone' : 'Pick up';
  const verdict = Math.abs(mean) > 2 * se ? `**${best}**` : `${best} (close)`;
  out += `| ${t} | ${b} | ${o} | ${a} | ${s.n.toLocaleString()} | ${fmt(s.sum.pass / s.n)} | ${fmt(s.sum.up / s.n)} | ${fmt(s.sum.alone / s.n)} | ${(100 * s.march / s.n).toFixed(0)}% | ${verdict} |\n`;
}
mkdirSync('results', { recursive: true });
writeFileSync('results/dealer-alone.md', out);
console.log(out);
