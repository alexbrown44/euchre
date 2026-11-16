import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId, sameCard } from '../src/cards.ts';
import { dealFromDeck, leftOf, teamOf, type Seat } from '../src/deal.ts';
import { newDeck } from '../src/deck.ts';
import { createRng } from '../src/rng.ts';
import { bidView, playGame, playHand, randomAgent, type Agent, type BidView, type PlayView } from '../src/game.ts';
import { applyBidAction, startBidding } from '../src/bidding.ts';
import { TRICKS_PER_HAND } from '../src/play.ts';

function randomTable(seed: number): Agent[] {
  const rng = createRng(seed);
  return [0, 1, 2, 3].map((i) => randomAgent(rng, `Random ${i}`));
}

test('random games always finish with the winner on or past the target', () => {
  for (const target of [10, 15, 20]) {
    for (let g = 0; g < 200; g++) {
      const game = playGame({ agents: randomTable(g), target, rng: createRng(1000 + g) });
      assert.ok(game.score[game.winner] >= target);
      assert.ok(game.score[1 - game.winner]! < target);
    }
  }
});

test('every hand in a game is consistent: deal passes left, points add up, tricks are complete', () => {
  for (let g = 0; g < 300; g++) {
    const game = playGame({ agents: randomTable(g), target: 10, rng: createRng(g) });
    let dealer = game.firstDealer;
    let score = [0, 0];
    for (const h of game.hands) {
      assert.equal(h.dealer, dealer);
      dealer = leftOf(dealer);
      if (h.contract === null) {
        assert.equal(h.result, null, 'thrown in: no score');
        assert.deepEqual([...h.scoreAfter], score);
        continue;
      }
      const c = h.contract;
      assert.equal(h.tricks.length, TRICKS_PER_HAND);
      const activeCount = 4 - c.sittingOut.length;
      const seen = new Set<string>();
      for (const t of h.tricks) {
        assert.equal(t.plays.length, activeCount);
        for (const p of t.plays) {
          assert.ok(!c.sittingOut.includes(p.seat), 'a player sitting out never plays');
          const id = cardId(p.card);
          assert.ok(!seen.has(id), 'no card is played twice');
          seen.add(id);
        }
      }
      const makerWins = h.tricks.filter((t) => teamOf(t.winner!) === c.makerTeam).length;
      assert.equal(makerWins, h.makerTricks);
      score = [...score];
      score[h.result!.team] += h.result!.points;
      assert.deepEqual([...h.scoreAfter], score);
    }
    assert.deepEqual([...game.score], score);
  }
});

test('players never see hidden cards', () => {
  const seenBid: BidView[] = [];
  const seenPlay: PlayView[] = [];
  const rng = createRng(5);
  const spy = (inner: Agent): Agent => ({
    name: 'spy',
    bid: (v) => { seenBid.push(v); return inner.bid(v); },
    play: (v) => { seenPlay.push(v); return inner.play(v); },
  });
  const agents = [0, 1, 2, 3].map(() => spy(randomAgent(rng)));
  for (let g = 0; g < 50; g++) playGame({ agents, target: 10, rng: createRng(g) });

  for (const v of seenBid) {
    if (v.seat !== v.dealer) assert.ok(v.history.every((e) => e.action.type !== 'discard'), 'only the dealer sees the discard');
  }
  for (const v of seenPlay) {
    if (v.seat !== v.dealer) assert.equal(v.myDiscard, null);
    assert.ok(v.legal.every((c) => v.hand.some((h) => sameCard(h, c))), 'legal cards come from own hand');
  }
  assert.ok(seenBid.length > 0 && seenPlay.length > 0);
});

test('turned-up Benny: the dealer names trump without seeing their hand', () => {
  const deck = newDeck();
  [deck[20], deck[24]] = [deck[24]!, deck[20]!]; // Benny to the top of the kitty
  const deal = dealFromDeck(0 as Seat, deck);
  const view = bidView(startBidding(deal), 0, [0, 0], 10);
  assert.equal(view.phase, 'bennyCall');
  assert.deepEqual(view.hand, [], 'blind');
  const after = applyBidAction(startBidding(deal), { type: 'name', suit: 'S', alone: false });
  assert.equal(bidView(after, 0, [0, 0], 10).hand.length, 6, 'after naming, the dealer sees all six cards');
});

test('thrown-in hand: no score, deal still passes left', () => {
  const passer: Agent = {
    name: 'Passer',
    bid: (v) => (v.legal.find((a) => a.type === 'pass') ?? v.legal[0]!),
    play: (v) => v.legal[0]!,
  };
  const deck = newDeck();
  const deal = dealFromDeck(2 as Seat, deck);
  const h = playHand(deal, [passer, passer, passer, passer], [3, 4], 10);
  assert.equal(h.contract, null);
  assert.deepEqual([...h.scoreAfter], [3, 4]);
});

test('illegal moves from an agent are refused', () => {
  const cheat: Agent = { name: 'Cheat', bid: () => ({ type: 'goAlone' }), play: (v) => v.hand[0]! };
  assert.throws(() => playGame({ agents: [cheat, cheat, cheat, cheat], target: 10, rng: createRng(1) }));
});
