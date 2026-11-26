// Plays whole games through the table functions with bots in every seat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botMove, clearTrick, newGame, nextHand, tableView, turnOf, type TableState } from '../src/game/table.ts';
import { makeBot, type Difficulty } from '../src/game/bots.ts';

function playOut(level: Difficulty, target: number, seed: number): TableState {
  const bots = [0, 1, 2, 3].map((i) => makeBot(level, seed * 10 + i));
  let s = newGame({ target, names: ['You', 'West', 'Partner', 'East'], seed });
  for (let steps = 0; s.stage !== 'gameOver'; steps++) {
    assert.ok(steps < 20000, 'game should finish');
    for (const me of [0, 1, 2, 3] as const) {
      const v = tableView(s, me);
      // Nobody's view shows another player's cards.
      assert.equal(JSON.stringify(v).includes('"hands"'), false);
      if (v.turn === me && s.stage === 'playing') assert.ok(v.legalCards.length > 0);
    }
    if (s.stage === 'trickEnd') s = clearTrick(s);
    else if (s.stage === 'handEnd') s = nextHand(s);
    else s = botMove(s, bots[turnOf(s)!]!);
  }
  return s;
}

for (const level of ['easy', 'medium', 'hard'] as Difficulty[]) {
  test(`a ${level} game to 10 finishes with a winner`, () => {
    const s = playOut(level, 10, 1);
    assert.ok(s.winner === 0 || s.winner === 1);
    assert.ok(s.score[s.winner!] >= 10);
  });
}

test('games to 21 finish with a winner on 21 or more', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const s = playOut('medium', 21, seed);
    assert.ok(s.score[s.winner!] >= 21);
  }
});
