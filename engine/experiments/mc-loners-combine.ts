// Combine chunks of experiments/mc-loners.ts into one result.
// Usage: node experiments/mc-loners-combine.ts results/mc-loners-X-vs-Y-from0.json results/...-from3000.json ...

import { readFileSync } from 'node:fs';

interface Side { wins: number; contracts: number; loners: number; dealerLoners: number; march: number; made: number; euchred: number; lonerPoints: number }
interface Chunk { A: string; B: string; worlds: number; firstGame: number; games: number; stats: Record<'A' | 'B', Side> }

const chunks: Chunk[] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
if (chunks.length === 0) throw new Error('Give the chunk .json files as arguments');
const { A, B } = chunks[0]!;
if (chunks.some((c) => c.A !== A || c.B !== B)) throw new Error('Chunks compare different settings');
const starts = chunks.map((c) => c.firstGame).sort((x, y) => x - y);
if (new Set(starts).size !== starts.length) throw new Error('Two chunks used the same games');

const keys: (keyof Side)[] = ['wins', 'contracts', 'loners', 'dealerLoners', 'march', 'made', 'euchred', 'lonerPoints'];
const sum = (who: 'A' | 'B'): Side => Object.fromEntries(keys.map((k) => [k, chunks.reduce((n, c) => n + c.stats[who][k], 0)])) as unknown as Side;
const a = sum('A');
const b = sum('B');
const games = chunks.reduce((n, c) => n + c.games, 0);

const p = a.wins / games;
const se = Math.sqrt((p * (1 - p)) / games);
const pc = (x: number, n: number) => `${((100 * x) / n).toFixed(0)}%`;
const line = (name: string, s: Side) =>
  `| ${name} | ${pc(s.loners, s.contracts)} | ${s.dealerLoners.toLocaleString()} | ${pc(s.march, s.dealerLoners)} | ${pc(s.made, s.dealerLoners)} | ${pc(s.euchred, s.dealerLoners)} | ${(s.lonerPoints / s.dealerLoners).toFixed(2)} |`;

console.log([
  `# Combined: ${chunks.length} chunks, ${games.toLocaleString()} games (games ${starts.join(', ')} onwards)`,
  ``,
  `**"${A}" bidding beat "${B}" bidding in ${(100 * p).toFixed(1)}% of games (±${(200 * se).toFixed(1)}%).**`,
  ``,
  `| Bidding | Loners (of their contracts) | Dealer loners | All 5 | 3-4 | Euchred | Avg points per dealer loner |`,
  `|---|---:|---:|---:|---:|---:|---:|`,
  line(A, a),
  line(B, b),
].join('\n'));
