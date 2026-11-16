import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENNY, SUITS, cardId, cardLabel, effectiveSuit, isLeftBower, isRightBower, isTrump,
  parseCard, parseCards, sameColourSuit, sortHand, trickWinnerIndex, trumpRank, type Suit,
} from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';

const ids = (cards: ReturnType<typeof parseCards>) => cards.map(cardId);

test('deck has 25 unique cards including exactly one Benny', () => {
  const deck = newDeck();
  assert.equal(deck.length, 25);
  assert.equal(new Set(deck.map(cardId)).size, 25);
  assert.equal(deck.filter((c) => c.kind === 'benny').length, 1);
});

test('Left Bower table matches the rules doc', () => {
  const expected: Record<Suit, [string, string]> = {
    S: ['JS', 'JC'], C: ['JC', 'JS'], H: ['JH', 'JD'], D: ['JD', 'JH'],
  };
  for (const trump of SUITS) {
    const [right, left] = expected[trump];
    assert.ok(isRightBower(parseCard(right), trump), `${right} right bower for ${trump}`);
    assert.ok(isLeftBower(parseCard(left), trump), `${left} left bower for ${trump}`);
    assert.equal(sameColourSuit(sameColourSuit(trump)), trump);
  }
});

test('for every trump suit: trump has 8 cards, same colour suit 5, other suits 6', () => {
  const deck = newDeck();
  for (const trump of SUITS) {
    const count = (s: Suit) => deck.filter((c) => effectiveSuit(c, trump) === s).length;
    assert.equal(count(trump), 8, `trump ${trump}`);
    assert.equal(count(sameColourSuit(trump)), 5, `same colour as ${trump}`);
    for (const s of SUITS) {
      if (s !== trump && s !== sameColourSuit(trump)) assert.equal(count(s), 6, `${s} when ${trump} trump`);
    }
  }
});

test('trump order is Benny, Right, Left, A, K, Q, 10, 9 (hearts trump)', () => {
  const order = parseCards('Benny JH JD AH KH QH 10H 9H');
  const ranks = order.map((c) => trumpRank(c, 'H'));
  assert.deepEqual(ranks, [8, 7, 6, 5, 4, 3, 2, 1]);
});

test('Benny is always trump and has no suit before trump is named', () => {
  for (const trump of SUITS) assert.ok(isTrump(BENNY, trump));
  assert.equal(effectiveSuit(BENNY, null), null);
});

test('Left Bower counts as trump, not its printed suit', () => {
  const jd = parseCard('JD');
  assert.equal(effectiveSuit(jd, 'H'), 'H');
  assert.ok(isTrump(jd, 'H'));
  assert.equal(effectiveSuit(jd, 'S'), 'D'); // a plain Jack when trump is black
});

test('Benny beats both bowers', () => {
  // Hearts trump. Right Bower led, then Left Bower, Benny, Ace of trump.
  const trick = parseCards('JH JD Benny AH');
  assert.equal(trickWinnerIndex(trick, 'H'), 2);
});

test('lowest trump beats the highest card of the led suit', () => {
  const trick = parseCards('AS KS 9H QS');
  assert.equal(trickWinnerIndex(trick, 'H'), 2);
});

test('off-suit card cannot win, even an Ace', () => {
  // Spades led, hearts trump, nobody trumps: A♣ is off-suit.
  const trick = parseCards('10S AC QS 9S');
  assert.equal(trickWinnerIndex(trick, 'H'), 2);
});

test('leading the Left Bower is a trump lead', () => {
  // Hearts trump, J♦ led: A♦ does not follow (diamonds is a different suit), 10♥ is lower trump.
  const trick = parseCards('JD AD 10H KD');
  assert.equal(trickWinnerIndex(trick, 'H'), 0);
});

test('leading the Benny is a trump lead and wins', () => {
  const trick = parseCards('Benny JS JC AS');
  assert.equal(trickWinnerIndex(trick, 'S'), 0);
});

test('in the same-colour suit the Jack is missing, so the Ace still wins it', () => {
  // Hearts trump, diamonds led (J♦ is not a diamond this hand).
  const trick = parseCards('9D AD QD 10D');
  assert.equal(trickWinnerIndex(trick, 'H'), 1);
});

test('sortHand puts trumps first, highest first, with Left Bower among trumps', () => {
  const hand = parseCards('9S JD AH Benny KC');
  assert.deepEqual(ids(sortHand(hand, 'H')), ['BENNY', 'JD', 'AH', '9S', 'KC']);
});

test('card labels and parsing', () => {
  assert.equal(cardLabel(parseCard('10h')), '10♥');
  assert.equal(cardLabel(parseCard('joker')), 'Benny');
  assert.throws(() => parseCard('8S'));
});
