// "Your first hand": the scripted deal is legal from start to finish, and the coach's words match
// what happens on the table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDeck } from '../../engine/src/deck.ts';
import { cardId } from '../../engine/src/cards.ts';
import { makerTricks } from '../../engine/src/play.ts';
import { scoreHand } from '../../engine/src/scoring.ts';
import { FIRST_DEAL, LESSONS, tableAt } from '../src/learn/firstHand.ts';

test('the first-hand deal uses the 25-card pack exactly once', () => {
  const dealt = [...FIRST_DEAL.hands.flat(), ...FIRST_DEAL.kitty].map(cardId).sort();
  assert.deepEqual(dealt, newDeck().map(cardId).sort());
  for (const h of FIRST_DEAL.hands) assert.equal(h.length, 5);
  assert.equal(cardId(FIRST_DEAL.kitty[0]!), cardId(FIRST_DEAL.upcard));
});

test('every step of the first hand is a legal move, and the hand ends as the coach says', () => {
  // Replaying each lesson, with all its moves made, must never throw.
  for (let i = 0; i < LESSONS.length; i++) tableAt(i, (LESSONS[i]!.before ?? []).length);
  const end = tableAt(LESSONS.length, 0);
  assert.ok(end.play, 'the hand is played');
  assert.equal(end.play.turn, null, 'all 5 tricks are played');
  assert.equal(end.play.trump, 'H');
  assert.equal(end.play.contract.maker, 0);
  assert.deepEqual(end.play.tricks.map((t) => t.winner), [1, 0, 0, 3, 0]);
  assert.equal(makerTricks(end.play), 3);
  assert.deepEqual(scoreHand(end.play.contract, 3), { outcome: 'made', team: 0, points: 1 });
});

test('you are asked to act exactly when it is your turn', () => {
  for (let i = 0; i < LESSONS.length; i++) {
    const l = LESSONS[i]!;
    if (!l.you) continue;
    const t = tableAt(i, (l.before ?? []).length);
    const turn = t.play ? t.play.turn : t.bidding.turn;
    assert.equal(turn, 0, `lesson ${i}: it should be your turn`);
  }
});
