// Experiment: does going alone more often still pay when everyone defends well?
//
// Two teams with different bidding settings play each other, but ALL card play is done by the
// Monte Carlo bot (much stronger than the rule bots' card play). If the data rule's extra loners
// only paid because rule bots defend loners badly, its edge should shrink here.
// Also records how every dealer loner ends: all 5, 3-4 tricks, or euchred.
//
// Usage: node experiments/mc-loners.ts [games=2000] [A=league-v3-shape] [B=league-rule] [worlds=20]

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRng } from '../src/rng.ts';
import { playGame, type HandRecord } from '../src/game.ts';
import { PARAM_SETS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import type { Team } from '../src/deal.ts';

const GAMES = Number(process.argv[2] ?? 2000);
const A = process.argv[3] ?? 'league-v3-shape';
const B = process.argv[4] ?? 'league-rule';
const WORLDS = Number(process.argv[5] ?? 20);
if (!PARAM_SETS[A] || !PARAM_SETS[B]) throw new Error(`Unknown settings. Choose from: ${Object.keys(PARAM_SETS).join(', ')}`);

interface Side { wins: number; contracts: number; loners: number; dealerLoners: number; march: number; made: number; euchred: number; lonerPoints: number }
const side = (): Side => ({ wins: 0, contracts: 0, loners: 0, dealerLoners: 0, march: 0, made: 0, euchred: 0, lonerPoints: 0 });
const stats: Record<'A' | 'B', Side> = { A: side(), B: side() };

function record(h: HandRecord, teamOfA: Team): void {
  const c = h.contract;
  if (!c) return;
  const who = c.makerTeam === teamOfA ? 'A' : 'B';
  const s = stats[who];
  s.contracts++;
  if (c.makerLoner === null) return;
  s.loners++;
  const dealerLoner = c.makerLoner === h.dealer && h.bidding.some((e) => e.seat === h.dealer && e.action.type === 'orderUp');
  if (!dealerLoner) return;
  s.dealerLoners++;
  if (h.makerTricks === 5) s.march++;
  else if (h.makerTricks >= 3) s.made++;
  else s.euchred++;
  s.lonerPoints += h.result!.team === c.makerTeam ? h.result!.points : -h.result!.points;
}

const started = performance.now();
for (let g = 0; g < GAMES; g++) {
  const a = monteCarloBot({ worlds: WORLDS, params: PARAM_SETS[A], seed: 2 * g });
  const b = monteCarloBot({ worlds: WORLDS, params: PARAM_SETS[B], seed: 2 * g + 1 });
  const aNS = g % 2 === 0;
  const game = playGame({ agents: aNS ? [a, b, a, b] : [b, a, b, a], target: 10, rng: createRng(90_000 + g) });
  const teamOfA: Team = aNS ? 0 : 1;
  if (game.winner === teamOfA) stats.A.wins++; else stats.B.wins++;
  for (const h of game.hands) record(h, teamOfA);
}
const secs = (performance.now() - started) / 1000;

const p = stats.A.wins / GAMES;
const se = Math.sqrt((p * (1 - p)) / GAMES);
const pc = (x: number, n: number) => (n === 0 ? '-' : `${((100 * x) / n).toFixed(0)}%`);
const line = (name: string, s: Side) =>
  `| ${name} | ${pc(s.loners, s.contracts)} | ${s.dealerLoners} | ${pc(s.march, s.dealerLoners)} | ${pc(s.made, s.dealerLoners)} | ${pc(s.euchred, s.dealerLoners)} | ${s.dealerLoners ? (s.lonerPoints / s.dealerLoners).toFixed(2) : '-'} |`;

const report = [
  `# Experiment: loners when everyone plays the cards well (Monte Carlo)`,
  ``,
  `${GAMES.toLocaleString()} games to 10, ${WORLDS} worlds per decision, ${secs.toFixed(0)}s. All card play by the Monte Carlo bot; bidding differs.`,
  ``,
  `**"${A}" bidding beat "${B}" bidding in ${(100 * p).toFixed(1)}% of games (±${(200 * se).toFixed(1)}%).**`,
  ``,
  `| Bidding | Loners (of their contracts) | Dealer loners | All 5 | 3-4 | Euchred | Avg points per dealer loner |`,
  `|---|---:|---:|---:|---:|---:|---:|`,
  line(A, stats.A),
  line(B, stats.B),
].join('\n');

mkdirSync('results', { recursive: true });
writeFileSync(`results/mc-loners-${A}-vs-${B}.md`, report);
console.log(report);
