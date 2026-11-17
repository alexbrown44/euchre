// Experiment: for the SAME dealer hand, how much does going alone gain over keeping your partner?
// Card play by the Monte Carlo bot for all four players.
//
// When round one reaches the dealer and the dealer would pick up, the hand is played out twice
// from that exact point: pick up with partner, and pick up alone. Hands are split into:
//   - "Both rules go alone": the league rule (3 big trumps, one outside suit) says go alone
//   - "Only the data rule goes alone": the extra loners the data rule adds (Finding 4)
//   - "Neither rule": for comparison
// For each group: how the hands end each way, average points each way, and the GAIN from going alone.
//
// Usage: node experiments/mc-dealer-alone.ts [deals=40000] [firstDeal=0] [worlds=20]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dealHand, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand } from '../src/game.ts';
import { LEAGUE_V3_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { bestAfterPickup, dealerShouldGoAlone, handShape, strength } from '../src/bots/evaluate.ts';

const DEALS = Number(process.argv[2] ?? 40_000);
const FIRST = Number(process.argv[3] ?? 0);
const WORLDS = Number(process.argv[4] ?? 20);

type Group = 'Both rules go alone' | 'Only the data rule goes alone' | 'Neither rule (picks up)';
type Ending = 'march' | 'made' | 'euchred';
interface Stat { n: number; partner: number; alone: number; dSq: number; endP: Record<Ending, number>; endA: Record<Ending, number> }
const newStat = (): Stat => ({ n: 0, partner: 0, alone: 0, dSq: 0, endP: { march: 0, made: 0, euchred: 0 }, endA: { march: 0, made: 0, euchred: 0 } });
const stats = new Map<Group, Stat>();
const endingOf = (t: number): Ending => (t === 5 ? 'march' : t >= 3 ? 'made' : 'euchred');

function play(state: BiddingState, seat: Seat, seed: number): { net: number; tricks: number } {
  const agents = [0, 1, 2, 3].map((i) => monteCarloBot({ worlds: WORLDS, params: LEAGUE_V3_PARAMS, seed: seed * 4 + i }));
  const h = finishHand(state, agents, [0, 0], 10);
  return { net: h.result!.team === teamOf(seat) ? h.result!.points : -h.result!.points, tricks: h.makerTricks };
}

const rng = createRng(777_000 + FIRST);
const bidder = monteCarloBot({ params: LEAGUE_V3_PARAMS }); // bidding is rule-based
const started = performance.now();

for (let i = FIRST; i < FIRST + DEALS; i++) {
  const deal = dealHand((i % 4) as Seat, rng);
  if (deal.upcard.kind !== 'suited') continue;
  let state = startBidding(deal);
  while (state.phase === 'round1' && state.turn !== deal.dealer) {
    state = applyBidAction(state, bidder.bid(bidView(state, state.turn!, [0, 0], 10)));
  }
  if (state.phase !== 'round1') continue;
  const trump = deal.upcard.suit;
  const after = bestAfterPickup(deal.hands[deal.dealer]!, deal.upcard, trump);
  if (strength(after, trump) < LEAGUE_V3_PARAMS.dealerPickupThreshold) continue; // dealer would pass
  const shape = handShape(after, trump);
  const league = dealerShouldGoAlone(shape, 'league');
  const data = dealerShouldGoAlone(shape, 'shape');
  const group: Group = league ? 'Both rules go alone' : data ? 'Only the data rule goes alone' : 'Neither rule (picks up)';
  // Sample the "neither" group lightly; it's only for comparison.
  if (group === 'Neither rule (picks up)' && i % 10 !== 0) continue;

  const p = play(applyBidAction(state, { type: 'orderUp', alone: false }), deal.dealer, i);
  const a = play(applyBidAction(state, { type: 'orderUp', alone: true }), deal.dealer, i);
  if (!stats.has(group)) stats.set(group, newStat());
  const s = stats.get(group)!;
  s.n++;
  s.partner += p.net;
  s.alone += a.net;
  s.dSq += (a.net - p.net) ** 2;
  s.endP[endingOf(p.tricks)]++;
  s.endA[endingOf(a.tricks)]++;
}

const secs = (performance.now() - started) / 1000;
const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const pc = (x: number, n: number) => `${((100 * x) / n).toFixed(0)}%`;
let out = `# Experiment: going alone vs keeping partner, same dealer hand (Monte Carlo card play)\n\n`;
out += `${DEALS.toLocaleString()} deals from ${FIRST}, ${WORLDS} worlds, ${secs.toFixed(0)}s.\n\n`;
out += `| Group | Hands | With partner: all 5 / 3-4 / euchred | Alone: all 5 / 3-4 / euchred | Avg points with partner | Avg points alone | **Gain from going alone** |\n`;
out += `|---|---:|---|---|---:|---:|---:|\n`;
for (const g of ['Both rules go alone', 'Only the data rule goes alone', 'Neither rule (picks up)'] as Group[]) {
  const s = stats.get(g);
  if (!s) continue;
  const gain = (s.alone - s.partner) / s.n;
  const se = Math.sqrt(Math.max(0, s.dSq / s.n - gain * gain) / s.n);
  out += `| ${g} | ${s.n.toLocaleString()} | ${pc(s.endP.march, s.n)} / ${pc(s.endP.made, s.n)} / ${pc(s.endP.euchred, s.n)} | ${pc(s.endA.march, s.n)} / ${pc(s.endA.made, s.n)} / ${pc(s.endA.euchred, s.n)} | ${fmt(s.partner / s.n)} | ${fmt(s.alone / s.n)} | **${fmt(gain)}** (±${(2 * se).toFixed(2)}) |\n`;
}
mkdirSync('results', { recursive: true });
writeFileSync(`results/mc-dealer-alone-from${FIRST}.md`, out);
writeFileSync(`results/mc-dealer-alone-from${FIRST}.json`, JSON.stringify(Object.fromEntries(stats), null, 2));
console.log(out);
