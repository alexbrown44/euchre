// Print sample deals so a human can check them.
// Usage: node scripts/sample-deals.ts [count=3] [seed=2026]

import { SUIT_NAME, cardLabel, isTrump, sortHand } from '../src/cards.ts';
import { SEATS, chooseFirstDealer, dealHand, leftOf, partnerOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';

const SEAT_NAME: Record<Seat, string> = { 0: 'South', 1: 'West', 2: 'North', 3: 'East' };

const count = Number(process.argv[2] ?? 3);
const seed = Number(process.argv[3] ?? 2026);
const rng = createRng(seed);

let dealer = chooseFirstDealer(rng);
console.log(`Seed ${seed}. Seats clockwise: South, West, North, East. Teams: North/South vs East/West.`);
console.log(`First Jack went to ${SEAT_NAME[dealer]}, so ${SEAT_NAME[dealer]} deals first.\n`);

for (let i = 1; i <= count; i++) {
  const d = dealHand(dealer, rng);
  const up = d.upcard;
  const trump = up.kind === 'suited' ? up.suit : null;

  console.log(`=== Deal ${i}: ${SEAT_NAME[dealer]} deals (partner ${SEAT_NAME[partnerOf(dealer)]}), ${SEAT_NAME[leftOf(dealer)]} speaks first ===`);
  if (trump === null) {
    console.log(`Upcard: Benny! ${SEAT_NAME[dealer]} must name trump blind, then picks up and discards.`);
  } else {
    console.log(`Upcard: ${cardLabel(up)}. Hands sorted as if ${SUIT_NAME[trump]} were trump:`);
  }
  for (const s of SEATS) {
    const hand = sortHand(d.hands[s]!, trump);
    const trumps = trump === null ? '' : `  (${hand.filter((c) => isTrump(c, trump)).length} trump)`;
    const tag = s === dealer ? ' [dealer]' : '';
    console.log(`  ${(SEAT_NAME[s] + tag).padEnd(15)} ${hand.map(cardLabel).join('  ')}${trumps}`);
  }
  console.log(`  Kitty: ${cardLabel(up)} face up, then ${d.kitty.slice(1).map(cardLabel).join('  ')} face down (sleeping)\n`);
  dealer = leftOf(dealer);
}
