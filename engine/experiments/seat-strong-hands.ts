// Experiment: does where you sit change what to do with a strong hand in round one?
//
// League theory: with the Benny, Right and Left on the dealer's LEFT you can pass, because if the
// dealer doesn't pick up you have first call in round two. On the dealer's RIGHT you should order
// up, otherwise in round two your partner or the dealer's partner may call another suit.
//
// Strong hands (in the upcard's suit) held by the player on the dealer's left or right are played
// out three ways from their round-one turn: pass, order up, order up alone. Card play is Monte
// Carlo for all four players; bidding by league-calibrated bots. For "pass", what happens next is
// recorded: dealer picks up, someone else orders up, round two (who names, which colour), thrown in.
//
// Usage:
//   node experiments/seat-strong-hands.ts run [deals=200000] [firstDeal=0] [worlds=20]
//   node experiments/seat-strong-hands.ts combine results/seat-strong-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { colourOf, isTrump, trumpRank } from '../src/cards.ts';
import { dealHand, leftOf, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type HandRecord } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';

type Opt = 'pass' | 'order' | 'alone';
const ACTIONS: Record<Opt, BidAction> = {
  pass: { type: 'pass' },
  order: { type: 'orderUp', alone: false },
  alone: { type: 'orderUp', alone: true },
};

interface Group { n: number; sum: Record<Opt, number>; sq: Record<Opt, number>; after: Record<string, { n: number; net: number }> }
type Results = Record<string, Group>;
const newGroup = (): Group => ({ n: 0, sum: { pass: 0, order: 0, alone: 0 }, sq: { pass: 0, order: 0, alone: 0 }, after: {} });

/** Which hand class a hand falls in (in the upcard's suit), or null if not strong. */
function handClass(hand: Parameters<typeof isTrump>[0][], trump: Parameters<typeof isTrump>[1]): string | null {
  const trumps = hand.filter((c) => isTrump(c, trump));
  const ranks = trumps.map((c) => trumpRank(c, trump));
  const tops = ranks.filter((r) => r >= 6).length;
  if (ranks.includes(8) && ranks.includes(7) && ranks.includes(6)) return 'Benny + Right + Left';
  if (trumps.length >= 4) return '4+ trumps';
  if (trumps.length === 3 && tops >= 2) return '3 trumps, 2 top trumps';
  return null; // weaker hands: covered by Finding 1 (pass from either seat)
}

/** What happened after the decider passed in round one, from their point of view. */
function whatHappened(h: HandRecord, me: Seat): string {
  const call = h.bidding.find((e) => e.action.type === 'orderUp' || e.action.type === 'name');
  if (!call) return 'Thrown in';
  const who = call.seat === me ? 'I' : call.seat === partnerOf(me) ? 'Partner' : 'Opponent';
  if (call.phase === 'round1') return call.seat === h.dealer ? `Round 1: dealer picked up (${who === 'Partner' ? 'partner' : 'opponent'})` : `Round 1: ${who.toLowerCase()} ordered up`;
  if (call.phase === 'bennyCall') return 'Benny turned up';
  const up = h.deal.upcard;
  const named = call.action.type === 'name' ? call.action.suit : null;
  const colour = up.kind === 'suited' && named ? (colourOf(named) === colourOf(up.suit) ? 'same colour' : 'opposite colour') : '';
  return `Round 2: ${who === 'I' ? 'I' : who.toLowerCase()} named (${colour})`;
}

