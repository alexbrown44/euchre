// Head-to-head: two sets of bot settings play each other, swapping sides every game.
// Usage: node experiments/head-to-head.ts [games=20000] [target=10] [A=round2] [B=round1]
// Setting names: see PARAM_SETS in src/bots/ruleBot.ts (initial, round1, round2, ...).

import { createRng } from '../src/rng.ts';
import { playGame } from '../src/game.ts';
import { PARAM_SETS, ruleBot } from '../src/bots/ruleBot.ts';

const GAMES = Number(process.argv[2] ?? 20_000);
const TARGET = Number(process.argv[3] ?? 10);
const A = process.argv[4] ?? 'round2';
const B = process.argv[5] ?? 'round1';
if (!PARAM_SETS[A] || !PARAM_SETS[B]) throw new Error(`Unknown settings. Choose from: ${Object.keys(PARAM_SETS).join(', ')}`);
const botA = ruleBot(PARAM_SETS[A], A);
const botB = ruleBot(PARAM_SETS[B], B);

let aWins = 0;
for (let g = 0; g < GAMES; g++) {
  const aNS = g % 2 === 0; // swap sides every game so seating can't bias the result
  const agents = aNS ? [botA, botB, botA, botB] : [botB, botA, botB, botA];
  const game = playGame({ agents, target: TARGET, rng: createRng(g) });
  if ((game.winner === 0) === aNS) aWins++;
}
const p = aWins / GAMES;
const se = Math.sqrt((p * (1 - p)) / GAMES);
console.log(`"${A}" bots beat "${B}" bots in ${aWins.toLocaleString()} of ${GAMES.toLocaleString()} games to ${TARGET}: ${(100 * p).toFixed(1)}% (±${(200 * se).toFixed(1)}%)`);
