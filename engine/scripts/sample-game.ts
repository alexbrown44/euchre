// Play a game with random (legal but clueless) players and print it, so a human can
// check the rules of play and scoring. Bots with real strategy come next.
// Usage: node scripts/sample-game.ts [seed=11] [target=10] [handsToShowInFull=2]

import { SUIT_NAME, cardLabel, sortHand } from '../src/cards.ts';
import { SEATS, type Seat } from '../src/deal.ts';
import { applyBidAction, describeBidTurn, startBidding } from '../src/bidding.ts';
import { playGame, randomAgent, type HandRecord } from '../src/game.ts';
import { teamName } from '../src/play.ts';
import { OUTCOME_TEXT } from '../src/scoring.ts';
import { createRng } from '../src/rng.ts';

const NAME: Record<Seat, string> = { 0: 'South', 1: 'West', 2: 'North', 3: 'East' };
const seed = Number(process.argv[2] ?? 11);
const target = Number(process.argv[3] ?? 10);
const showFull = Number(process.argv[4] ?? 2);

const rng = createRng(seed);
const agents = SEATS.map((s) => randomAgent(rng, NAME[s]));
const game = playGame({ agents, target, rng });

function printFull(h: HandRecord, n: number): void {
  console.log(`=== Hand ${n}: ${NAME[h.dealer]} deals. Upcard ${cardLabel(h.deal.upcard)} ===`);
  for (const s of SEATS) console.log(`  ${NAME[s].padEnd(6)} ${sortHand(h.deal.hands[s]!, null).map(cardLabel).join('  ')}`);
  console.log('  Bidding:');
  // Replay the call so each line can say exactly what happened ("defends alone", "takes over the loner"...).
  let state = startBidding(h.deal);
  for (const e of h.bidding) {
    const text = describeBidTurn(state, e.action);
    console.log(`    ${NAME[e.seat].padEnd(6)} ${text}${e.phase === 'afterCall' ? ' (after the call)' : e.phase === 'round2' ? ' (round two)' : ''}`);
    state = applyBidAction(state, e.action);
  }
  if (!h.contract) {
    console.log('  Everyone passed twice: thrown in.\n');
    return;
  }
  const c = h.contract;
  const out = c.sittingOut.map((s) => NAME[s]).join(' and ');
  console.log(`  ${SUIT_NAME[c.trump]} are trump. Makers: ${teamName(c.makerTeam)}${out ? `. Sitting out: ${out}` : ''}.`);
  h.tricks.forEach((t, i) => {
    const cards = t.plays.map((p) => `${NAME[p.seat]} ${cardLabel(p.card)}`).join(', ');
    console.log(`  Trick ${i + 1}: ${cards}  -> ${NAME[t.winner!]} wins`);
  });
  const r = h.result!;
  console.log(`  Makers took ${h.makerTricks}: ${OUTCOME_TEXT[r.outcome]}. ${teamName(r.team)} +${r.points}.`);
  console.log(`  Score: North/South ${h.scoreAfter[0]}, East/West ${h.scoreAfter[1]}\n`);
}

console.log(`Random players, game to ${target}, seed ${seed}. ${NAME[game.firstDealer]} got the first Jack and deals first.\n`);
game.hands.slice(0, showFull).forEach((h, i) => printFull(h, i + 1));

console.log('=== Every hand in the game ===');
game.hands.forEach((h, i) => {
  const n = String(i + 1).padStart(2);
  if (!h.contract) {
    console.log(`  ${n}. ${NAME[h.dealer].padEnd(5)} deals: thrown in`);
    return;
  }
  const c = h.contract;
  const how = [
    c.makerLoner !== null ? `${NAME[c.makerLoner]} alone` : '',
    c.loneDefender !== null ? `${NAME[c.loneDefender]} defends alone` : '',
  ].filter(Boolean).join(', ');
  const r = h.result!;
  console.log(`  ${n}. ${NAME[h.dealer].padEnd(5)} deals: ${SUIT_NAME[c.trump].padEnd(8)} by ${NAME[c.maker].padEnd(5)}${how ? ` (${how})` : ''}, makers took ${h.makerTricks}: ${OUTCOME_TEXT[r.outcome]}, ${teamName(r.team)} +${r.points}  [${h.scoreAfter[0]}-${h.scoreAfter[1]}]`);
});
console.log(`\n${teamName(game.winner)} win ${game.score[game.winner]}-${game.score[1 - game.winner]}.`);
