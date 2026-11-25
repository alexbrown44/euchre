// Experiment (league question): the dealer picks up with 3 trumps and two outside cards. Which
// outside cards are better: two Aces (of different suits), or one suit, Ace high (the Ace and another
// card of that suit)?
//
// Shapes (the dealer's hand after picking up and discarding):
//   AA. 3 trumps + two off-suit Aces, in different suits
//   AX. 3 trumps + one suit, Ace high (the Ace + a 9, 10, Q or K of the same suit)
//   AY. 3 trumps + an Ace and a non-Ace of another suit (for reference)
// The 3 trumps are drawn at random from the trump suit, never the Benny. One is the upcard; the
// dealer holds the other two, the outside cards and a junk card that is thrown away on picking up.
// Round 1 only: everyone passes to the dealer, who passes, picks up, or picks up and goes alone.
//
// Card play is Monte Carlo for all four players; other bidding by league-calibrated bots.
//
// Usage:
//   node experiments/dealer-two-aces.ts run [samples=1500] [first=0] [worlds=20]
//   node experiments/dealer-two-aces.ts combine results/dealer-two-aces-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { card, cardId, RANKS, sameColourSuit, SUITS, type Card, type Rank, type Suit } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng, shuffle, type Rng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type Agent, type HandRecord } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';

const SHAPES = {
  AA: 'Two Aces, different suits',
  AX: 'One suit, Ace high (Ace + another of that suit)',
  AY: 'Ace + a non-Ace of another suit',
} as const;
type Shape = keyof typeof SHAPES;
const OPTIONS = ['Pass', 'Call', 'Alone'] as const;

interface Stat { n: number; sum: Record<string, number>; sq: Record<string, number>; dsq: Record<string, number>; outcomes: Record<string, Record<string, number>> }
type Results = Record<string, Stat>;

const pick = <T>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]!;

/** Non-Ace cards of a suit, leaving out the Left Bower (it's a trump). */
function plainCards(suit: Suit, trump: Suit, used: Set<string>): Card[] {
  return (RANKS.filter((r) => r !== 'A') as Rank[])
    .map((r) => card(r, suit))
    .filter((c) => !(c.rank === 'J' && suit === sameColourSuit(trump)) && !used.has(cardId(c)));
}

function outside(shape: Shape, trump: Suit, rng: Rng, used: Set<string>): Card[] {
  const others = shuffle(SUITS.filter((s) => s !== trump), rng);
  const [x, y] = [others[0]!, others[1]!];
  const one = (s: Suit) => { const c = pick(plainCards(s, trump, used), rng); used.add(cardId(c)); return c; };
  const ace = (s: Suit) => { const c = card('A', s); used.add(cardId(c)); return c; };
  if (shape === 'AA') return [ace(x), ace(y)];
  if (shape === 'AX') return [ace(x), one(x)];
  return [ace(x), one(y)];
}

function buildDeal(dealer: Seat, dealerHand: Card[], upcard: Card, rng: Rng): Deal {
  const fixed = new Set([...dealerHand, upcard].map(cardId));
  const rest = shuffle(newDeck().filter((c) => !fixed.has(cardId(c))), rng);
  const hands: Card[][] = [[], [], [], []];
  hands[dealer] = [...dealerHand];
  let k = 0;
  for (const s of [0, 1, 2, 3] as Seat[]) if (s !== dealer) hands[s] = rest.slice(k, (k += 5));
  return { dealer, hands, upcard, kitty: [upcard, ...rest.slice(k, k + 4)] };
}

function outcomeLabel(h: HandRecord, team: number): string {
  if (!h.result || !h.contract) return 'Thrown in';
  const ours = h.contract.makerTeam === team;
  const o = h.result.outcome;
  if (ours) return o === 'euchre' || o === 'loneDefenderEuchre' ? 'We were euchred' : o === 'march' || o === 'lonerMarch' ? 'We marched' : 'We made it (3-4 tricks)';
  return o === 'euchre' || o === 'loneDefenderEuchre' ? 'They called, we euchred them' : 'They called and made it';
}

