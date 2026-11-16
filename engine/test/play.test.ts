import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardId, parseCards, type Card, type Suit } from '../src/cards.ts';
import type { Contract } from '../src/bidding.ts';
import type { Seat } from '../src/deal.ts';
import { applyPlay, legalPlays, makerTricks, nextActive, startPlay, type PlayState } from '../src/play.ts';

// Seats: South 0, West 1, North 2, East 3. Dealer is South unless stated.
const S = 0, W = 1, N = 2, E = 3;

function contract(hands: string[], trump: Suit, extra: Partial<Contract> = {}): Contract {
  return {
    trump,
    maker: W,
    makerTeam: 1,
    makerLoner: null,
    loneDefender: null,
    sittingOut: [],
    dealerPickedUp: false,
    discard: null,
    hands: hands.map(parseCards),
    ...extra,
  };
}

const ids = (cards: Card[]) => cards.map(cardId).sort();
const playIds = (s: PlayState, ...cards: string[]) => cards.reduce((st, c) => applyPlay(st, parseCards(c)[0]!), s);

test('the player on the dealer\'s left leads first', () => {
  const s = startPlay(contract(['9S 10S QS KS AS', '9H 10H QH KH AH', '9D 10D QD KD AD', '9C 10C QC KC AC'], 'H'), S);
  assert.equal(s.turn, W);
  assert.equal(legalPlays(s).length, 5, 'the leader may lead anything');
});

test('must follow suit when able', () => {
  // Spades trump. West leads A♦. North holds one diamond, so must play it.
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', 'AD 9H 10H QH KH', '9D 10C QC KC AC', '10D QD KD AH JH'], 'S'), S), 'AD');
  assert.equal(s.turn, N);
  assert.deepEqual(ids(legalPlays(s)), ['9D']);
});

test('following suit: Left Bower must follow trump, not its printed suit', () => {
  // Hearts trump. West leads 9♦ (a plain diamond). North holds J♦ (the Left Bower = a heart) and no other diamonds.
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', '9D 10H QH KH AH', 'JD 9C 10C QC KC', '10D QD KD AD AC'], 'H'), S), '9D');
  assert.equal(s.turn, N);
  assert.deepEqual(ids(legalPlays(s)), ids(parseCards('JD 9C 10C QC KC')), 'J♦ is not a diamond this hand, so North is void');
});

test('following suit: when trump is led, the Left Bower and Benny must follow', () => {
  // Hearts trump. West leads 10♥. North has the Benny and J♦ (Left Bower) as their only trumps.
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', '10H 9D QH KH AH', 'Benny JD 9C 10C QC', '10D QD KD AD AC'], 'H'), S), '10H');
  assert.deepEqual(ids(legalPlays(s)), ids(parseCards('Benny JD')));
});

test('following suit: a player whose only trump is the Benny must play it when trump is led', () => {
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', '10H 9D QH KH AH', 'Benny 9C 10C QC KC', '10D QD KD AD AC'], 'H'), S), '10H');
  assert.deepEqual(ids(legalPlays(s)), ['BENNY']);
});

test('leading the Benny is a trump lead: others must follow with trump', () => {
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', 'Benny 9D QD KD AD', '9H 9C 10C QC KC', '10D 10H KH AH AC'], 'H'), S), 'Benny');
  assert.deepEqual(ids(legalPlays(s)), ['9H']);
});

test('void in the led suit: may trump in or throw off anything', () => {
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', 'AC 9D QD KD AD', '9H 10H QH KH AH', '10D JD 10C QC KC'], 'H'), S), 'AC');
  assert.equal(legalPlays(s).length, 5, 'North has no clubs');
});

test('a full hand: tricks go to the right winners and the winner leads next', () => {
  // Hearts trump, dealer South, West leads. Everyone has one suit, so play is forced.
  let s = startPlay(contract(['9S 10S QS KS AS', '9H 10H QH KH AH', '9D 10D QD KD AD', '9C 10C QC KC AC'], 'H'), S);
  // Trick 1: W leads A♥ (trump) and wins. W leads again each time.
  for (let t = 0; t < 5; t++) {
    assert.equal(s.turn, W);
    s = applyPlay(s, legalPlays(s)[0]!);
    s = applyPlay(s, legalPlays(s)[0]!);
    s = applyPlay(s, legalPlays(s)[0]!);
    s = applyPlay(s, legalPlays(s)[0]!);
  }
  assert.equal(s.turn, null);
  assert.equal(s.tricks.length, 5);
  assert.ok(s.tricks.every((t) => t.winner === W), 'West holds all the trumps');
  assert.deepEqual(s.tricksWon, [0, 5]);
  assert.equal(makerTricks(s), 5);
});

test('players sitting out are skipped, and each trick has only the active players', () => {
  // West goes alone (North and South both defending). East sits out.
  const c = contract(['9S 10S QS KS AS', '9H 10H QH KH AH', '9D 10D QD KD AD', '9C 10C QC KC AC'], 'H',
    { makerLoner: W, sittingOut: [E] });
  let s = startPlay(c, S);
  assert.deepEqual(s.active, [S, W, N]);
  assert.equal(s.turn, W);
  s = playIds(s, 'AH');
  assert.equal(s.turn, N);
  s = playIds(s, 'AD');
  assert.equal(s.turn, S, 'East is skipped');
  s = playIds(s, 'AS');
  assert.equal(s.tricks.length, 1);
  assert.equal(s.tricks[0]!.plays.length, 3);
});

test('if the player on the dealer\'s left is sitting out, the next active player leads', () => {
  // Dealer South; West sits out (East alone for the makers).
  const c = contract(['9S 10S QS KS AS', '9H 10H QH KH AH', '9D 10D QD KD AD', '9C 10C QC KC AC'], 'H',
    { makerLoner: E, sittingOut: [W] });
  assert.equal(startPlay(c, S).turn, N);
  assert.equal(nextActive(S, [S, N, E] as Seat[]), N);
});

test('one-on-one: maker alone against a lone defender', () => {
  const c = contract(['9S 10S QS KS AS', '9H 10H QH KH AH', '9D 10D QD KD AD', '9C 10C QC KC AC'], 'H',
    { makerLoner: E, loneDefender: N, sittingOut: [W, S] });
  let s = startPlay(c, S);
  assert.equal(s.turn, N);
  s = playIds(s, 'AD');
  assert.equal(s.turn, E);
  s = playIds(s, 'AC');
  assert.equal(s.tricks.length, 1);
  assert.equal(s.tricks[0]!.winner, N, 'A♦ led, A♣ is off-suit');
});

test('illegal plays are rejected', () => {
  const start = startPlay(contract(['9S 10S QS KS AS', 'AD 9H 10H QH KH', '9D 10C QC KC AC', '10D QD KD AH JH'], 'S'), S);
  assert.throws(() => playIds(start, 'AS'), 'not in West\'s hand');
  assert.throws(() => playIds(start, 'AD', 'AC'), 'North must follow diamonds with 9♦');
});

test('the Left Bower cannot be used to follow its printed suit', () => {
  // Diamonds trump: J♥ is the Left Bower (a diamond). West leads a heart; North's only "heart" is J♥, so North is void.
  const s = playIds(startPlay(contract(['9S 10S QS KS AS', '9H 10H QH KH AH', 'JH 10D QD KD AD', '9C 10C QC KC AC'], 'D'), S), '9H');
  assert.equal(legalPlays(s).length, 5);
});
