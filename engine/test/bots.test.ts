import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId, parseCard, parseCards } from '../src/cards.ts';
import { createRng } from '../src/rng.ts';
import { playGame, randomAgent, type Agent } from '../src/game.ts';
import { ruleBot, scoreSituation } from '../src/bots/ruleBot.ts';
import { chooseDiscard, dealerShouldGoAlone, features, handShape, strength } from '../src/bots/evaluate.ts';

test('strength: more and higher trump scores higher', () => {
  const weak = strength(parseCards('9H 10S QS 9D 10C'), 'H');
  const medium = strength(parseCards('JH AH KH 9S 10C'), 'H');
  const strong = strength(parseCards('Benny JH JD AH KH'), 'H');
  assert.ok(weak < medium && medium < strong, `${weak} < ${medium} < ${strong}`);
});

test('features: Benny and both bowers count as top trumps; Left Bower is not an off-suit card', () => {
  const f = features(parseCards('Benny JH JD AS 9C'), 'H');
  assert.equal(f.trumps, 3);
  assert.equal(f.topTrumps, 3);
  assert.equal(f.offAces, 1);
  assert.equal(f.voids, 1, 'no diamonds once J♦ counts as a heart');
});

test('discard: throw a low singleton to make a void, keep trump and aces', () => {
  const six = parseCards('JH AH KH AS 9C 10S');
  assert.equal(cardId(chooseDiscard(six, 'H')), '9C');
  assert.equal(cardId(chooseDiscard(parseCards('JH AH 9S AS 10C KD'), 'H')), '10C', 'drop the low singleton, keep the ace');
});

test('discard (Finding 11): make a void with any lone card but an Ace; keep Aces and trumps', () => {
  assert.equal(cardId(chooseDiscard(parseCards('JH AH KH KS 9C 10C'), 'H', 10)), 'KS', 'a lone King goes, to make a void');
  assert.equal(cardId(chooseDiscard(parseCards('JH AH KH KS 9C 10C'), 'H')), '9C', 'basic rule keeps the lone King');
  assert.equal(cardId(chooseDiscard(parseCards('JH AH KH AS 9C 10C'), 'H', 10)), '9C', 'never throw the lone Ace');
  assert.equal(cardId(chooseDiscard(parseCards('JH AH KH QH 10H AS'), 'H', 10)), 'AS', '5 trumps and an Ace: a toss-up, keep the trumps');
});

test('hand shape: big trumps, outside suits and outside Ace', () => {
  const s = handShape(parseCards('Benny JH AH 9H AS'), 'H');
  assert.deepEqual(s, { trumps: 4, big: 3, outsideSuits: 1, outsideAce: true });
  const t = handShape(parseCards('JD KH 10H QS 9C'), 'H'); // J♦ is the Left Bower
  assert.deepEqual(t, { trumps: 3, big: 1, outsideSuits: 2, outsideAce: false });
});

test('dealer go-alone rules match Finding 4', () => {
  const shape = (cards: string) => handShape(parseCards(cards), 'H');
  // League rule: 3+ big trumps, at most one outside suit.
  assert.ok(dealerShouldGoAlone(shape('Benny JH JD 9S AS'), 'league'));
  assert.ok(!dealerShouldGoAlone(shape('Benny JH JD AS AC'), 'league'), 'two outside suits');
  assert.ok(!dealerShouldGoAlone(shape('Benny JH KH QH AS'), 'league'), 'only 2 big trumps');
  // Data rule: 3 trumps needs 2 big and an outside Ace; 4 trumps needs 2 big, or 1 big and an Ace.
  assert.ok(dealerShouldGoAlone(shape('JH AH 10H AS 9C'), 'shape'));
  assert.ok(!dealerShouldGoAlone(shape('Benny JH JD KS 9C'), 'shape'), '3 big trumps but no outside Ace');
  assert.ok(dealerShouldGoAlone(shape('JH KH QH 10H AS'), 'shape'));
  assert.ok(!dealerShouldGoAlone(shape('JH KH QH 10H KS'), 'shape'));
  assert.ok(dealerShouldGoAlone(shape('KH QH 10H 9H JD'), 'shape'), '5 trumps');
});

