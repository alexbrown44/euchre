// Experiment: in round two, when should you name a suit, which suit, and when should you go alone?
// In particular: is "next" (same colour as the turned-down card) really better for the
// non-dealing team, and is "against colour" a mistake?
//
// Method (paired comparison, as in order-up.ts): bots bid round one. Whenever a player gets a
// turn in round two, the hand is played out from that exact point every legal way:
// pass, and each of the three suits named with or without going alone (7 playouts).
// Net points = the deciding team's points minus the opponents', at 0-0 in a game to 10.
//
// Usage: node experiments/round-two.ts [deals=150000] [seed=4]

import { mkdirSync, writeFileSync } from 'node:fs';
import { SUITS, SUIT_NAME, colourOf, sameColourSuit, type Suit } from '../src/cards.ts';
import { dealHand, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand } from '../src/game.ts';
import { LEAGUE_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { features, strength } from '../src/bots/evaluate.ts';

const DEALS = Number(process.argv[2] ?? 150_000);
const SEED = Number(process.argv[3] ?? 4);
const agents = [0, 1, 2, 3].map(() => ruleBot(LEAGUE_PARAMS)); // settings used for Finding 2 in STRATEGY_FINDINGS.md (run 2)

type Role = 'Left of dealer' | "Dealer's partner" | 'Right of dealer' | 'Dealer';
const ROLES: Role[] = ['Left of dealer', "Dealer's partner", 'Right of dealer', 'Dealer'];
function roleOf(seat: Seat, dealer: Seat): Role {
  if (seat === dealer) return 'Dealer';
  if (seat === partnerOf(dealer)) return "Dealer's partner";
  return (dealer + 1) % 4 === seat ? 'Left of dealer' : 'Right of dealer';
}

type Opt = 'pass' | 'name' | 'alone';
interface Stat { n: number; sum: Record<Opt, number>; dSum: Record<Opt, number>; dSq: Record<Opt, number> }
const newStat = (): Stat => ({
  n: 0, sum: { pass: 0, name: 0, alone: 0 }, dSum: { pass: 0, name: 0, alone: 0 }, dSq: { pass: 0, name: 0, alone: 0 },
});
const tables = new Map<string, Map<string, Stat>>();
function add(table: string, key: string, v: Record<Opt, number>): void {
  if (!tables.has(table)) tables.set(table, new Map());
  const t = tables.get(table)!;
  if (!t.has(key)) t.set(key, newStat());
  const s = t.get(key)!;
  s.n++;
  for (const o of ['pass', 'name', 'alone'] as Opt[]) {
    s.sum[o] += v[o];
    const d = v[o] - v.pass;
    s.dSum[o] += d;
    s.dSq[o] += d * d;
  }
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
  const turnedDown = deal.upcard.suit;
  let state = startBidding(deal);

  // Round one with the bots' own choices.
  while (state.phase === 'round1') state = applyBidAction(state, agents[state.turn!]!.bid(bidView(state, state.turn!, [0, 0], 10)));

  while (state.phase === 'round2') {
    const seat = state.turn!;
    const role = roleOf(seat, deal.dealer);
    const hand = deal.hands[seat]!;
    const pass = netFor(seat, applyBidAction(state, { type: 'pass' }));
    const bySuit = new Map<Suit, { name: number; alone: number }>();
    for (const suit of SUITS) {
      if (suit === turnedDown) continue;
      const name = netFor(seat, applyBidAction(state, { type: 'name', suit, alone: false }));
      const alone = netFor(seat, applyBidAction(state, { type: 'name', suit, alone: true }));
      bySuit.set(suit, { name, alone });

      const f = features(hand, suit);
      // Note: in league terms "against colour" depends on the team (see EUCHRE_RULES.md glossary):
      // non-dealing team naming the opposite colour, or dealing team naming the same colour.
      const relation = suit === sameColourSuit(turnedDown) ? 'Same colour (next)' : 'Opposite colour';
      const tops = f.benny ? `${f.topTrumps} incl. Benny` : `${f.topTrumps}`;
      add('colour', `${role}|${relation}|${f.trumps}|${tops}`, { pass, name, alone });
      add('colourTrumps', `${role}|${relation}|${f.trumps}`, { pass, name, alone });
    }
    decisions++;

    // The suit a player would most naturally pick: their strongest.
    const best = [...bySuit.keys()].reduce((a, b) => (strength(hand, b) > strength(hand, a) ? b : a));
    const bs = strength(hand, best);
    const r = bySuit.get(best)!;
    add('strength', `${role}|${Math.min(13, Math.floor(bs))}`, { pass, name: r.name, alone: r.alone });
    add('bestTrumps', `${role}|${features(hand, best).trumps}`, { pass, name: r.name, alone: r.alone });

    state = applyBidAction(state, agents[seat]!.bid(bidView(state, seat, [0, 0], 10)));
  }
}

const secs = (performance.now() - started) / 1000;

// ---------------------------------------------------------------------------
// Report

const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
function verdict(s: Stat, labels: Record<Opt, string>): string {
  const avg = (o: Opt) => s.sum[o] / s.n;
  const best = (['pass', 'name', 'alone'] as Opt[]).reduce((a, b) => (avg(b) > avg(a) ? b : a));
  if (best === 'pass') {
    // Pass is best: is it clearly better than the next best option?
    const other: Opt = avg('name') >= avg('alone') ? 'name' : 'alone';
    return clearlyDifferent(s, other) ? `**${labels.pass}**` : `${labels.pass} (close)`;
  }
  return clearlyDifferent(s, best) ? `**${labels[best]}**` : `${labels[best]} (close)`;
}
function clearlyDifferent(s: Stat, o: Opt): boolean {
  const mean = s.dSum[o] / s.n;
  const se = Math.sqrt(Math.max(0, s.dSq[o] / s.n - mean * mean) / s.n);
  return Math.abs(mean) > 2 * se;
}

function table(name: string, title: string, headers: string[], minN: number, labels: Record<Opt, string>): string {
  const rows = [...(tables.get(name) ?? new Map()).entries()]
    .filter(([, s]) => s.n >= minN)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  let out = `\n### ${title}\n`;
  for (const role of ROLES) {
    const mine = rows.filter(([k]) => k.startsWith(role + '|'));
    if (mine.length === 0) continue;
    out += `\n**${role}** (${role === 'Dealer' || role === "Dealer's partner" ? 'dealing team' : 'non-dealing team'})\n\n`;
    out += `| ${headers.join(' | ')} | Hands | Pass | ${labels.name} | ${labels.alone} | Best |\n`;
    out += `|${headers.map(() => '---').join('|')}|---:|---:|---:|---:|---|\n`;
    for (const [k, s] of mine) {
      const avg = (o: Opt) => fmt(s.sum[o] / s.n);
      out += `| ${k.split('|').slice(1).join(' | ')} | ${s.n.toLocaleString()} | ${avg('pass')} | ${avg('name')} | ${avg('alone')} | ${verdict(s, labels)} |\n`;
    }
  }
  return out;
}

/** Next vs against colour, same role, trumps and top trumps: how much better is naming than passing? */
function nextVsCross(): string {
  const t = tables.get('colour') ?? new Map();
  let out = `\n### Same colour (next) vs opposite colour, like for like\n\nGain from naming the suit (not alone) compared with passing, for hands with the same number of trumps and top trumps in that suit. Positive = naming beats passing.\nIn league terms, "against colour" is **opposite colour** for the non-dealing team and **same colour** for the dealing team.\n`;
  for (const role of ROLES) {
    out += `\n**${role}**\n\n| Trumps | Top trumps | Same colour (next) | Opposite colour | Difference (same − opposite) |\n|---|---|---:|---:|---:|\n`;
    const keys = new Set([...t.keys()].filter((k) => k.startsWith(role + '|')).map((k) => k.split('|').slice(2).join('|')));
    for (const k of [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const nx = t.get(`${role}|Same colour (next)|${k}`);
      const ac = t.get(`${role}|Opposite colour|${k}`);
      if (!nx || !ac || nx.n < 300 || ac.n < 300) continue;
      const gn = nx.dSum.name / nx.n;
      const ga = ac.dSum.name / ac.n;
      out += `| ${k.split('|').join(' | ')} | ${fmt(gn)} | ${fmt(ga)} | ${fmt(gn - ga)} |\n`;
    }
  }
  return out;
}

const L = { pass: 'Pass', name: 'Name it', alone: 'Name it alone' };
const report = [
  `# Experiment: naming trump in round two`,
  ``,
  `${DEALS.toLocaleString()} deals, ${decisions.toLocaleString()} round-two decisions, seed ${SEED}, ${secs.toFixed(0)}s.`,
  `Average **net points per hand** for the deciding player's team. Rule bots (round-one tuned) play everything else. "(close)" = within statistical noise.`,
  `Trumps include the Benny and the Left Bower for that suit. "${SUIT_NAME.S}" etc. don't matter, only colour relative to the turned-down card (${colourOf('S')}/${colourOf('H')}).`,
  table('bestTrumps', 'Naming your strongest suit, by trumps in it', ['Trumps'], 300, L),
  table('strength', 'Naming your strongest suit, by bot strength score (for tuning)', ['Strength'], 300, L),
  nextVsCross(),
  table('colourTrumps', 'Every suit you could name, by colour and trumps', ['Suit', 'Trumps'], 300, L),
].join('\n');

mkdirSync('results', { recursive: true });
writeFileSync('results/round-two.md', report);
console.log(report);
