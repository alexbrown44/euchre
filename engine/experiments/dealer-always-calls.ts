// Theory to test: "If the opposition is in the hole (needs 1), the dealer should always call."
//
// Part 1, decision by decision: opponents on 9, our team on 0-8, our player deals. When the call
// reaches the dealer (round one, and round two if everyone passed), play the hand out both ways:
// call (pick up / name the strongest suit, not alone) or pass. Compare the chance of winning the
// game afterwards (win-chance table from experiments/win-chance.ts), grouped by the dealer's trumps.
//
// Part 2, as a whole policy: start games at (us 0-8, them 9) with our team dealing first. Our dealer
// either ALWAYS calls while the opponents need 1, or plays normally. Same deals both ways.
//
// Usage: node experiments/dealer-always-calls.ts [decisionDeals=300000] [gamesPerScore=4000]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SUITS, type Suit } from '../src/cards.ts';
import { dealHand, leftOf, teamOf, type Seat, type Team } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, playGame, type Agent, type Score } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { bestAfterPickup, features, strength } from '../src/bots/evaluate.ts';

const TARGET = 10;
const DEALS = Number(process.argv[2] ?? 300_000);
const GAMES = Number(process.argv[3] ?? 4000);
const table = JSON.parse(readFileSync(`results/win-chance-${TARGET}.json`, 'utf8')) as { win: number[][][] };
const winChance = (score: Score, team: Team, nextDealer: Seat): number => {
  const us = score[team], them = score[1 - team]!;
  if (us >= TARGET) return 1;
  if (them >= TARGET) return 0;
  return table.win[us]![them]![teamOf(nextDealer) === team ? 1 : 0]!;
};
const bot = ruleBot(LEAGUE_RULE_PARAMS);
const strongestSuit = (hand: Parameters<typeof strength>[0], banned: Suit): Suit =>
  SUITS.filter((s) => s !== banned).reduce((a, b) => (strength(hand, b) > strength(hand, a) ? b : a));

// ---------------------------------------------------------------------------
// Part 1

interface Stat { n: number; pass: number; call: number; dSq: number }
const part1 = new Map<string, Stat>();
const rng = createRng(5_000_000);
for (let i = 0; i < DEALS; i++) {
  const dealer = (i % 2 === 0 ? 0 : 2) as Seat; // our team (0) deals
  const deal = dealHand(dealer, rng);
  if (deal.upcard.kind !== 'suited') continue;
  const score: Score = [Math.floor(rng() * 9), 9];
  const agents = [bot, bot, bot, bot];
  const value = (s: BiddingState) => winChance(finishHand(s, agents, score, TARGET).scoreAfter, 0, leftOf(dealer));
  let state = startBidding(deal);
  while ((state.phase === 'round1' || state.phase === 'round2') && state.turn !== null) {
    if (state.turn === dealer) {
      const up = deal.upcard;
      let call: BidAction, trumps: number;
      if (state.phase === 'round1') {
        call = { type: 'orderUp', alone: false };
        trumps = features(bestAfterPickup(deal.hands[dealer]!, up, up.suit), up.suit).trumps;
      } else {
        const suit = strongestSuit(deal.hands[dealer]!, up.suit);
        call = { type: 'name', suit, alone: false };
        trumps = features(deal.hands[dealer]!, suit).trumps;
      }
      const p = value(applyBidAction(state, { type: 'pass' }));
      const c = value(applyBidAction(state, call));
      const key = `${state.phase === 'round1' ? 'Round one (pick up)' : 'Round two (name strongest suit)'}|${Math.min(trumps, 4)}`;
      const s = part1.get(key) ?? { n: 0, pass: 0, call: 0, dSq: 0 };
      s.n++; s.pass += p; s.call += c; s.dSq += (c - p) ** 2;
      part1.set(key, s);
    }
    state = applyBidAction(state, bot.bid(bidView(state, state.turn!, score, TARGET)));
  }
}

// ---------------------------------------------------------------------------
// Part 2

/** Our dealer always calls while the opponents need exactly 1 and we don't. */
function alwaysCallDealer(base: Agent): Agent {
  return {
    name: 'Dealer always calls',
    play: (v) => base.play(v),
    bid: (v) => {
      const us = teamOf(v.seat);
      const theyNeed1 = v.score[1 - us] === TARGET - 1 && v.score[us] < TARGET - 1;
      if (v.seat === v.dealer && theyNeed1 && v.upcard.kind === 'suited') {
        if (v.phase === 'round1') return { type: 'orderUp', alone: false };
        if (v.phase === 'round2') return { type: 'name', suit: strongestSuit(v.hand, v.upcard.suit), alone: false };
      }
      return base.bid(v);
    },
  };
}

const theory = alwaysCallDealer(bot);
const part2: { us: number; normal: number; always: number }[] = [];
for (let us = 0; us <= 8; us++) {
  let normal = 0, always = 0;
  for (let g = 0; g < GAMES; g++) {
    const firstDealer = (g % 2 === 0 ? 0 : 2) as Seat;
    const opts = { target: TARGET, firstDealer, startScore: [us, 9] as Score };
    if (playGame({ ...opts, agents: [bot, bot, bot, bot], rng: createRng(6_000_000 + 10_000 * us + g) }).winner === 0) normal++;
    if (playGame({ ...opts, agents: [theory, bot, theory, bot], rng: createRng(6_000_000 + 10_000 * us + g) }).winner === 0) always++;
  }
  part2.push({ us, normal: normal / GAMES, always: always / GAMES });
}

// ---------------------------------------------------------------------------
// Report

const pp = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}`;
let out = `# Theory: when the opposition needs 1, the dealer should always call\n\n`;
out += `## Part 1: each dealer decision (opponents on 9, us on 0-8)\n\n`;
out += `Change in our **chance of winning the game** from calling instead of passing, in percentage points. Bold = outside noise.\n\n`;
out += `| Decision | Dealer's trumps | Hands | Win chance if pass | Win chance if call | **Gain from calling** |\n|---|---:|---:|---:|---:|---:|\n`;
for (const [k, s] of [...part1.entries()].sort()) {
  const [phase, t] = k.split('|');
  if (s.n < 200) continue;
  const gain = (s.call - s.pass) / s.n;
  const se = Math.sqrt(Math.max(0, s.dSq / s.n - gain * gain) / s.n);
  const g = Math.abs(gain) > 2 * se ? `**${pp(gain)}**` : pp(gain);
  out += `| ${phase} | ${t === '4' ? '4+' : t} | ${s.n.toLocaleString()} | ${(100 * s.pass / s.n).toFixed(1)}% | ${(100 * s.call / s.n).toFixed(1)}% | ${g} |\n`;
}
out += `\n## Part 2: the whole policy, from each score (us X, them 9, we deal first)\n\n`;
out += `${GAMES.toLocaleString()} games per score, same deals both ways.\n\n| Our score | Win chance, normal play | Win chance, dealer always calls | Difference |\n|---:|---:|---:|---:|\n`;
for (const r of part2) out += `| ${r.us} | ${(100 * r.normal).toFixed(1)}% | ${(100 * r.always).toFixed(1)}% | ${pp(r.always - r.normal)} |\n`;
const avgN = part2.reduce((a, r) => a + r.normal, 0) / part2.length;
const avgA = part2.reduce((a, r) => a + r.always, 0) / part2.length;
out += `| **Average** | ${(100 * avgN).toFixed(1)}% | ${(100 * avgA).toFixed(1)}% | **${pp(avgA - avgN)}** |\n`;
mkdirSync('results', { recursive: true });
writeFileSync('results/dealer-always-calls.md', out);
console.log(out);