test('score situations are read from the player\'s own team', () => {
  assert.equal(scoreSituation([9, 9], 10, 0), 'bothNeed1');
  assert.equal(scoreSituation([9, 4], 10, 0), 'weNeed1');
  assert.equal(scoreSituation([9, 4], 10, 1), 'theyNeed1');
  assert.equal(scoreSituation([8, 8], 10, 2), 'weNeed2');
  assert.equal(scoreSituation([3, 5], 10, 3), 'normal');
  assert.equal(scoreSituation([14, 2], 15, 0), 'weNeed1');
});

test('score-aware bots make legal moves from every end-of-game score', () => {
  const bot = ruleBot({ scoreAware: true });
  for (let g = 0; g < 400; g++) {
    const startScore: [number, number] = [5 + (g % 5), 5 + (Math.floor(g / 5) % 5)];
    const game = playGame({ agents: [bot, bot, bot, bot], target: 10, rng: createRng(g), startScore });
    assert.ok(game.score[game.winner] >= 10);
  }
});

test('score-aware: at 9-9 the dealer always picks up and nobody goes alone', () => {
  const bot = ruleBot({ scoreAware: true });
  for (let g = 0; g < 300; g++) {
    const game = playGame({ agents: [bot, bot, bot, bot], target: 10, rng: createRng(g), startScore: [9, 9] });
    const h = game.hands[0]!;
    if (h.deal.upcard.kind !== 'suited') continue;
    const dealerTurn = h.bidding.find((e) => e.seat === h.dealer && e.phase === 'round1');
    if (dealerTurn) assert.equal(dealerTurn.action.type, 'orderUp');
    // Only Up and Down (the dealer's partner ordering up) can create a loner at 9-9.
    if (h.contract?.makerLoner != null) {
      const call = h.bidding.find((e) => e.action.type === 'orderUp' || e.action.type === 'name')!;
      assert.equal(call.seat, (h.dealer + 2) % 4);
    }
    assert.equal(h.contract?.loneDefender ?? null, null);
  }
});

test('seat-aware: Benny + both bowers passes on the dealer\'s left, goes alone on the right', () => {
  const bot = ruleBot({ seatAware: true });
  const hand = parseCards('Benny JH JD 9S 10C');
  const view = (seat: 1 | 3) => ({
    seat, dealer: 0 as const, phase: 'round1' as const, upcard: parseCard('KH'), hand,
    history: [], trump: null, maker: null, makerLoner: null, loneDefender: null,
    legal: [{ type: 'pass' as const }, { type: 'orderUp' as const, alone: false }, { type: 'orderUp' as const, alone: true }],
    score: [0, 0] as const, target: 10,
  });
  assert.deepEqual(bot.bid(view(1)), { type: 'pass' }, 'West is on the dealer\'s left');
  assert.deepEqual(bot.bid(view(3)), { type: 'orderUp', alone: true }, 'East is on the dealer\'s right');
  const four = parseCards('JH AH KH 9H 10C');
  assert.deepEqual(bot.bid({ ...view(1), hand: four }), { type: 'orderUp', alone: true });
  assert.deepEqual(bot.bid({ ...view(3), hand: four }), ruleBot().bid({ ...view(3), hand: four }), 'right of dealer: as normal');
});

test('round-two rule (Finding 10): left of dealer names next with 3 trumps, or 2 and an off-suit Ace', () => {
  const bot = ruleBot({ round2TrumpRule: true });
  const view = (hand: string) => ({
    seat: 1 as const, dealer: 0 as const, phase: 'round2' as const, upcard: parseCard('9D'), hand: parseCards(hand),
    history: [], trump: null, maker: null, makerLoner: null, loneDefender: null,
    legal: [{ type: 'pass' as const }, ...(['S', 'H', 'C'] as const).flatMap((suit) => [false, true].map((alone) => ({ type: 'name' as const, suit, alone })))],
    score: [0, 0] as const, target: 10,
  });
  assert.deepEqual(bot.bid(view('JH AH 9S 10C QC')), { type: 'pass' }, '2 trumps in next, no off-suit Ace');
  assert.deepEqual(bot.bid(view('JH 10H AS 10C QC')), { type: 'name', suit: 'H', alone: false }, '2 trumps in next and an off-suit Ace');
  assert.deepEqual(bot.bid(view('JH KH 10H 10C QC')), { type: 'name', suit: 'H', alone: false }, '3 trumps in next');
});

