import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import {
  SEATS, chooseFirstDealer, clockwiseFrom, dealFromDeck, dealHand, leftOf, partnerOf, teamOf, type Seat,
} from '../src/deal.ts';
import { createRng, shuffle } from '../src/rng.ts';

test('seating: partners opposite, teams 0&2 and 1&3, deal passes clockwise', () => {
  assert.equal(partnerOf(0), 2);
  assert.equal(partnerOf(3), 1);
  assert.equal(teamOf(0), teamOf(2));
  assert.equal(teamOf(1), teamOf(3));
  assert.notEqual(teamOf(0), teamOf(1));
  assert.equal(leftOf(3), 0);
  assert.deepEqual(clockwiseFrom(2), [2, 3, 0, 1]);
});

test('every deal: 4 hands of 5, kitty of 5, all 25 cards used once, upcard is top of kitty', () => {
  const rng = createRng(1);
  for (let i = 0; i < 1000; i++) {
    const dealer = (i % 4) as Seat;
    const d = dealHand(dealer, rng);
    for (const s of SEATS) assert.equal(d.hands[s]!.length, 5);
    assert.equal(d.kitty.length, 5);
    assert.equal(d.upcard, d.kitty[0]);
    const all = [...d.hands.flat(), ...d.kitty].map(cardId);
    assert.equal(new Set(all).size, 25);
  }
});

test('deal order: 3-2-3-2 then 2-3-2-3 starting on the dealer\'s left', () => {
  const deck = newDeck(); // unshuffled, so we can predict exactly who gets what
  const d = dealFromDeck(3, deck); // dealer is seat 3, so seat 0 is dealt first
  const idx = (seat: Seat) => d.hands[seat]!.map((c) => deck.indexOf(c));
  assert.deepEqual(idx(0), [0, 1, 2, 10, 11]);
  assert.deepEqual(idx(1), [3, 4, 12, 13, 14]);
  assert.deepEqual(idx(2), [5, 6, 7, 15, 16]);
  assert.deepEqual(idx(3), [8, 9, 17, 18, 19]);
  assert.deepEqual(d.kitty.map((c) => deck.indexOf(c)), [20, 21, 22, 23, 24]);
});

test('same seed gives the same deal; different seeds differ', () => {
  const a = dealHand(0, createRng(42));
  const b = dealHand(0, createRng(42));
  const c = dealHand(0, createRng(43));
  const key = (d: typeof a) => [...d.hands.flat(), ...d.kitty].map(cardId).join(' ');
  assert.equal(key(a), key(b));
  assert.notEqual(key(a), key(c));
});

test('shuffle is fair: each card is the upcard about 1 time in 25', () => {
  const rng = createRng(7);
  const counts = new Map<string, number>();
  const n = 50_000;
  for (let i = 0; i < n; i++) {
    const top = cardId(shuffle(newDeck(), rng)[20]!);
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  assert.equal(counts.size, 25);
  for (const [id, count] of counts) {
    assert.ok(Math.abs(count / n - 1 / 25) < 0.006, `${id} came up ${count} times`);
  }
});

test('first dealer is whoever gets the first Jack, any suit', () => {
  const rng = createRng(3);
  const seen = new Set<Seat>();
  for (let i = 0; i < 200; i++) seen.add(chooseFirstDealer(rng));
  assert.equal(seen.size, 4); // every seat can end up dealing
});
