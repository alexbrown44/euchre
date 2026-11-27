import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BENNY, cardId, sameCard, type Card } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { dealFromDeck, dealHand, partnerOf, teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import {
  applyBidAction, contractOf, isLegalBidAction, legalBidActions, startBidding,
  type BidAction, type BiddingState,
} from '../src/bidding.ts';

// Dealer is South (0). Clockwise: West (1) speaks first, North (2) is the dealer's partner,
// East (3) is on the dealer's right and speaks third. Teams: South/North (0) vs West/East (1).
const S = 0, W = 1, N = 2, E = 3;

const PASS: BidAction = { type: 'pass' };
const ORDER: BidAction = { type: 'orderUp', alone: false };
const ORDER_ALONE: BidAction = { type: 'orderUp', alone: true };
const ALONE: BidAction = { type: 'goAlone' };

/** Unshuffled deck: the upcard is J♣. */
function plainDeal(): Deal {
  return dealFromDeck(S, newDeck());
}

/** Same deck with the Benny moved to the top of the kitty. */
function bennyDeal(): Deal {
  const deck = newDeck();
  [deck[20], deck[24]] = [deck[24]!, deck[20]!];
  return dealFromDeck(S, deck);
}

function play(state: BiddingState, ...actions: BidAction[]): BiddingState {
  return actions.reduce(applyBidAction, state);
}

/** Dealer discards the first card in their hand that isn't the upcard. */
function dealerDiscards(state: BiddingState): BiddingState {
  assert.equal(state.phase, 'discard');
  const card = state.hands[state.deal.dealer]!.find((c) => !sameCard(c, state.deal.upcard))!;
  return applyBidAction(state, { type: 'discard', card });
}

const types = (s: BiddingState) => legalBidActions(s).map((a) => a.type);

test('round one: everyone passes, so round two starts on the dealer\'s left', () => {
  const s = play(startBidding(plainDeal()), PASS, PASS, PASS, PASS);
  assert.equal(s.phase, 'round2');
  assert.equal(s.turn, W);
});

test('round two: the turned-down suit cannot be named', () => {
  const s = play(startBidding(plainDeal()), PASS, PASS, PASS, PASS);
  const named = legalBidActions(s).flatMap((a) => (a.type === 'name' ? [a.suit] : []));
  assert.ok(!named.includes('C'), 'clubs was turned down');
  assert.deepEqual([...new Set(named)].sort(), ['D', 'H', 'S']);
});

test('everyone passes twice: hand is thrown in', () => {
  const s = play(startBidding(plainDeal()), ...Array(8).fill(PASS));
  assert.equal(s.phase, 'thrownIn');
  assert.equal(s.turn, null);
  assert.deepEqual(legalBidActions(s), []);
});

test('the dealer speaks last in round one and can pick it up', () => {
  const s0 = play(startBidding(plainDeal()), PASS, PASS, PASS);
  assert.equal(s0.turn, S);
  const s = play(s0, ORDER);
  assert.equal(s.phase, 'discard', 'dealer is last to speak, so no one else gets a turn');
  const done = dealerDiscards(s);
  const c = contractOf(done);
  assert.equal(c.trump, 'C');
  assert.equal(c.maker, S);
  assert.ok(c.hands[S]!.some((x) => sameCard(x, done.deal.upcard)), 'dealer holds the upcard');
});

test('opponent orders up: remaining players still get a turn, then the dealer picks up and discards', () => {
  const s1 = play(startBidding(plainDeal()), ORDER);
  assert.equal(s1.phase, 'afterCall');
  assert.deepEqual(s1.pending, [N, E, S]);
  assert.deepEqual(types(s1), ['pass', 'goAlone'], 'North (defender) may defend alone');
  const s2 = play(s1, PASS);
  assert.deepEqual(types(s2), ['pass', 'goAlone'], 'East (maker\'s partner) may drop West and go alone');
  const s3 = play(s2, PASS);
  assert.deepEqual(types(s3), ['pass', 'goAlone'], 'dealer (defender) may defend alone');
  const s4 = play(s3, PASS);
  assert.equal(s4.phase, 'discard');
  assert.equal(s4.hands[S]!.length, 6);
  const done = dealerDiscards(s4);
  assert.equal(done.hands[S]!.length, 5);
  assert.ok(done.discard !== null);
  const c = contractOf(done);
  assert.equal(c.maker, W);
  assert.equal(c.makerTeam, 1);
  assert.equal(c.makerLoner, null);
  assert.equal(c.loneDefender, null);
  assert.deepEqual(c.sittingOut, []);
  assert.equal(c.dealerPickedUp, true);
});

test('going alone is announced with the order-up, as one call', () => {
  const s = play(startBidding(plainDeal()), ORDER_ALONE);
  assert.equal(s.makerLoner, W);
  assert.deepEqual(play(s, PASS, PASS, PASS).phase, 'discard');
});

test('taking over a partner\'s loner: partner who hasn\'t spoken may drop the maker', () => {
  const s = play(startBidding(plainDeal()), ORDER_ALONE, PASS);
  assert.deepEqual(types(s), ['pass', 'goAlone'], 'East may take over West\'s loner');
  const done = dealerDiscards(play(s, ALONE, PASS));
  const c = contractOf(done);
  assert.equal(c.maker, W, 'West still made trump');
  assert.equal(c.makerLoner, E, 'East plays alone');
  assert.deepEqual(c.sittingOut, [W]);
});

test('defending alone against two makers', () => {
  // North defends alone, so the dealer (South) is dropped and sits out.
  const done = play(startBidding(plainDeal()), ORDER, ALONE, PASS, PASS);
  assert.equal(done.phase, 'done');
  const c = contractOf(done);
  assert.equal(c.makerLoner, null);
  assert.equal(c.loneDefender, N);
  assert.deepEqual(c.sittingOut, [S]);
  assert.equal(c.dealerPickedUp, false, 'the dealer is sitting out, so does not pick up');
});

test('both defenders in order: second defender may defend alone if the first does not', () => {
  const done = dealerDiscards(play(startBidding(plainDeal()), ORDER, PASS, PASS, ALONE));
  const c = contractOf(done);
  assert.equal(c.loneDefender, S);
  assert.deepEqual(c.sittingOut, [N]);
  assert.equal(c.dealerPickedUp, true, 'dealer defending alone still picks up and discards');
});

test('both defenders in order: second defender may take over the first\'s lone defence', () => {
  const s = play(startBidding(plainDeal()), ORDER, ALONE, PASS);
  assert.deepEqual(types(s), ['pass', 'goAlone']);
  const done = dealerDiscards(play(s, ALONE));
  const c = contractOf(done);
  assert.equal(c.loneDefender, S);
  assert.deepEqual(c.sittingOut, [N]);
});

test('answering a lone defender: maker\'s partner may go alone in response', () => {
  const s = play(startBidding(plainDeal()), ORDER, ALONE);
  assert.deepEqual(types(s), ['pass', 'goAlone'], 'East may now answer North');
  const done = play(s, ALONE, PASS);
  const c = contractOf(done);
  assert.equal(c.makerLoner, E);
  assert.equal(c.loneDefender, N);
  assert.deepEqual(c.sittingOut.sort(), [S, W]);
});

test('Up and Down: the dealer\'s partner can only order up alone', () => {
  const s = play(startBidding(plainDeal()), PASS);
  assert.equal(s.turn, N);
  assert.ok(isLegalBidAction(s, ORDER_ALONE));
  assert.ok(!isLegalBidAction(s, ORDER));
});

test('Up and Down, dealer does not take over: partner alone, dealer dropped, no pick-up', () => {
  const done = play(startBidding(plainDeal()), PASS, ORDER_ALONE, PASS, PASS);
  assert.equal(done.phase, 'done');
  const c = contractOf(done);
  assert.equal(c.trump, 'C', 'the upcard\'s suit is still trump');
  assert.equal(c.makerLoner, N);
  assert.deepEqual(c.sittingOut, [S]);
  assert.equal(c.dealerPickedUp, false);
  assert.ok(!c.hands[S]!.some((x) => sameCard(x, done.deal.upcard)));
});

test('Up and Down, dealer takes over: dealer alone, picks up and discards', () => {
  const s = play(startBidding(plainDeal()), PASS, ORDER_ALONE, PASS);
  assert.equal(s.turn, S);
  assert.deepEqual(types(s), ['pass', 'goAlone']);
  const done = dealerDiscards(play(s, ALONE));
  const c = contractOf(done);
  assert.equal(c.makerLoner, S);
  assert.deepEqual(c.sittingOut, [N]);
  assert.equal(c.dealerPickedUp, true);
});

test('Up and Down: the player on the dealer\'s right may defend alone before the dealer decides', () => {
  const s = play(startBidding(plainDeal()), PASS, ORDER_ALONE);
  assert.equal(s.turn, E);
  assert.deepEqual(types(s), ['pass', 'goAlone']);
  const done = play(s, ALONE, PASS);
  const c = contractOf(done);
  assert.equal(c.makerLoner, N);
  assert.equal(c.loneDefender, E);
  assert.deepEqual(c.sittingOut.sort(), [S, W]);
});

test('round two: naming a suit, no one picks anything up', () => {
  const s = play(startBidding(plainDeal()), PASS, PASS, PASS, PASS, { type: 'name', suit: 'H', alone: true });
  assert.deepEqual(s.pending, [N, E, S]);
  const done = play(s, PASS, PASS, PASS);
  const c = contractOf(done);
  assert.equal(c.trump, 'H');
  assert.equal(c.makerLoner, W);
  assert.equal(c.dealerPickedUp, false);
  assert.equal(c.discard, null);
});

test('round two: the dealer\'s partner is not forced to go alone', () => {
  const s = play(startBidding(plainDeal()), PASS, PASS, PASS, PASS, PASS);
  assert.equal(s.turn, N);
  assert.ok(isLegalBidAction(s, { type: 'name', suit: 'S', alone: false }));
});

test('Benny turned up: only the dealer acts, names trump blind (no pass), picks up and discards', () => {
  const s = startBidding(bennyDeal());
  assert.equal(s.phase, 'bennyCall');
  assert.equal(s.turn, S);
  assert.ok(!types(s).includes('pass'));
  assert.equal(legalBidActions(s).length, 4, '4 suits, and not alone: that comes after seeing the cards');
  assert.ok(!isLegalBidAction(s, { type: 'name', suit: 'C', alone: true }), 'no blind loner');
  const s1 = play(s, { type: 'name', suit: 'C', alone: false });
  assert.equal(s1.phase, 'discard', 'no one else gets a turn');
  assert.ok(s1.hands[S]!.some((c) => c.kind === 'benny'));
  const s2 = dealerDiscards(s1);
  assert.equal(s2.phase, 'afterCall', 'then the dealer, who has seen their cards, may go alone');
  assert.equal(s2.turn, S);
  assert.deepEqual(legalBidActions(s2), [{ type: 'pass' }, { type: 'goAlone' }]);
  assert.equal(s2.hands[S]!.length, 5);
  const done = play(s2, PASS);
  assert.equal(done.phase, 'done');
  assert.equal(done.makerLoner, null);
  assert.equal(done.history.length, 3);
  const c = contractOf(done);
  assert.equal(c.maker, S);
  assert.equal(c.trump, 'C');
  assert.ok(c.hands[S]!.some((x) => sameCard(x, BENNY)));
});

test('Benny turned up: dealer may go alone, after picking up and discarding', () => {
  const done = play(dealerDiscards(play(startBidding(bennyDeal()), { type: 'name', suit: 'D', alone: false })), { type: 'goAlone' });
  assert.equal(done.phase, 'done');
  assert.equal(done.hands[S]!.length, 5, 'the dealer does not pick up twice');
  const c = contractOf(done);
  assert.equal(c.makerLoner, S);
  assert.deepEqual(c.sittingOut, [N]);
});

test('maker\'s partner may drop the maker and go alone when nobody else is alone', () => {
  // West orders up; North (defender) passes; East (West's partner) goes alone and West sits out.
  const s = play(startBidding(plainDeal()), ORDER, PASS, ALONE);
  assert.equal(s.makerLoner, E);
  assert.equal(s.maker, W, 'West still made trump');
  const done = dealerDiscards(play(s, PASS));
  const c = contractOf(done);
  assert.equal(c.makerLoner, E);
  assert.deepEqual(c.sittingOut, [W]);
  assert.ok(c.dealerPickedUp, 'the dealer (a defender) still picks up');
});

test('illegal actions are rejected', () => {
  const start = startBidding(plainDeal());
  assert.throws(() => play(start, ALONE), 'cannot go alone before trump is made');
  assert.throws(() => play(start, PASS, ORDER), 'Up and Down must be alone');
  const r2 = play(start, PASS, PASS, PASS, PASS);
  assert.throws(() => play(r2, { type: 'name', suit: 'C', alone: false }), 'turned-down suit');
  assert.throws(() => play(r2, ORDER), 'no ordering up in round two');
});

test('random bidding over many deals always ends cleanly and keeps every card accounted for', () => {
  const rng = createRng(99);
  let done = 0, thrown = 0;
  for (let i = 0; i < 20_000; i++) {
    const deal = dealHand((i % 4) as Seat, rng);
    let s = startBidding(deal);
    while (s.turn !== null) {
      const options = legalBidActions(s);
      // Pass half the time (when allowed), so thrown-in hands also happen.
      const pick = options[0]!.type === 'pass' && rng() < 0.5
        ? options[0]!
        : options[Math.floor(rng() * options.length)]!;
      s = applyBidAction(s, pick);
    }
    if (s.phase === 'thrownIn') { thrown++; continue; }
    assert.equal(s.phase, 'done');
    done++;
    const c = contractOf(s);
    for (const h of c.hands) assert.equal(h.length, 5);
    if (c.makerLoner !== null) assert.equal(teamOf(c.makerLoner), c.makerTeam);
    if (c.loneDefender !== null) assert.notEqual(teamOf(c.loneDefender), c.makerTeam);
    assert.ok(c.sittingOut.length <= 2);
    for (const out of c.sittingOut) assert.ok(!c.sittingOut.includes(partnerOf(out)), 'a team always has a player');
    if (c.dealerPickedUp) assert.ok(!c.sittingOut.includes(deal.dealer));
    // Every card is in a hand, the discard, or the kitty.
    const kittyLeft: Card[] = c.dealerPickedUp ? deal.kitty.slice(1) : deal.kitty;
    const all = [...c.hands.flat(), ...kittyLeft, ...(c.discard ? [c.discard] : [])].map(cardId);
    assert.equal(all.length, 25);
    assert.equal(new Set(all).size, 25);
  }
  assert.ok(done > 0 && thrown > 0);
});
