// Scoring a hand. See ../../EUCHRE_RULES.md section 8.
//
// | Outcome                                             | Points            |
// | Makers (both playing) win 3 or 4                    | 1 to makers       |
// | Makers (both playing) win all 5 (march)             | 2 to makers       |
// | Maker going alone wins 3 or 4                       | 1 to makers       |
// | Maker going alone wins all 5                        | 4 to makers       |
// | Makers win fewer than 3 (euchred)                   | 2 to defenders    |
// | A lone defender euchres the makers                  | 4 to defenders    |

import type { Contract } from './bidding.ts';
import type { Team } from './deal.ts';

export type Outcome = 'made' | 'march' | 'lonerMade' | 'lonerMarch' | 'euchre' | 'loneDefenderEuchre';

export interface HandScore {
  outcome: Outcome;
  team: Team;   // team that scores
  points: number;
}

export function scoreHand(contract: Pick<Contract, 'makerTeam' | 'makerLoner' | 'loneDefender'>, makerTricks: number): HandScore {
  if (makerTricks < 0 || makerTricks > 5) throw new Error(`scoreHand: bad trick count ${makerTricks}`);
  const makers = contract.makerTeam;
  const defenders = (1 - makers) as Team;
  const alone = contract.makerLoner !== null;

  if (makerTricks >= 3) {
    if (makerTricks === 5) {
      return alone ? { outcome: 'lonerMarch', team: makers, points: 4 } : { outcome: 'march', team: makers, points: 2 };
    }
    return { outcome: alone ? 'lonerMade' : 'made', team: makers, points: 1 };
  }
  return contract.loneDefender !== null
    ? { outcome: 'loneDefenderEuchre', team: defenders, points: 4 }
    : { outcome: 'euchre', team: defenders, points: 2 };
}

export const OUTCOME_TEXT: Record<Outcome, string> = {
  made: 'makers took 3 or 4',
  march: 'march: makers took all 5',
  lonerMade: 'loner took 3 or 4',
  lonerMarch: 'loner march: all 5 alone',
  euchre: 'euchred',
  loneDefenderEuchre: 'euchred by a lone defender',
};
