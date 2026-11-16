// Walk through scripted bidding examples in table language, so a human can check the rules.
// The choices are scripted to show each rule, not chosen for good play.
// Usage: node scripts/sample-bidding.ts

import {
  SUIT_NAME, cardLabel, isTrump, plainRank, sameColourSuit, sortHand, trumpRank, type Card,
} from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { dealFromDeck, SEATS, type Deal, type Seat } from '../src/deal.ts';
import { createRng, shuffle } from '../src/rng.ts';
import {
  applyBidAction, contractOf, describeBidTurn, startBidding,
  type BidAction, type BiddingState,
} from '../src/bidding.ts';

const NAME: Record<Seat, string> = { 0: 'South', 1: 'West', 2: 'North', 3: 'East' };
const PASS: BidAction = { type: 'pass' };
const ALONE: BidAction = { type: 'goAlone' };

function deal(seed: number, bennyUp = false): Deal {
  const deck = shuffle(newDeck(), createRng(seed));
  if (bennyUp) {
    const i = deck.findIndex((c) => c.kind === 'benny');
    [deck[i], deck[20]] = [deck[20]!, deck[i]!];
  } else if (deck[20]!.kind === 'benny') {
    [deck[20], deck[21]] = [deck[21]!, deck[20]!];
  }
  return dealFromDeck(0, deck); // South deals in every example
}

function run(title: string, d: Deal, actions: BidAction[]): void {
  console.log(`=== ${title} ===`);
  console.log(`South deals (partner North). West speaks first. Upcard: ${cardLabel(d.upcard)}`);
  for (const s of SEATS) console.log(`  ${NAME[s].padEnd(6)} ${sortHand(d.hands[s]!, null).map(cardLabel).join('  ')}`);
  console.log('  Bidding:');

  let state: BiddingState = startBidding(d);
  const queue = [...actions];
  while (state.turn !== null) {
    let action = queue.shift();
    if (state.phase === 'discard') {
      // Discard the weakest card the dealer holds (just for the example): lowest non-trump, else lowest trump.
      const trump = state.trump!;
      const strength = (c: Card) => (isTrump(c, trump) ? 100 + trumpRank(c, trump) : c.kind === 'suited' ? plainRank(c) : 999);
      const weakest = [...state.hands[state.deal.dealer]!].sort((a, b) => strength(a) - strength(b))[0]!;
      action = { type: 'discard', card: weakest };
    }
    if (!action) throw new Error(`script ran out of actions in phase ${state.phase}`);
    const label = state.phase === 'afterCall' ? ' (after the call)' : state.phase === 'round2' ? ' (round two)' : '';
    console.log(`    ${NAME[state.turn].padEnd(6)} ${describeBidTurn(state, action)}${label}`);
    state = applyBidAction(state, action);
  }

  if (state.phase === 'thrownIn') {
    console.log('  Result: everyone passed twice. Hand thrown in, deal passes to West.\n');
    return;
  }
  const c = contractOf(state);
  const out = c.sittingOut.map((s) => NAME[s]).join(' and ') || 'nobody';
  console.log(`  Result: ${SUIT_NAME[c.trump]} are trump, made by ${NAME[c.maker]} (${c.makerTeam === 0 ? 'North/South' : 'East/West'}).`);
  console.log(`          Makers alone: ${c.makerLoner === null ? 'no' : NAME[c.makerLoner]}. Lone defender: ${c.loneDefender === null ? 'no' : NAME[c.loneDefender]}. Sitting out: ${out}.`);
  console.log(`          Dealer picked up: ${c.dealerPickedUp ? `yes, discarded ${cardLabel(c.discard!)} face down (only the dealer knows)` : 'no'}.\n`);
}

const ORDER: BidAction = { type: 'orderUp', alone: false };
const ORDER_ALONE: BidAction = { type: 'orderUp', alone: true };

run('1. West orders up, everyone else passes', deal(1), [ORDER, PASS, PASS, PASS]);
run('2. Up and Down: North orders up, dealer is dropped', deal(2), [PASS, ORDER_ALONE, PASS, PASS]);
run('3. Up and Down, dealer takes over', deal(3), [PASS, ORDER_ALONE, PASS, ALONE]);
run('4. Up and Down, East defends alone before the dealer decides', deal(4), [PASS, ORDER_ALONE, ALONE, PASS]);
run('5. West goes alone, partner East takes over', deal(5), [ORDER_ALONE, PASS, ALONE, PASS]);
run('6. West orders up, North defends alone, East answers alone, dealer takes over the defence', deal(6), [ORDER, ALONE, ALONE, ALONE]);
const d7 = deal(7);
const next = d7.upcard.kind === 'suited' ? sameColourSuit(d7.upcard.suit) : 'S';
run(`7. Round two: East makes next (${SUIT_NAME[next]}), alone`, d7, [PASS, PASS, PASS, PASS, PASS, PASS, { type: 'name', suit: next, alone: true }, PASS]);
run('8. Benny turned up: dealer names trump blind', deal(8, true), [{ type: 'name', suit: 'S', alone: false }]);
run('9. Everyone passes twice', deal(9), Array(8).fill(PASS));
