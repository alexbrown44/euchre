// Build a win-chance table: from every score, what's each team's chance of winning the game?
// win[us][them][weDealNext] = chance that "us" wins, for a game to TARGET.
// "weDealNext" matters because the dealer's team has an edge (they get the upcard).
// Played with league-calibrated rule bots.
//
// Usage: node experiments/win-chance.ts [gamesPerScore=2000] [target=10]
// Writes results/win-chance-<target>.json, used by experiments/score-aware.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRng } from '../src/rng.ts';
import { playGame } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import type { Seat } from '../src/deal.ts';

const GAMES = Number(process.argv[2] ?? 2000);
const TARGET = Number(process.argv[3] ?? 10);
const bot = ruleBot(LEAGUE_RULE_PARAMS);
const agents = [bot, bot, bot, bot];

// "Us" is North/South (team 0). We deal next if the first dealer is seat 0 or 2.
const win: number[][][] = [];
const started = performance.now();
for (let us = 0; us < TARGET; us++) {
  win[us] = [];
  for (let them = 0; them < TARGET; them++) {
    win[us]![them] = [];
    for (const weDeal of [0, 1]) {
      let wins = 0;
      for (let g = 0; g < GAMES; g++) {
        // Alternate which seat on the dealing team deals, so seating can't bias the result.
        const firstDealer = (weDeal ? (g % 2 === 0 ? 0 : 2) : (g % 2 === 0 ? 1 : 3)) as Seat;
        const rng = createRng(1_000_000 * us + 10_000 * them + 1000 * weDeal + g);
        const game = playGame({ agents, target: TARGET, rng, firstDealer, startScore: [us, them] });
        if (game.winner === 0) wins++;
      }
      win[us]![them]![weDeal] = wins / GAMES;
    }
  }
}
const secs = (performance.now() - started) / 1000;

mkdirSync('results', { recursive: true });
writeFileSync(`results/win-chance-${TARGET}.json`, JSON.stringify({ target: TARGET, gamesPerScore: GAMES, win }, null, 2));

// Print a readable table: our win chance when we deal next.
const pct = (x: number) => `${Math.round(100 * x)}`.padStart(3);
console.log(`Win chance (%) for "us", game to ${TARGET}, ${GAMES} games per score, ${secs.toFixed(0)}s. Rows: our score. Columns: theirs.`);
for (const weDeal of [1, 0]) {
  console.log(`\n${weDeal ? 'We deal next' : 'They deal next'}:`);
  console.log('     ' + [...Array(TARGET).keys()].map((t) => String(t).padStart(3)).join(''));
  for (let us = 0; us < TARGET; us++) console.log(String(us).padStart(3) + '  ' + win[us]!.map((r) => pct(r[weDeal]!)).join(''));
}
