// Head-to-head: tuned bots (North/South) vs initial bots (East/West), then swap seats.
// Usage: node experiments/head-to-head.ts [games=20000] [target=10]

import { createRng } from '../src/rng.ts';
import { playGame } from '../src/game.ts';
import { DEFAULT_PARAMS, INITIAL_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';

const GAMES = Number(process.argv[2] ?? 20_000);
const TARGET = Number(process.argv[3] ?? 10);
const tuned = ruleBot(DEFAULT_PARAMS, 'Tuned');
const initial = ruleBot(INITIAL_PARAMS, 'Initial');

let tunedWins = 0;
for (let g = 0; g < GAMES; g++) {
  const tunedNS = g % 2 === 0; // swap sides every game so seating can't bias the result
  const agents = tunedNS ? [tuned, initial, tuned, initial] : [initial, tuned, initial, tuned];
  const game = playGame({ agents, target: TARGET, rng: createRng(g) });
  if ((game.winner === 0) === tunedNS) tunedWins++;
}
const p = tunedWins / GAMES;
const se = Math.sqrt((p * (1 - p)) / GAMES);
console.log(`Tuned bots won ${tunedWins.toLocaleString()} of ${GAMES.toLocaleString()} games to ${TARGET}: ${(100 * p).toFixed(1)}% (±${(200 * se).toFixed(1)}%)`);
