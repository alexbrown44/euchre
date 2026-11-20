// Experiment: round two for the non-dealing team. Finding 2 says "make next"; Finding 9 says the
// player on the dealer's left should pass in round two with only 2 trumps in their best suit.
// Which wins when the 2 trumps are in next?
//
// At round-two turns of the dealer's left (speaks first) and right (speaks third), every suit the
// player could name with 2+ trumps is played out against passing, from the same position. Results
// are grouped by the suit's relation to the turned-down card (next = same colour), the trumps and
// top trumps held in it, and whether the player holds an off-suit Ace.
//
// Card play is Monte Carlo for all four players; bidding by league-calibrated bots.
//
// Usage:
//   node experiments/next-two.ts run [deals=10000] [firstDeal=0] [worlds=20]
//   node experiments/next-two.ts combine results/next-two-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isTrump, sameColourSuit, SUITS, trumpRank, type Card, type Suit } from '../src/cards.ts';
import { dealHand, leftOf, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type Agent } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';

interface Stat { n: number; pass: number; name: number; sq: number }
type Results = Record<string, Stat>; // key = seat|relation|shape

function shapeLabel(hand: readonly Card[], trump: Suit): string {
  const t = hand.filter((c) => isTrump(c, trump));
  const tops = t.filter((c) => trumpRank(c, trump) >= 6).length;
  const ace = hand.some((c) => c.kind === 'suited' && c.rank === 'A' && !isTrump(c, trump));
  return `${t.length >= 3 ? '3+' : t.length} trumps|${tops >= 2 ? '2+ top trumps' : tops === 1 ? '1 top trump' : 'no top trump'}|${ace ? 'off-suit Ace' : 'no off-suit Ace'}`;
}

function run(deals: number, first: number, worlds: number): void {
  const results: Results = {};
  const rng = createRng(11_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    const deal = dealHand(dealer, rng);
    if (deal.upcard.kind !== 'suited') continue;
    const down = deal.upcard.suit;
    const left = leftOf(dealer);
    const right = partnerOf(left);
    const branch = (state: BiddingState, action: BidAction, seat: Seat): number => {
      const h = finishHand(applyBidAction(state, action), players(), [0, 0], 10);
      return !h.result ? 0 : h.result.team === teamOf(seat) ? h.result.points : -h.result.points;
    };

    let b = startBidding(deal);
    while (b.turn !== null) {
      const seat = b.turn;
      if (b.phase === 'round2' && (seat === left || seat === right)) {
        const hand = deal.hands[seat]!;
        const options = SUITS.filter((s) => s !== down && hand.filter((c) => isTrump(c, s)).length >= 2);
        if (options.length) {
          const pass = branch(b, { type: 'pass' }, seat);
          for (const s of options) {
            const name = branch(b, { type: 'name', suit: s, alone: false }, seat);
            const rel = s === sameColourSuit(down) ? 'Next' : 'Opposite colour';
            const key = `${seat === left ? 'Left of dealer' : 'Right of dealer'}|${rel}|${shapeLabel(hand, s)}`;
            const st = (results[key] ??= { n: 0, pass: 0, name: 0, sq: 0 });
            st.n++;
            st.pass += pass;
            st.name += name;
            st.sq += (name - pass) ** 2;
          }
        }
      }
      b = applyBidAction(b, bidder.bid(bidView(b, seat, [0, 0], 10)));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/next-two-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, pass: 0, name: 0, sq: 0 });
      a.n += s.n; a.pass += s.pass; a.name += s.name; a.sq += s.sq;
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  /** Merge the groups whose key matches `keep` (to show coarser summaries). */
  const merge = (pred: (k: string) => boolean): Stat => {
    const m = { n: 0, pass: 0, name: 0, sq: 0 };
    for (const [k, s] of Object.entries(all)) if (pred(k)) { m.n += s.n; m.pass += s.pass; m.name += s.name; m.sq += s.sq; }
    return m;
  };
  const gain = (s: Stat) => {
    if (s.n < 100) return '–';
    const g = (s.name - s.pass) / s.n;
    const se = Math.sqrt(Math.max(0, s.sq / s.n - g * g) / s.n);
    return `${Math.abs(g) > 2 * se ? `**${fmt(g)}**` : fmt(g)} (${s.n.toLocaleString()})`;
  };

  let out = `# Experiment: round two for the non-dealing team, next vs pass (Monte Carlo card play)\n\n`;
  out += `Gain in average **net points per hand** from naming the suit (partner kept) instead of passing, from the same position. Hands in brackets. Bold = outside noise (2 standard errors).\n`;
  for (const seat of ['Left of dealer', 'Right of dealer']) {
    out += `\n## ${seat}\n\n### Summary\n\n| Trumps in the suit | Top trumps | Next | Opposite colour |\n|---|---|---:|---:|\n`;
    for (const t of ['2 trumps', '3+ trumps']) {
      for (const top of ['no top trump', '1 top trump', '2+ top trumps']) {
        const cell = (rel: string) => gain(merge((k) => k.startsWith(`${seat}|${rel}|${t}|${top}|`)));
        out += `| ${t} | ${top} | ${cell('Next')} | ${cell('Opposite colour')} |\n`;
      }
    }
    out += `\n### With and without an off-suit Ace (2 trumps)\n\n| Top trumps | Off-suit Ace | Next | Opposite colour |\n|---|---|---:|---:|\n`;
    for (const top of ['no top trump', '1 top trump', '2+ top trumps']) {
      for (const ace of ['off-suit Ace', 'no off-suit Ace']) {
        const cell = (rel: string) => gain(all[`${seat}|${rel}|2 trumps|${top}|${ace}`] ?? { n: 0, pass: 0, name: 0, sq: 0 });
        out += `| ${top} | ${ace} | ${cell('Next')} | ${cell('Opposite colour')} |\n`;
      }
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/next-two.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 10_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
