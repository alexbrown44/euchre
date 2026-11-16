// Experiment: in round one, when should you order up (or pick it up), and when should you go alone?
//
// Method (paired comparison): deal a hand and let the bots bid in round one. When it's a player's
// turn, play the hand out three ways from that exact point: pass, order up, order up alone
// (the dealer's partner only has pass or Up and Down). Everything else is identical, so the
// difference in points is down to that one decision. Repeat for many deals and group the
// results by what the player was holding.
//
// Points are "net points" for the deciding player's team on that hand: their points minus the
// other team's. Score is 0-0 in a game to 10 (score-aware play comes later).
//
// Usage: node experiments/order-up.ts [deals=200000] [seed=1]

import { mkdirSync, writeFileSync } from 'node:fs';
import { teamOf, dealHand, partnerOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { finishHand } from '../src/game.ts';
import { ruleBot } from '../src/bots/ruleBot.ts';
import { bestAfterPickup, features, strength } from '../src/bots/evaluate.ts';
import { bidView } from '../src/game.ts';

const DEALS = Number(process.argv[2] ?? 200_000);
const SEED = Number(process.argv[3] ?? 1);
const agents = [ruleBot(), ruleBot(), ruleBot(), ruleBot()];

type Role = 'Left of dealer' | "Dealer's partner" | 'Right of dealer' | 'Dealer';
type Branch = 'pass' | 'order' | 'alone';
const BRANCH_ACTION: Record<Branch, BidAction> = {
  pass: { type: 'pass' },
  order: { type: 'orderUp', alone: false },
  alone: { type: 'orderUp', alone: true },
};

function roleOf(seat: Seat, dealer: Seat): Role {
  if (seat === dealer) return 'Dealer';
  if (seat === partnerOf(dealer)) return "Dealer's partner";
  return ((dealer + 1) % 4) === seat ? 'Left of dealer' : 'Right of dealer';
}

interface Stat { n: number; sum: Record<Branch, number>; diffSum: number; diffSq: number }
const newStat = (): Stat => ({ n: 0, sum: { pass: 0, order: 0, alone: 0 }, diffSum: 0, diffSq: 0 });
const tables = new Map<string, Map<string, Stat>>();
function add(table: string, key: string, net: Partial<Record<Branch, number>>): void {
  if (!tables.has(table)) tables.set(table, new Map());
  const t = tables.get(table)!;
  if (!t.has(key)) t.set(key, newStat());
  const s = t.get(key)!;
  s.n++;
  for (const b of Object.keys(net) as Branch[]) s.sum[b] += net[b]!;
  const best = Math.max(net.order ?? -Infinity, net.alone ?? -Infinity);
  const d = best - net.pass!;
  s.diffSum += d;
  s.diffSq += d * d;
}

function netFor(seat: Seat, state: BiddingState): number {
  const h = finishHand(state, agents, [0, 0], 10);
  if (!h.result) return 0;
  return h.result.team === teamOf(seat) ? h.result.points : -h.result.points;
}

const rng = createRng(SEED);
const started = performance.now();
let decisions = 0;

for (let i = 0; i < DEALS; i++) {
  const deal = dealHand((i % 4) as Seat, rng);
  if (deal.upcard.kind !== 'suited') continue;
  const trump = deal.upcard.suit;
  let state = startBidding(deal);

  while (state.phase === 'round1') {
    const seat = state.turn!;
    const role = roleOf(seat, deal.dealer);
    const branches: Branch[] = role === "Dealer's partner" ? ['pass', 'alone'] : ['pass', 'order', 'alone'];
    const net: Partial<Record<Branch, number>> = {};
    for (const b of branches) net[b] = netFor(seat, applyBidAction(state, BRANCH_ACTION[b]));
    decisions++;

    const hand = role === 'Dealer' ? bestAfterPickup(deal.hands[seat]!, deal.upcard, trump) : deal.hands[seat]!;
    const f = features(hand, trump);
    const s = strength(hand, trump);
    const tops = f.benny ? `${f.topTrumps} top (incl. Benny)` : `${f.topTrumps} top`;
    add('byTrumps', `${role}|${f.trumps}`, net);
    add('byTrumpsTops', `${role}|${f.trumps}|${tops}`, net);
    add('byStrength', `${role}|${Math.floor(s)}`, net);

    // Continue the real bidding with the bot's own choice, to reach the next player's decision.
    state = applyBidAction(state, agents[seat]!.bid(bidView(state, seat, [0, 0], 10)));
  }
}

const secs = (performance.now() - started) / 1000;

// ---------------------------------------------------------------------------
// Report

const ROLES: Role[] = ['Left of dealer', "Dealer's partner", 'Right of dealer', 'Dealer'];
const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);

