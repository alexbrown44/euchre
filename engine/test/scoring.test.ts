import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreHand } from '../src/scoring.ts';

// Makers are team 1 (East/West) in every case; defenders are team 0.
const both = { makerTeam: 1 as const, makerLoner: null, loneDefender: null };
const loner = { makerTeam: 1 as const, makerLoner: 1 as const, loneDefender: null };
const vsLoneDefender = { makerTeam: 1 as const, makerLoner: null, loneDefender: 0 as const };
const oneOnOne = { makerTeam: 1 as const, makerLoner: 1 as const, loneDefender: 0 as const };

test('makers, both playing: 3 or 4 tricks = 1 point, all 5 = 2 points', () => {
  assert.deepEqual(scoreHand(both, 3), { outcome: 'made', team: 1, points: 1 });
  assert.deepEqual(scoreHand(both, 4), { outcome: 'made', team: 1, points: 1 });
  assert.deepEqual(scoreHand(both, 5), { outcome: 'march', team: 1, points: 2 });
});

test('maker going alone: 3 or 4 tricks = 1 point, all 5 = 4 points', () => {
  assert.deepEqual(scoreHand(loner, 3), { outcome: 'lonerMade', team: 1, points: 1 });
  assert.deepEqual(scoreHand(loner, 4), { outcome: 'lonerMade', team: 1, points: 1 });
  assert.deepEqual(scoreHand(loner, 5), { outcome: 'lonerMarch', team: 1, points: 4 });
});

test('euchre: makers take fewer than 3, defenders score 2', () => {
  for (const t of [0, 1, 2]) {
    assert.deepEqual(scoreHand(both, t), { outcome: 'euchre', team: 0, points: 2 });
    assert.deepEqual(scoreHand(loner, t), { outcome: 'euchre', team: 0, points: 2 }, 'euchring a loner with both defenders is still 2');
  }
});

test('lone defender euchres the makers: 4 points, whether the maker is alone or not', () => {
  for (const t of [0, 1, 2]) {
    assert.deepEqual(scoreHand(vsLoneDefender, t), { outcome: 'loneDefenderEuchre', team: 0, points: 4 });
    assert.deepEqual(scoreHand(oneOnOne, t), { outcome: 'loneDefenderEuchre', team: 0, points: 4 });
  }
});

test('against a lone defender, makers score as usual', () => {
  assert.equal(scoreHand(vsLoneDefender, 3).points, 1);
  assert.equal(scoreHand(vsLoneDefender, 5).points, 2);
  assert.equal(scoreHand(oneOnOne, 4).points, 1);
  assert.equal(scoreHand(oneOnOne, 5).points, 4);
});

test('bad trick counts are rejected', () => {
  assert.throws(() => scoreHand(both, 6));
  assert.throws(() => scoreHand(both, -1));
});
