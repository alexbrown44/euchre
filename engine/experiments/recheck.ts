// Experiment: recheck Findings 1-3 with Monte Carlo card play.
//
// Findings 1-3 were measured with rule-bot card play, the bots' main weakness. Here the same
// decisions are played out every way from the same position, with Monte Carlo card play for all
// four players (bidding by league-calibrated bots):
//
//  Round 1 (Finding 1): the dealer (pass / pick up / alone, trumps counted after the pick-up);
//    the dealer's partner (pass / Up and Down); left and right of dealer with 3+ trumps
//    (pass / order up / alone).
//  Round 2 (Finding 2): the dealing team (dealer's partner, then dealer): each suit with 2+ trumps,
//    named with partner, against passing. Grouped as next (same colour) or opposite colour.
//  After the call (Finding 3): pass or "Drop" (go alone) for every after-call turn where it's
//    allowed and the player has 2+ trumps.
//
// Usage:
//   node experiments/recheck.ts run [deals=8000] [firstDeal=0] [worlds=20]
//   node experiments/recheck.ts combine results/recheck-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isTrump, sameColourSuit, SUITS, trumpRank, type Card, type Suit } from '../src/cards.ts';
import { dealHand, leftOf, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type Agent } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { bestAfterPickup } from '../src/bots/evaluate.ts';

interface Stat { n: number; sum: Record<string, number>; sq: Record<string, number> }
type Results = Record<string, Stat>; // key = part|situation|hand

function shape(hand: readonly Card[], trump: Suit): string {
  const t = hand.filter((c) => isTrump(c, trump));
  const tops = t.filter((c) => trumpRank(c, trump) >= 6).length;
  return `${t.length >= 4 ? '4+' : t.length} trumps, ${tops >= 2 ? '2+ top trumps' : tops === 1 ? '1 top trump' : 'no top trump'}`;
}