function verdict(s: Stat, role: Role): string {
  const avg = (b: Branch) => s.sum[b] / s.n;
  const options: Branch[] = role === "Dealer's partner" ? ['pass', 'alone'] : ['pass', 'order', 'alone'];
  const best = options.reduce((a, b) => (avg(b) > avg(a) ? b : a));
  const mean = s.diffSum / s.n;
  const se = Math.sqrt(Math.max(0, s.diffSq / s.n - mean * mean) / s.n);
  const clear = Math.abs(mean) > 2 * se;
  const label = { pass: 'Pass', order: role === 'Dealer' ? 'Pick it up' : 'Order up', alone: role === "Dealer's partner" ? 'Up and Down' : 'Go alone' }[best];
  return clear ? `**${label}**` : `${label} (close)`;
}

function table(name: string, title: string, keyHeader: string[], minN: number): string {
  const rows = [...(tables.get(name) ?? new Map()).entries()]
    .filter(([, s]) => s.n >= minN)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  let out = `\n### ${title}\n`;
  for (const role of ROLES) {
    const mine = rows.filter(([k]) => k.startsWith(role + '|'));
    if (mine.length === 0) continue;
    const partnerRole = role === "Dealer's partner";
    out += `\n**${role}**\n\n| ${keyHeader.join(' | ')} | Hands | Pass | ${partnerRole ? '' : 'Order up | '}${partnerRole ? 'Up and Down' : 'Alone'} | Best |\n`;
    out += `|${keyHeader.map(() => '---').join('|')}|---:|---:|${partnerRole ? '' : '---:|'}---:|---|\n`;
    for (const [k, s] of mine) {
      const parts = k.split('|').slice(1);
      const avg = (b: Branch) => fmt(s.sum[b] / s.n);
      out += `| ${parts.join(' | ')} | ${s.n.toLocaleString()} | ${avg('pass')} | ${partnerRole ? '' : avg('order') + ' | '}${avg('alone')} | ${verdict(s, role)} |\n`;
    }
  }
  return out;
}

const report = [
  `# Experiment: ordering up in round one`,
  ``,
  `${DEALS.toLocaleString()} deals, ${decisions.toLocaleString()} decisions, seed ${SEED}, ${secs.toFixed(0)}s.`,
  `Numbers are average **net points per hand** for the deciding player's team (their points minus the opponents') if they pass, order up, or go alone. Rule bots play everything else. "(close)" means the gap is within statistical noise.`,
  ``,
  `Trump counts include the Benny and the Left Bower. For the dealer they're counted **after picking up and discarding**.`,
  table('byTrumps', 'By number of trumps', ['Trumps'], 300),
  table('byTrumpsTops', 'By number of trumps and top trumps (Benny, Right, Left)', ['Trumps', 'Top trumps'], 300),
  table('byStrength', 'By bot hand-strength score (for tuning the bots)', ['Strength'], 300),
].join('\n');

mkdirSync('results', { recursive: true });
writeFileSync('results/order-up.md', report);
console.log(report);