function run(deals: number, first: number, worlds: number): void {
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });
  const results: Results = {};
  const rng = createRng(8_000_000 + first);
  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    const deal = dealHand(dealer, rng);
    if (deal.upcard.kind !== 'suited') continue;
    const trump = deal.upcard.suit;
    const left = leftOf(dealer);
    const right = partnerOf(left);
    let state: BiddingState = startBidding(deal);
    while (state.phase === 'round1') {
      const seat = state.turn!;
      const cls = (seat === left || seat === right) ? handClass(deal.hands[seat]!, trump) : null;
      if (cls) {
        const seatName = seat === left ? 'Left of dealer' : 'Right of dealer';
        const key = `${seatName}|${cls}`;
        const g = (results[key] ??= newGroup());
        g.n++;
        const vals = {} as Record<Opt, number>;
        for (const o of ['pass', 'order', 'alone'] as Opt[]) {
          const agents = [0, 1, 2, 3].map((k) => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: i * 8 + k }));
          const h = finishHand(applyBidAction(state, ACTIONS[o]), agents, [0, 0], 10);
          const net = !h.result ? 0 : h.result.team === teamOf(seat) ? h.result.points : -h.result.points;
          vals[o] = net;
          if (o === 'pass') {
            const what = whatHappened(h, seat);
            const a = (g.after[what] ??= { n: 0, net: 0 });
            a.n++;
            a.net += net;
          }
        }
        for (const o of ['pass', 'order', 'alone'] as Opt[]) {
          g.sum[o] += vals[o];
          g.sq[o] += (vals[o] - vals.pass) ** 2; // spread of the difference from passing
        }
      }
      state = applyBidAction(state, bidder.bid(bidView(state, seat, [0, 0], 10)));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/seat-strong-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, g] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= newGroup());
      a.n += g.n;
      for (const o of ['pass', 'order', 'alone'] as Opt[]) { a.sum[o] += g.sum[o]; a.sq[o] += g.sq[o]; }
      for (const [w, x] of Object.entries(g.after)) { const b = (a.after[w] ??= { n: 0, net: 0 }); b.n += x.n; b.net += x.net; }
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const classes = ['Benny + Right + Left', '4+ trumps', '3 trumps, 2 top trumps'];
  let out = `# Experiment: strong hands, dealer's left vs right (Monte Carlo card play)\n\n`;
  out += `Average **net points per hand** for the player's team. Gains are compared with passing on the same hand; bold = outside noise.\n\n`;
  out += `| Hand (in the upcard's suit) | Seat | Hands | Pass | Order up | Alone | Order up vs pass | Alone vs pass | Best |\n|---|---|---:|---:|---:|---:|---:|---:|---|\n`;
  for (const cls of classes) {
    for (const seat of ['Left of dealer', 'Right of dealer']) {
      const g = all[`${seat}|${cls}`];
      if (!g || g.n < 100) continue;
      const avg = (o: Opt) => g.sum[o] / g.n;
      const gain = (o: Opt) => {
        const m = avg(o) - avg('pass');
        const se = Math.sqrt(Math.max(0, g.sq[o] / g.n - m * m) / g.n);
        return Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m);
      };
      const best = (['pass', 'order', 'alone'] as Opt[]).reduce((a, b) => (avg(b) > avg(a) ? b : a));
      out += `| ${cls} | ${seat} | ${g.n.toLocaleString()} | ${fmt(avg('pass'))} | ${fmt(avg('order'))} | ${fmt(avg('alone'))} | ${gain('order')} | ${gain('alone')} | ${{ pass: 'Pass', order: 'Order up', alone: 'Go alone' }[best]} |\n`;
    }
  }
  out += `\n## When you pass: what happens next\n`;
  for (const cls of classes) {
    for (const seat of ['Left of dealer', 'Right of dealer']) {
      const g = all[`${seat}|${cls}`];
      if (!g || g.n < 100) continue;
      out += `\n**${cls}, ${seat}**\n\n| After you pass | How often | Avg net points |\n|---|---:|---:|\n`;
      for (const [w, x] of Object.entries(g.after).sort((a, b) => b[1].n - a[1].n)) {
        out += `| ${w} | ${((100 * x.n) / g.n).toFixed(0)}% | ${fmt(x.net / x.n)} |\n`;
      }
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/seat-strong-hands.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 200_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