function run(samples: number, first: number, worlds: number): void {
  const results: Results = {};
  const rng = createRng(17_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });
  const add = (key: string, vals: Record<string, [number, string]>) => {
    const st = (results[key] ??= { n: 0, sum: {}, sq: {}, dsq: {}, outcomes: {} });
    st.n++;
    const base = vals.Pass![0];
    for (const [o, [v, label]] of Object.entries(vals)) {
      st.sum[o] = (st.sum[o] ?? 0) + v;
      st.sq[o] = (st.sq[o] ?? 0) + v * v;
      st.dsq[o] = (st.dsq[o] ?? 0) + (v - base) ** 2;
      const oc = (st.outcomes[o] ??= {});
      oc[label] = (oc[label] ?? 0) + 1;
    }
  };

  for (let i = first; i < first + samples; i++) {
    const shape = (['AA', 'AX', 'AY'] as Shape[])[i % 3]!;
    const dealer = (Math.floor(i / 3) % 4) as Seat;
    const team = teamOf(dealer);
    const trump = pick(SUITS, rng);
    // Three trumps from the Right, Left, A, K, Q, 10, 9 of trumps (never the Benny).
    const pool = [card('J', trump), card('J', sameColourSuit(trump)), ...(['A', 'K', 'Q', '10', '9'] as Rank[]).map((r) => card(r, trump))];
    const trumps = shuffle(pool, rng).slice(0, 3);
    const tops = trumps.filter((c) => c.kind === 'suited' && c.rank === 'J').length;
    const tier = tops === 0 ? 'no top trump' : 'with a top trump';
    const play = (state: BiddingState): [number, string] => {
      const h = finishHand(state, players(), [0, 0], 10);
      return [!h.result ? 0 : h.result.team === team ? h.result.points : -h.result.points, outcomeLabel(h, team)];
    };

    const used = new Set(trumps.map(cardId));
    const out = outside(shape, trump, rng, used);
    // The upcard must be a natural card of the trump suit, so never the Left Bower.
    const upcard = pick(trumps.filter((c) => c.kind === 'suited' && c.suit === trump), rng);
    const junk = pick(SUITS.filter((x) => x !== trump).flatMap((x) => plainCards(x, trump, used).filter((c) => c.kind === 'suited' && (c.rank === '9' || c.rank === '10'))), rng);
    const hand = [...trumps.filter((c) => c !== upcard), ...out, junk];
    let b = startBidding(buildDeal(dealer, hand, upcard, rng));
    while (b.turn !== null && b.turn !== dealer && b.phase === 'round1') b = applyBidAction(b, bidder.bid(bidView(b, b.turn, [0, 0], 10)));
    if (b.phase === 'round1' && b.turn === dealer) {
      const pickUp = (alone: boolean): [number, string] => {
        let st = applyBidAction(b, { type: 'orderUp', alone });
        while (st.turn !== null && st.phase !== 'discard') st = applyBidAction(st, bidder.bid(bidView(st, st.turn, [0, 0], 10)));
        if (st.phase === 'discard') st = applyBidAction(st, { type: 'discard', card: junk });
        return play(st);
      };
      const vals = { Pass: play(applyBidAction(b, { type: 'pass' })), Call: pickUp(false), Alone: pickUp(true) };
      add(`All|${shape}`, vals);
      add(`${tier}|${shape}`, vals);
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/dealer-two-aces-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: {}, sq: {}, dsq: {}, outcomes: {} });
      a.n += s.n;
      for (const o of Object.keys(s.sum)) {
        a.sum[o] = (a.sum[o] ?? 0) + s.sum[o]!;
        a.sq[o] = (a.sq[o] ?? 0) + s.sq[o]!;
        a.dsq[o] = (a.dsq[o] ?? 0) + s.dsq[o]!;
        const oc = (a.outcomes[o] ??= {});
        for (const [l, c] of Object.entries(s.outcomes[o]!)) oc[l] = (oc[l] ?? 0) + c;
      }
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const gain = (s: Stat, o: string) => {
    const m = (s.sum[o]! - s.sum.Pass!) / s.n;
    const se = Math.sqrt(Math.max(0, s.dsq[o]! / s.n - m * m) / s.n);
    return Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m);
  };
  const mean = (s: Stat, o: string) => s.sum[o]! / s.n;
  const varOf = (s: Stat, o: string) => Math.max(0, s.sq[o]! / s.n - mean(s, o) ** 2) / s.n;
  const diff = (a: Stat, b: Stat, o: string) => {
    const m = mean(a, o) - mean(b, o);
    const se = Math.sqrt(varOf(a, o) + varOf(b, o));
    return `${Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m)} (±${(2 * se).toFixed(2)})`;
  };
  const pct = (s: Stat, o: string, label: string) => `${Math.round((100 * (s.outcomes[o]?.[label] ?? 0)) / s.n)}%`;
  let out = `# Experiment: dealer with 3 trumps — two Aces, or one suit Ace high? (Monte Carlo card play)\n\nAverage **net points per hand** for the dealer's team. Everyone has passed to the dealer in round one. Bold = outside noise (2 standard errors).\n`;
  for (const group of ['All', 'no top trump', 'with a top trump']) {
    out += `\n## ${group === 'All' ? 'All 3-trump hands' : `3 trumps, ${group}`}\n\n| Outside cards | Hands | Pass | Pick up | Alone | Pick up vs pass | Alone vs pass | Made 3-4 | Marched | Euchred | Alone: marched |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
    for (const sh of ['AA', 'AX', 'AY'] as Shape[]) {
      const s = all[`${group}|${sh}`];
      if (!s) continue;
      out += `| ${SHAPES[sh]} | ${s.n.toLocaleString()} | ${fmt(mean(s, 'Pass'))} | ${fmt(mean(s, 'Call'))} | ${fmt(mean(s, 'Alone'))} | ${gain(s, 'Call')} | ${gain(s, 'Alone')} | ${pct(s, 'Call', 'We made it (3-4 tricks)')} | ${pct(s, 'Call', 'We marched')} | ${pct(s, 'Call', 'We were euchred')} | ${pct(s, 'Alone', 'We marched')} |\n`;
    }
    const aa = all[`${group}|AA`], ax = all[`${group}|AX`];
    if (aa && ax) {
      out += `\n**Two Aces minus one suit Ace high:** pick up ${diff(aa, ax, 'Call')}, alone ${diff(aa, ax, 'Alone')}, best of the two ${fmt(Math.max(mean(aa, 'Call'), mean(aa, 'Alone')) - Math.max(mean(ax, 'Call'), mean(ax, 'Alone')))}\n`;
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/dealer-two-aces.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 1_500), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
