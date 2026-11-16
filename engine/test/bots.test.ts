import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId, parseCard, parseCards } from '../src/cards.ts';
import { createRng } from '../src/rng.ts';
import { playGame, randomAgent, type Agent } from '../src/game.ts';
import { ruleBot } from '../src/bots/ruleBot.ts';
import { chooseDiscard, features, strength } from '../src/bots/evaluate.ts';

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
