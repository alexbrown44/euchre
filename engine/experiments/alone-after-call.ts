// Experiment: the "after the call" decisions.
// Once trump is made, players who haven't spoken yet may go alone. When is it worth it?
//   - Defend alone against two makers
//   - Defend alone against a loner
//   - Take over your partner's lone defence
//   - Take over your partner's loner (including the dealer taking over Up and Down)
//   - Answer a lone defender (maker's partner goes alone in response)
//
// Method (paired comparison, as in order-up.ts): bots bid as normal. Whenever a player gets an
// after-call turn where going alone is allowed, the hand is played out both ways from that exact
// point: pass, or go alone. Net points = deciding team's points minus the opponents', at 0-0.
//
// Usage: node experiments/alone-after-call.ts [deals=300000] [seed=6]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dealHand, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, legalBidActions, startBidding, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand } from '../src/game.ts';
import { LEAGUE_V2_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { bestAfterPickup, features, strength } from '../src/bots/evaluate.ts';

const DEALS = Number(process.argv[2] ?? 300_000);
const SEED = Number(process.argv[3] ?? 6);
const agents = [0, 1, 2, 3].map(() => ruleBot(LEAGUE_V2_PARAMS)); // settings used for Finding 3 in STRATEGY_FINDINGS.md

type Situation =
  | 'Defend alone vs two makers'
  | 'Defend alone vs a loner'
  | "Take over partner's lone defence"
  | "Take over partner's loner"
  | 'Dealer takes over Up and Down'
  | 'Answer a lone defender';
const SITUATIONS: Situation[] = [
  'Defend alone vs two makers', 'Defend alone vs a loner', "Take over partner's lone defence",
  "Take over partner's loner", 'Dealer takes over Up and Down', 'Answer a lone defender',
];

function situationOf(s: BiddingState, seat: Seat): Situation {
  const onMakers = teamOf(seat) === teamOf(s.maker!);
  if (onMakers) {
    if (s.makerLoner === partnerOf(seat)) {
      const upAndDown = seat === s.deal.dealer && s.maker === partnerOf(s.deal.dealer) && s.dealerPicksUp;
      return upAndDown ? 'Dealer takes over Up and Down' : "Take over partner's loner";
    }
    return 'Answer a lone defender';
  }
  if (s.loneDefender === partnerOf(seat)) return "Take over partner's lone defence";
  return s.makerLoner !== null ? 'Defend alone vs a loner' : 'Defend alone vs two makers';
}

interface Stat { n: number; pass: number; alone: number; dSum: number; dSq: number; euchrePass: number; euchreAlone: number }
const newStat = (): Stat => ({ n: 0, pass: 0, alone: 0, dSum: 0, dSq: 0, euchrePass: 0, euchreAlone: 0 });
const tables = new Map<string, Map<string, Stat>>();
function add(table: string, key: string, pass: number, alone: number, euchrePass: boolean, euchreAlone: boolean): void {
  if (!tables.has(table)) tables.set(table, new Map());
  const t = tables.get(table)!;
  if (!t.has(key)) t.set(key, newStat());
  const s = t.get(key)!;
  s.n++;
  s.pass += pass;
  s.alone += alone;
  s.dSum += alone - pass;
  s.dSq += (alone - pass) ** 2;
  if (euchrePass) s.euchrePass++;
  if (euchreAlone) s.euchreAlone++;
}

function outcome(seat: Seat, state: BiddingState): { net: number; euchre: boolean } {
  const h = finishHand(state, agents, [0, 0], 10);
  if (!h.result) return { net: 0, euchre: false };
  const net = h.result.team === teamOf(seat) ? h.result.points : -h.result.points;
  return { net, euchre: h.makerTricks < 3 };
}

const rng = createRng(SEED);
const started = performance.now();
let decisions = 0;
const situationCount = new Map<Situation, number>();

for (let i = 0; i < DEALS; i++) {
  const deal = dealHand((i % 4) as Seat, rng);
  let state = startBidding(deal);
  while (state.turn !== null) {
    const seat = state.turn;
    if (state.phase === 'afterCall' && legalBidActions(state).some((a) => a.type === 'goAlone')) {
      const sit = situationOf(state, seat);
      const trump = state.trump!;
      const pass = outcome(seat, applyBidAction(state, { type: 'pass' }));
      const alone = outcome(seat, applyBidAction(state, { type: 'goAlone' }));
      // The dealer picks up the upcard when the card was ordered up, so judge their hand after picking up.
      const hand = seat === deal.dealer && state.dealerPicksUp
        ? bestAfterPickup(deal.hands[seat]!, deal.upcard, trump)
        : deal.hands[seat]!;
      const f = features(hand, trump);
      const tops = f.benny ? `${f.topTrumps} incl. Benny` : `${f.topTrumps}`;
      add('trumps', `${sit}|${f.trumps}`, pass.net, alone.net, pass.euchre, alone.euchre);
      add('trumpsTops', `${sit}|${f.trumps}|${tops}`, pass.net, alone.net, pass.euchre, alone.euchre);
      add('strength', `${sit}|${Math.min(13, Math.floor(strength(hand, trump)))}`, pass.net, alone.net, pass.euchre, alone.euchre);
      decisions++;
      situationCount.set(sit, (situationCount.get(sit) ?? 0) + 1);
    }
    state = applyBidAction(state, agents[seat]!.bid(bidView(state, seat, [0, 0], 10)));
  }
}

const secs = (performance.now() - started) / 1000;

// ---------------------------------------------------------------------------
// Report

const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
function verdict(s: Stat): string {
  const mean = s.dSum / s.n;
  const se = Math.sqrt(Math.max(0, s.dSq / s.n - mean * mean) / s.n);
  const label = mean > 0 ? 'Go alone' : 'Pass';
  return Math.abs(mean) > 2 * se ? `**${label}**` : `${label} (close)`;
}

function table(name: string, title: string, headers: string[], minN: number): string {
  const rows = [...(tables.get(name) ?? new Map()).entries()]
    .filter(([, s]) => s.n >= minN)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  let out = `\n### ${title}\n`;
  for (const sit of SITUATIONS) {
    const mine = rows.filter(([k]) => k.startsWith(sit + '|'));
    if (mine.length === 0) continue;
    const defending = sit.startsWith('Defend') || sit === "Take over partner's lone defence";
    out += `\n**${sit}**\n\n| ${headers.join(' | ')} | Hands | Pass | Alone | ${defending ? 'Euchre if pass | Euchre if alone' : 'Euchred if pass | Euchred if alone'} | Best |\n`;
    out += `|${headers.map(() => '---').join('|')}|---:|---:|---:|---:|---:|---|\n`;
    for (const [k, s] of mine) {
      out += `| ${k.split('|').slice(1).join(' | ')} | ${s.n.toLocaleString()} | ${fmt(s.pass / s.n)} | ${fmt(s.alone / s.n)} | ${pct(s.euchrePass / s.n)} | ${pct(s.euchreAlone / s.n)} | ${verdict(s)} |\n`;
    }
  }
  return out;
}

const counts = SITUATIONS.map((s) => `- ${s}: ${(situationCount.get(s) ?? 0).toLocaleString()}`).join('\n');
const report = [
  `# Experiment: going alone after the call (defending alone, taking over, answering)`,
  ``,
  `${DEALS.toLocaleString()} deals, ${decisions.toLocaleString()} decisions, seed ${SEED}, ${secs.toFixed(0)}s. Bots: league-calibrated (v2) settings.`,
  `Average **net points per hand** for the deciding player's team if they pass or go alone. "Euchre" columns show how often the makers were euchred. "(close)" = within statistical noise.`,
  `Trumps include the Benny and Left Bower. A dealer who picks up the upcard is judged on their hand after picking up and discarding.`,
  ``,
  `Decisions by situation:`,
  counts,
  table('trumps', 'By number of trumps', ['Trumps'], 300),
  table('trumpsTops', 'By trumps and top trumps (Benny, Right, Left)', ['Trumps', 'Top trumps'], 300),
  table('strength', 'By bot strength score (for tuning)', ['Strength'], 300),
].join('\n');

mkdirSync('results', { recursive: true });
writeFileSync('results/alone-after-call.md', report);
console.log(report);
