// Experiment: should you call differently depending on the score?
//
// Near the end of a game, points don't matter, winning the game does. So every choice is judged
// by the deciding team's CHANCE OF WINNING THE GAME after the hand, using the win-chance table
// from experiments/win-chance.ts (run that first).
//
// Each deal is given a score situation (relative to the deciding player's team):
//   Neither close (both on 0-7), We need 2 (on 8), We need 1 (on 9), They need 1, Both need 1 (9-9).
// At every calling decision (round one: pass / order up / alone; round two: pass / name your
// strongest suit / name it alone) the hand is played out every way from that point, and the
// win chance after each outcome is compared.
//
// Usage:
//   node experiments/score-aware.ts run [deals=100000] [firstDeal=0]   -> results/score-aware-from<N>.json
//   node experiments/score-aware.ts combine results/score-aware-from*.json  -> report

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SUITS, type Suit } from '../src/cards.ts';
import { dealHand, leftOf, partnerOf, teamOf, type Seat, type Team } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type Score } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { bestAfterPickup, features, strength } from '../src/bots/evaluate.ts';

const TARGET = 10;
type Situation = 'Neither close' | 'We need 2' | 'We need 1' | 'They need 1' | 'Both need 1';
const SITUATIONS: Situation[] = ['Neither close', 'We need 2', 'We need 1', 'They need 1', 'Both need 1'];
type Role = 'Left of dealer' | "Dealer's partner" | 'Right of dealer' | 'Dealer';
const ROLES: Role[] = ['Left of dealer', "Dealer's partner", 'Right of dealer', 'Dealer'];
type Opt = 'pass' | 'call' | 'alone';

interface Stat { n: number; sum: Record<Opt, number>; dCall: number; dCallSq: number; dAlone: number; dAloneSq: number }
type Tables = Record<string, Record<string, Stat>>;

function roleOf(seat: Seat, dealer: Seat): Role {
  if (seat === dealer) return 'Dealer';
  if (seat === partnerOf(dealer)) return "Dealer's partner";
  return leftOf(dealer) === seat ? 'Left of dealer' : 'Right of dealer';
}

// ---------------------------------------------------------------------------