function run(deals: number, first: number, worlds: number): void {
  const results: Results = {};
  const add = (key: string, vals: Record<string, number>) => {
    const st = (results[key] ??= { n: 0, sum: {}, sq: {} });
    st.n++;
    for (const [o, v] of Object.entries(vals)) {
      st.sum[o] = (st.sum[o] ?? 0) + v;
      st.sq[o] = (st.sq[o] ?? 0) + (v - vals.Pass!) ** 2;
    }
  };
  const rng = createRng(13_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    const deal = dealHand(dealer, rng);
    const up = deal.upcard;
    const branch = (state: BiddingState, action: BidAction, seat: Seat): number => {
      const h = finishHand(applyBidAction(state, action), players(), [0, 0], 10);
      return !h.result ? 0 : h.result.team === teamOf(seat) ? h.result.points : -h.result.points;
    };
    const opts = (state: BiddingState, seat: Seat, actions: Record<string, BidAction>) =>
      Object.fromEntries(Object.entries(actions).map(([k, a]) => [k, branch(state, a, seat)]));
    const pass: BidAction = { type: 'pass' };

    let b = startBidding(deal);
    while (b.turn !== null) {
      const seat = b.turn;
      const hand = b.hands[seat]!;

      if (b.phase === 'round1' && up.kind === 'suited') {
        const trump = up.suit;
        if (seat === dealer) {
          const after = bestAfterPickup(hand, up, trump);
          if (after.filter((c) => isTrump(c, trump)).length >= 2) {
            add(`Round 1|Dealer|${shape(after, trump)}`, opts(b, seat, { Pass: pass, Call: { type: 'orderUp', alone: false }, Alone: { type: 'orderUp', alone: true } }));
          }
        } else if (seat === partnerOf(dealer)) {
          if (hand.filter((c) => isTrump(c, trump)).length >= 2) {
            add(`Round 1|Dealer's partner (Up and Down)|${shape(hand, trump)}`, opts(b, seat, { Pass: pass, Alone: { type: 'orderUp', alone: true } }));
          }
        } else if (hand.filter((c) => isTrump(c, trump)).length >= 3) {
          add(`Round 1|${seat === leftOf(dealer) ? 'Left' : 'Right'} of dealer|${shape(hand, trump)}`, opts(b, seat, { Pass: pass, Call: { type: 'orderUp', alone: false }, Alone: { type: 'orderUp', alone: true } }));
        }
      }

      if (b.phase === 'round2' && up.kind === 'suited' && teamOf(seat) === teamOf(dealer)) {
        const who = seat === dealer ? 'Dealer' : "Dealer's partner";
        const suits = SUITS.filter((s) => s !== up.suit && hand.filter((c) => isTrump(c, s)).length >= 2);
        if (suits.length) {
          const p = branch(b, pass, seat);
          for (const s of suits) {
            const rel = s === sameColourSuit(up.suit) ? 'next' : 'opposite colour';
            add(`Round 2|${who}, ${rel}|${shape(hand, s)}`, { Pass: p, Call: branch(b, { type: 'name', suit: s, alone: false }, seat) });
          }
        }
      }

      if (b.phase === 'afterCall' && b.trump && b.maker !== null) {
        const legal = b.makerLoner !== null || b.loneDefender !== null || teamOf(seat) !== teamOf(b.maker);
        const trump = b.trump;
        // A dealer who will pick up is judged on the hand after picking up.
        const myHand = seat === dealer && b.dealerPicksUp && up.kind === 'suited' ? bestAfterPickup(hand, up, trump) : hand;
        if (legal && myHand.filter((c) => isTrump(c, trump)).length >= 2) {
          const onMakers = teamOf(seat) === teamOf(b.maker);
          let sit: string;
          if (onMakers) sit = b.makerLoner !== null
            ? (seat === dealer && b.makerLoner === partnerOf(dealer) && b.history.some((e) => e.phase === 'round1' && e.action.type === 'orderUp') ? 'Dealer takes over Up and Down' : "Take over partner's loner")
            : 'Answer a lone defender';
          else sit = b.loneDefender !== null ? "Take over partner's lone defence" : b.makerLoner !== null ? 'Defend alone against a loner' : 'Defend alone against two makers';
          add(`After the call|${sit}|${shape(myHand, trump)}`, opts(b, seat, { Pass: pass, Alone: { type: 'goAlone' } }));
        }
      }

      b = applyBidAction(b, bidder.bid(bidView(b, seat, [0, 0], 10)));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/recheck-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: {}, sq: {} });
      a.n += s.n;
      for (const o of Object.keys(s.sum)) { a.sum[o] = (a.sum[o] ?? 0) + s.sum[o]!; a.sq[o] = (a.sq[o] ?? 0) + s.sq[o]!; }
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const gain = (s: Stat, o: string) => {
    if (s.sum[o] === undefined) return '';
    const m = (s.sum[o]! - s.sum.Pass!) / s.n;
    const se = Math.sqrt(Math.max(0, s.sq[o]! / s.n - m * m) / s.n);
    return Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m);
  };
  let out = `# Experiment: Findings 1-3 rechecked with Monte Carlo card play\n\nAverage **net points per hand** for the player's team when passing, and the gain of each option over passing on the same hand. Bold = outside noise (2 standard errors).\n`;
  for (const part of ['Round 1', 'Round 2', 'After the call']) {
    out += `\n## ${part}\n\n| Situation | Hand | Hands | Pass | Call vs pass | Alone vs pass | Best |\n|---|---|---:|---:|---:|---:|---|\n`;
    const keys = Object.keys(all).filter((k) => k.startsWith(part + '|')).sort();
    for (const k of keys) {
      const s = all[k]!;
      if (s.n < 100) continue;
      const [, sit, hand] = k.split('|');
      const best = Object.keys(s.sum).reduce((a, o) => (s.sum[o]! > s.sum[a]! ? o : a), 'Pass');
      out += `| ${sit} | ${hand} | ${s.n.toLocaleString()} | ${fmt(s.sum.Pass! / s.n)} | ${gain(s, 'Call')} | ${gain(s, 'Alone')} | ${best} |\n`;
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/recheck.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 8_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
