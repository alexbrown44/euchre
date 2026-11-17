import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId, effectiveSuit, parseCard, parseCards } from '../src/cards.ts';
import { createRng } from '../src/rng.ts';
import { playGame, type Agent, type PlayView } from '../src/game.ts';
import { ruleBot } from '../src/bots/ruleBot.ts';
import { knownVoids, monteCarloBot, sampleWorld } from '../src/bots/monteCarlo.ts';
import type { Seat } from '../src/deal.ts';

// A hand-built view: South (0) to play, hearts trump, West dealt and picked up the upcard (K♥).
// Trick 1: North led A♠, East played 9♣ (showing out of spades), South...
function view(): PlayView {
  return {
    seat: 0, dealer: 1, trump: 'H', upcard: parseCard('KH'), maker: 1, makerTeam: 1,
    makerLoner: null, loneDefender: null, sittingOut: [], dealerPickedUp: true, myDiscard: null,
    hand: parseCards('QS 10D AD 9H 10H'),
    current: { leader: 2, plays: [{ seat: 2, card: parseCard('AS') }, { seat: 3, card: parseCard('9C') }], winner: null },
    tricks: [], tricksWon: [0, 0], legal: parseCards('QS'), score: [0, 0], target: 10,
  };
}

test('voids: a player who did not follow suit is known to be out of that suit', () => {
  const v = knownVoids(view());
  assert.ok(v.get(3 as Seat)!.has('S'));
  assert.equal(v.get(2 as Seat), undefined);
});

test('sampled worlds respect hand sizes, voids, the picked-up upcard, and never include seen cards', () => {
  const v = view();
  const rng = createRng(1);
  for (let i = 0; i < 500; i++) {
    const w = sampleWorld(v, rng)!;
    assert.ok(w);
    assert.equal(w[0]!.length, 5, 'own hand unchanged');
    assert.equal(w[1]!.length, 5, 'West has not played yet');
    assert.equal(w[2]!.length, 4, 'North played one card');
    assert.equal(w[3]!.length, 4, 'East played one card');
    assert.ok(w[1]!.some((c) => cardId(c) === 'KH'), 'dealer holds the upcard they picked up');
    assert.ok(w[3]!.every((c) => effectiveSuit(c, 'H') !== 'S'), 'East has no spades');
    const seen = new Set(['QS', '10D', 'AD', '9H', '10H', 'AS', '9C']);
    for (const s of [1, 2, 3]) for (const c of w[s]!) assert.ok(!seen.has(cardId(c)));
    const all = w.flat().map(cardId);
    assert.equal(new Set(all).size, all.length, 'no card dealt twice');
  }
});

test('Monte Carlo bots always make legal moves', () => {
  for (let g = 0; g < 20; g++) {
    const mc = monteCarloBot({ worlds: 8, seed: g });
    const agents: Agent[] = [mc, ruleBot(), mc, ruleBot()];
    assert.ok(playGame({ agents, target: 10, rng: createRng(g) }).hands.length > 0);
  }
});

test('Monte Carlo bots beat rule bots with the same bidding', () => {
  let wins = 0;
  const games = 120;
  for (let g = 0; g < games; g++) {
    const mc = monteCarloBot({ worlds: 12, seed: g });
    const rb = ruleBot();
    const mcNS = g % 2 === 0;
    const r = playGame({ agents: mcNS ? [mc, rb, mc, rb] : [rb, mc, rb, mc], target: 10, rng: createRng(7000 + g) });
    if ((r.winner === 0) === mcNS) wins++;
  }
  assert.ok(wins / games > 0.52, `Monte Carlo won ${wins}/${games}`);
});
