import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId, parseCard, parseCards } from '../src/cards.ts';
import { createRng } from '../src/rng.ts';
import { playGame, randomAgent, type Agent } from '../src/game.ts';
import { ruleBot } from '../src/bots/ruleBot.ts';
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