function run(deals: number, first: number): void {
  const table = JSON.parse(readFileSync(`results/win-chance-${TARGET}.json`, 'utf8')) as { win: number[][][] };
  /** Chance that `team` wins, given the score after a hand and who deals next. */
  const winChance = (score: Score, team: Team, nextDealer: Seat): number => {
    const us = score[team];
    const them = score[1 - team]!;
    if (us >= TARGET) return 1;
    if (them >= TARGET) return 0;
    return table.win[us]![them]![teamOf(nextDealer) === team ? 1 : 0]!;
  };

  const bot = ruleBot(LEAGUE_RULE_PARAMS);
  const agents = [bot, bot, bot, bot];
  const rng = createRng(4_000_000 + first);
  const tables: Tables = {};
  const add = (t: string, key: string, v: Record<Opt, number>) => {
    tables[t] ??= {};
    const s = (tables[t]![key] ??= { n: 0, sum: { pass: 0, call: 0, alone: 0 }, dCall: 0, dCallSq: 0, dAlone: 0, dAloneSq: 0 });
    s.n++;
    for (const o of ['pass', 'call', 'alone'] as Opt[]) s.sum[o] += v[o];
    s.dCall += v.call - v.pass;
    s.dCallSq += (v.call - v.pass) ** 2;
    s.dAlone += v.alone - v.call;
    s.dAloneSq += (v.alone - v.call) ** 2;
  };
  const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    const deal = dealHand(dealer, rng);
    // Pick a situation for team 0; team 1 sees it mirrored.
    const sit0 = SITUATIONS[i % SITUATIONS.length]!;
    let s0: [number, number];
    switch (sit0) {
      case 'Neither close': s0 = [randInt(0, 7), randInt(0, 7)]; break;
      case 'We need 2': s0 = [8, randInt(0, 8)]; break;
      case 'We need 1': s0 = [9, randInt(0, 8)]; break;
      case 'They need 1': s0 = [randInt(0, 8), 9]; break;
      case 'Both need 1': s0 = [9, 9]; break;
    }
    const score: Score = s0;
    const situationFor = (team: Team): Situation | null => {
      const us = score[team], them = score[1 - team]!;
      if (us === 9 && them === 9) return 'Both need 1';
      if (us === 9) return 'We need 1';
      if (them === 9) return 'They need 1';
      if (us === 8 && them <= 8) return 'We need 2';
      if (us <= 7 && them <= 7) return 'Neither close';
      return null; // e.g. they need 2: not studied
    };

    const value = (state: BiddingState, seat: Seat): number => {
      const h = finishHand(state, agents, score, TARGET);
      return winChance(h.scoreAfter, teamOf(seat), leftOf(dealer));
    };

    let state = startBidding(deal);
    while (state.phase === 'round1' || state.phase === 'round2') {
      const seat = state.turn!;
      const sit = situationFor(teamOf(seat));
      if (sit && deal.upcard.kind === 'suited') {
        const role = roleOf(seat, dealer);
        if (state.phase === 'round1') {
          const trump = deal.upcard.suit;
          const hand = role === 'Dealer' ? bestAfterPickup(deal.hands[seat]!, deal.upcard, trump) : deal.hands[seat]!;
          const pass = value(applyBidAction(state, { type: 'pass' }), seat);
          const alone = value(applyBidAction(state, { type: 'orderUp', alone: true }), seat);
          // The dealer's partner can only order up alone (Up and Down).
          const call = role === "Dealer's partner" ? alone : value(applyBidAction(state, { type: 'orderUp', alone: false }), seat);
          const f = features(hand, trump);
          add('r1', `${sit}|${role}|${Math.min(f.trumps, 4)}`, { pass, call, alone });
          add('r1s', `${sit}|${role}|${Math.min(13, Math.floor(strength(hand, trump)))}`, { pass, call, alone });
        } else {
          const banned = deal.upcard.suit;
          const hand = deal.hands[seat]!;
          const best = SUITS.filter((s) => s !== banned).reduce((a: Suit, b: Suit) => (strength(hand, b) > strength(hand, a) ? b : a), SUITS.find((s) => s !== banned)!);
          const pass = value(applyBidAction(state, { type: 'pass' }), seat);
          const call = value(applyBidAction(state, { type: 'name', suit: best, alone: false }), seat);
          const alone = value(applyBidAction(state, { type: 'name', suit: best, alone: true }), seat);
          add('r2', `${sit}|${role}|${Math.min(features(hand, best).trumps, 4)}`, { pass, call, alone });
        }
      }
      state = applyBidAction(state, bot.bid(bidView(state, seat, score, TARGET)));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/score-aware-from${first}.json`, JSON.stringify(tables));
}

// ---------------------------------------------------------------------------

function combine(files: string[]): void {
  const all: Tables = {};
  for (const f of files) {
    const t = JSON.parse(readFileSync(f, 'utf8')) as Tables;
    for (const [name, rows] of Object.entries(t)) {
      all[name] ??= {};
      for (const [k, s] of Object.entries(rows)) {
        const a = (all[name]![k] ??= { n: 0, sum: { pass: 0, call: 0, alone: 0 }, dCall: 0, dCallSq: 0, dAlone: 0, dAloneSq: 0 });
        a.n += s.n;
        for (const o of ['pass', 'call', 'alone'] as Opt[]) a.sum[o] += s.sum[o];
        a.dCall += s.dCall; a.dCallSq += s.dCallSq; a.dAlone += s.dAlone; a.dAloneSq += s.dAloneSq;
      }
    }
  }
  const pp = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}`;
  const sig = (sum: number, sq: number, n: number) => {
    const m = sum / n;
    const se = Math.sqrt(Math.max(0, sq / n - m * m) / n);
    return Math.abs(m) > 2 * se;
  };
  const cell = (sum: number, sq: number, n: number) => (sig(sum, sq, n) ? `**${pp(sum / n)}**` : `${pp(sum / n)}`);

  let out = `# Experiment: score-aware calling (game to ${TARGET})\n\n`;
  out += `Numbers are changes in the deciding team's **chance of winning the game**, in percentage points. `;
  out += `"Call vs pass" = gain from ordering up / picking up / naming (not alone) instead of passing. `;
  out += `"Alone vs call" = gain from going alone instead of keeping partner. Bold = outside statistical noise.\n`;
  for (const [name, title] of [['r1', 'Round one, by trumps (dealer: after picking up)'], ['r2', 'Round two, strongest suit, by trumps in it']] as const) {
    out += `\n## ${title}\n`;
    for (const role of ROLES) {
      const partner = role === "Dealer's partner" && name === 'r1';
      out += `\n### ${role}\n\n| Trumps | ${SITUATIONS.map((s) => `${s}: ${partner ? 'Up and Down vs pass' : 'call vs pass'}${partner ? '' : ' / alone vs call'}`).join(' | ')} |\n`;
      out += `|---|${SITUATIONS.map(() => '---').join('|')}|\n`;
      for (const t of [0, 1, 2, 3, 4]) {
        const cells = SITUATIONS.map((sit) => {
          const s = all[name]?.[`${sit}|${role}|${t}`];
          if (!s || s.n < 200) return '';
          return partner ? cell(s.dCall, s.dCallSq, s.n) : `${cell(s.dCall, s.dCallSq, s.n)} / ${cell(s.dAlone, s.dAloneSq, s.n)}`;
        });
        if (cells.some(Boolean)) out += `| ${t === 4 ? '4+' : t} | ${cells.join(' | ')} |\n`;
      }
    }
  }

  // Thresholds by strength: the lowest strength from which calling beats passing.
  out += `\n## Round one: lowest bot strength score at which calling beats passing\n\n| Role | ${SITUATIONS.join(' | ')} |\n|---|${SITUATIONS.map(() => '---').join('|')}|\n`;
  for (const role of ROLES) {
    const cells = SITUATIONS.map((sit) => {
      for (let st = 0; st <= 13; st++) {
        const s = all.r1s?.[`${sit}|${role}|${st}`];
        if (s && s.n >= 200 && s.dCall / s.n > 0) return String(st);
      }
      return '-';
    });
    out += `| ${role} | ${cells.join(' | ')} |\n`;
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/score-aware.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 100_000), Number(process.argv[4] ?? 0));
