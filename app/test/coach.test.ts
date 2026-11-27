// The coach's hint is always a legal move, with a reason, on every one of your turns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId } from '../../engine/src/cards.ts';
import { applyBid, applyCard, botMove, clearTrick, newGame, nextHand, tableView, turnOf } from '../src/game/table.ts';
import { makeBot } from '../src/game/bots.ts';
import { coachHint } from '../src/learn/coach.ts';
import { actionKey } from '../src/learn/bidding.ts';

test('following the coach, every hint is legal and explained', () => {
  let hints = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const bots = [0, 1, 2, 3].map((i) => makeBot('easy', seed * 10 + i));
    let s = newGame({ target: 5, names: ['You', 'West', 'Partner', 'East'], seed });
    for (let steps = 0; s.stage !== 'gameOver'; steps++) {
      assert.ok(steps < 20000, 'game should finish');
      if (s.stage === 'trickEnd') { s = clearTrick(s); continue; }
      if (s.stage === 'handEnd') { s = nextHand(s); continue; }
      const seat = turnOf(s)!;
      const h = coachHint(s, 0);
      if (seat !== 0) {
        assert.equal(h, null, 'no hint on the others\' turns');
        s = botMove(s, bots[seat]!);
        continue;
      }
      assert.ok(h, 'a hint on your turn');
      hints++;
      assert.ok(h.what.length > 0 && h.why.length > 0 && h.why.every((w) => w.length > 0));
      const v = tableView(s, 0);
      if (s.stage === 'bidding') {
        assert.ok(h.bid, 'a call while bidding');
        assert.ok(v.legalBids.some((a) => actionKey(a) === actionKey(h.bid!)), `legal call: ${h.what}`);
        s = applyBid(s, h.bid);
      } else {
        assert.ok(h.card, 'a card while playing');
        assert.ok(v.legalCards.some((c) => cardId(c) === cardId(h.card!)), `legal card: ${h.what}`);
        s = applyCard(s, h.card);
      }
    }
  }
  assert.ok(hints > 500);
});
