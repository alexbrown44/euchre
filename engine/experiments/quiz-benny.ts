// Quiz questions for "Would you call?": the Benny was turned up, you (the dealer) named trumps
// blind, picked up and discarded. Go alone, or keep your partner? (Finding 19.)
//
// Hands are drawn at random and grouped by shape (trumps, Bowers, off-suit Ace), up to two per
// shape. For each hand, the hidden cards are dealt `samples` different ways and the hand is played
// out both ways from the same deal, with Monte Carlo card play for all four players.
//
// Usage: node experiments/quiz-benny.ts [samples=300] [perShape=2] [out=../app/src/learn/data/benny-bank.json]

import { writeFileSync } from 'node:fs';
import { BENNY, cardId, isLeftBower, isRightBower, isTrump, sameCard, SUITS, type Card, type Suit } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng, shuffle } from '../src/rng.ts';
import { applyBidAction, startBidding } from '../src/bidding.ts';
import { finishHand } from '../src/game.ts';
import { LEAGUE_V3_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { bennyDealerShouldGoAlone, chooseDiscard } from '../src/bots/evaluate.ts';

const SAMPLES = Number(process.argv[2] ?? 300);
const PER_SHAPE = Number(process.argv[3] ?? 2);
const OUT = process.argv[4] ?? '../app/src/learn/data/benny-bank.json';
const DEALER: Seat = 0;
const CLOSE = 0.05; // as in the app: closer than this counts as "fine"

const rng = createRng(19_019);

function shapeKey(hand: readonly Card[], trump: Suit): string {
  const trumps = hand.filter((c) => isTrump(c, trump)).length;
  const bowers = hand.filter((c) => isRightBower(c, trump) || isLeftBower(c, trump)).length;
  const ace = hand.some((c) => c.kind === 'suited' && c.rank === 'A' && !isTrump(c, trump));
  return `${trumps}|${bowers}|${ace ? 1 : 0}`;
}

/** Your six cards after picking up the Benny, the suit you named, and your discard. */
interface Spot { six: Card[]; trump: Suit; discard: Card; hand: Card[] }

function randomSpot(): Spot {
  const deck = shuffle(newDeck().filter((c) => c.kind !== 'benny'), rng);
  const six = [...deck.slice(0, 5), BENNY];
  const trump = SUITS[Math.floor(rng() * 4)]!;
  const discard = chooseDiscard(six, trump, 10);
  return { six, trump, discard, hand: six.filter((c) => !sameCard(c, discard)) };
}

function measure(spot: Spot, id: number) {
  const rest = newDeck().filter((c) => !spot.six.some((x) => sameCard(x, c)));
  let pass = 0, alone = 0, dSq = 0;
  for (let k = 0; k < SAMPLES; k++) {
    const r = shuffle(rest, rng);
    const deal: Deal = {
      dealer: DEALER,
      hands: [spot.six.filter((c) => c.kind !== 'benny'), r.slice(0, 5), r.slice(5, 10), r.slice(10, 15)],
      kitty: [BENNY, ...r.slice(15, 19)],
      upcard: BENNY,
    };
    let s = applyBidAction(startBidding(deal), { type: 'name', suit: spot.trump, alone: false });
    s = applyBidAction(s, { type: 'discard', card: spot.discard });
    const play = (action: { type: 'pass' } | { type: 'goAlone' }) => {
      const agents = [0, 1, 2, 3].map((i) => monteCarloBot({ worlds: 20, params: LEAGUE_V3_PARAMS, seed: id * 100_000 + k * 4 + i }));
      const h = finishHand(applyBidAction(s, action), agents, [0, 0], 10);
      return h.result!.team === teamOf(DEALER) ? h.result!.points : -h.result!.points;
    };
    const p = play({ type: 'pass' });
    const a = play({ type: 'goAlone' });
    pass += p;
    alone += a;
    dSq += (a - p) ** 2;
  }
  const mp = pass / SAMPLES, ma = alone / SAMPLES;
  const diff = ma - mp;
  const margin = 2 * Math.sqrt(Math.max(0, dSq / SAMPLES - diff * diff) / SAMPLES);
  return { mp, ma, margin };
}

// Pick hands: up to PER_SHAPE of each shape.
const byShape = new Map<string, Spot[]>();
for (let tries = 0; tries < 200_000; tries++) {
  const spot = randomSpot();
  const key = shapeKey(spot.hand, spot.trump);
  const list = byShape.get(key) ?? [];
  if (list.length < PER_SHAPE) byShape.set(key, [...list, spot]);
}

const questions: unknown[] = [];
const starterShapes = new Set<string>();
let id = 0;
const started = performance.now();
for (const [key, spots] of [...byShape.entries()].sort()) {
  for (const spot of spots) {
    id++;
    const { mp, ma, margin } = measure(spot, id);
    const gap = Math.abs(ma - mp);
    const guideAlone = bennyDealerShouldGoAlone(spot.hand, spot.trump);
    const bestAlone = ma > mp;
    // Skip hands where both choices are about as good: every answer would be right.
    const clear = gap > Math.max(CLOSE, margin);
    console.error(`${key} ${spot.hand.map(cardId).join(' ')} (${spot.trump}, discard ${cardId(spot.discard)}): partner ${mp.toFixed(2)} alone ${ma.toFixed(2)} ±${margin.toFixed(2)}${clear ? '' : ' (too close, skipped)'} ${((performance.now() - started) / 1000).toFixed(0)}s`);
    if (!clear) continue;
    // Starter: clear-cut hands that follow the guide's rule, one per shape. Seasoned: hands near
    // the line. Other clear-cut hands would only repeat a shape, so they're left out.
    const starter = guideAlone === bestAlone && gap >= 1.25;
    if (starter && starterShapes.has(key)) continue;
    if (starter) starterShapes.add(key);
    questions.push({
      id: `benny-${key.replace(/\|/g, '')}-${id}`,
      level: starter ? 'beginner' : 'seasoned',
      dealer: DEALER,
      seat: DEALER,
      phase: 'bennyAlone',
      trump: spot.trump,
      discard: cardId(spot.discard),
      hand: spot.hand.map(cardId),
      upcard: 'BENNY',
      history: [{ seat: DEALER, action: { type: 'name', suit: spot.trump, alone: false } }],
      options: [
        { action: { type: 'pass' }, mean: Number(mp.toFixed(3)), margin: bestAlone ? Number(margin.toFixed(3)) : 0 },
        { action: { type: 'goAlone' }, mean: Number(ma.toFixed(3)), margin: bestAlone ? 0 : Number(margin.toFixed(3)) },
      ],
      guide: guideAlone ? { type: 'goAlone' } : { type: 'pass' },
      samples: SAMPLES,
    });
  }
}
writeFileSync(OUT, JSON.stringify(questions, null, 1) + '\n');
console.log(`${questions.length} questions written to ${OUT}`);
