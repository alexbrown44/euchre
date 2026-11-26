// Bot players for each difficulty level, built from the simulator's bots.

import type { Agent } from '../../../engine/src/game.ts';
import { DEFAULT_PARAMS, INITIAL_PARAMS, ruleBot } from '../../../engine/src/bots/ruleBot.ts';
import { monteCarloBot } from '../../../engine/src/bots/monteCarlo.ts';
import { createRng } from '../../../engine/src/rng.ts';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: 'easy', label: 'Easy', blurb: 'Simple habits, and the odd slip in card play.' },
  { id: 'medium', label: 'Medium', blurb: 'Plays by the strategy guide’s rules.' },
  { id: 'hard', label: 'Hard', blurb: 'Guide rules for calling, and thinks ahead in card play.' },
];

/** Chance an Easy bot plays a random legal card instead of its chosen one. */
const EASY_SLIP = 0.2;

export function makeBot(level: Difficulty, seed: number): Agent {
  switch (level) {
    case 'easy': {
      // The first-guess settings from before any experiments, with none of the later rules.
      const base = ruleBot({
        ...INITIAL_PARAMS,
        cardPlay: 'basic',
        discardRule: 'basic',
        lonerPlay: false,
        scoreAware: false,
        seatAware: false,
        round2TrumpRule: false,
      }, 'Easy');
      const rng = createRng(seed);
      return {
        name: 'Easy',
        bid: (v) => base.bid(v),
        play: (v) => (rng() < EASY_SLIP ? v.legal[Math.floor(rng() * v.legal.length)]! : base.play(v)),
      };
    }
    case 'medium':
      return ruleBot(DEFAULT_PARAMS, 'Medium');
    case 'hard':
      return monteCarloBot({ worlds: 40, params: DEFAULT_PARAMS, seed }, 'Hard');
  }
}