test('seat-aware score-aware bots make legal moves over many games', () => {
  const bot = ruleBot({ seatAware: true, scoreAware: true });
  for (let g = 0; g < 300; g++) assert.ok(playGame({ agents: [bot, bot, bot, bot], target: 10, rng: createRng(g) }).hands.length > 0);
});

test('Finding 8 card play: makers open with a low trump without the top trump, draw with it', () => {
  const bot = ruleBot({ cardPlay: 'finding8', finding8Rules: { lead: true, takeIt: true, weakLow: true } });
  const base = {
    seat: 1 as const, dealer: 0 as const, trump: 'H' as const, upcard: parseCard('9C'), maker: 1 as const, makerTeam: 1 as const,
    makerLoner: null, loneDefender: null, sittingOut: [], dealerPickedUp: false, myDiscard: null,
    current: { leader: 1 as const, plays: [], winner: null }, tricks: [], tricksWon: [0, 0] as const, score: [0, 0] as const, target: 10,
  };
  const noTop = parseCards('AH 10H AS KC QD');
  assert.equal(cardId(bot.play({ ...base, hand: noTop, legal: noTop })), '10H', 'gone fishing, not the off-suit Ace');
  const withTop = parseCards('Benny 10H AS KC QD');
  assert.equal(cardId(bot.play({ ...base, hand: withTop, legal: withTop })), 'BENNY', 'draw with the top trump');
});

test('loner play (Finding 13): the loner draws; makers lead off-suit against a lone defender', () => {
  const bot = ruleBot({ lonerPlay: true });
  const base = {
    seat: 1 as const, dealer: 0 as const, trump: 'H' as const, upcard: parseCard('9C'), maker: 1 as const, makerTeam: 1 as const,
    sittingOut: [], dealerPickedUp: false, myDiscard: null,
    current: { leader: 1 as const, plays: [], winner: null }, tricks: [], tricksWon: [0, 0] as const, score: [0, 0] as const, target: 10,
  };
  const hand = parseCards('AH 10H AS KC QD');
  const lonerView = { ...base, makerLoner: 1 as const, loneDefender: null, sittingOut: [3 as const], hand, legal: hand };
  assert.equal(cardId(bot.play(lonerView)), 'AH', 'loner draws without the top trump');
  const vsLoneDef = { ...base, makerLoner: null, loneDefender: 0 as const, sittingOut: [2 as const], hand, legal: hand };
  assert.equal(cardId(bot.play(vsLoneDef)), 'AS', 'off-suit Ace first against a lone defender');
});

test('Finding 8 card play: bots make legal moves over many games and beat random players', () => {
  const bot = ruleBot({ cardPlay: 'finding8' });
  let wins = 0;
  for (let g = 0; g < 300; g++) {
    const rng = createRng(80_000 + g);
    if (playGame({ agents: [bot, randomAgent(rng), bot, randomAgent(rng)], target: 10, rng }).winner === 0) wins++;
  }
  assert.ok(wins / 300 > 0.9);
});

test('rule bots always make legal moves over many games', () => {
  for (let g = 0; g < 300; g++) {
    const agents = [ruleBot(), ruleBot(), ruleBot(), ruleBot()];
    const game = playGame({ agents, target: 10, rng: createRng(g) });
    assert.ok(game.hands.length > 0);
  }
});

test('rule bots beat random players almost every game', () => {
  let wins = 0;
  const games = 400;
  for (let g = 0; g < games; g++) {
    const rng = createRng(50_000 + g);
    const agents: Agent[] = [ruleBot(), randomAgent(rng), ruleBot(), randomAgent(rng)]; // North/South are bots
    if (playGame({ agents, target: 10, rng }).winner === 0) wins++;
  }
  assert.ok(wins / games > 0.9, `bots won ${wins}/${games}`);
});

test('bots never play hidden information: the same view gives the same move', () => {
  const bot = ruleBot();
  // A bot that only sees one card in hand must play it.
  const card = parseCard('AS');
  assert.equal(cardId(bot.play({ legal: [card] } as never)), 'AS');
});
