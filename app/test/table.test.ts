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

test('the maker\'s partner is never asked to confirm a pass after the call', () => {
  const bots = [0, 1, 2, 3].map((i) => makeBot('medium', i));
  for (let seed = 1; seed <= 200; seed++) {
    let s = newGame({ target: 10, names: ['You', 'West', 'Partner', 'East'], seed });
    while (s.stage === 'bidding') {
      if (s.bidding.phase === 'afterCall') {
        const v = tableView(s, turnOf(s)!);
        assert.ok(v.legalBids.some((a) => a.type === 'goAlone'), 'an after-call turn always offers a real choice');
      }
      s = botMove(s, bots[turnOf(s)!]!);
    }
  }
});

test('your cards never change, except by playing, picking up the upcard as dealer, or discarding', () => {
  const key = (c: { kind: string; rank?: string; suit?: string }) => (c.kind === 'benny' ? 'B' : `${c.rank}${c.suit}`);
  for (let seed = 1; seed <= 30; seed++) {
    const bots = [0, 1, 2, 3].map((i) => makeBot('medium', seed * 10 + i));
    let s = newGame({ target: 10, names: ['You', 'West', 'Partner', 'East'], seed });
    let hand = s.handNumber;
    let start = new Set(s.bidding.hands[0]!.map(key));
    let upcard = key(s.bidding.deal.upcard);
    for (let steps = 0; s.stage !== 'gameOver' && steps < 20000; steps++) {
      if (s.handNumber !== hand) {
        hand = s.handNumber;
        start = new Set(s.bidding.hands[0]!.map(key));
        upcard = key(s.bidding.deal.upcard);
      }
      const v = tableView(s, 0);
      for (const c of v.hand) {
        const k = key(c);
        assert.ok(start.has(k) || (s.dealer === 0 && k === upcard), `hand ${hand}: ${k} was not dealt to you`);
      }
      if (s.stage === 'trickEnd') s = clearTrick(s);
      else if (s.stage === 'handEnd') s = nextHand(s);
      else s = botMove(s, bots[turnOf(s)!]!);
    }
  }
});
