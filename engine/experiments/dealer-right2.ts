// Experiment (league question): should the dealer pick up with only two trumps, one of them the
// Right Bower?
//
// The dealer ends with the Right Bower and one other trump (9, 10, Q, K or A, never the Benny or Left),
// plus three outside cards in four shapes:
//   A. 1 outside suit, with its Ace     (the Ace + two more of that suit)
//   B. 1 outside suit, no Ace           (three cards of one suit)
//   C. 2 outside suits, one card an Ace (three cards split 2+1 between two suits, one an Ace)
//   D. 2 outside suits, no Ace          (three cards split 2+1, no Ace)
// One of the two trumps is the upcard; the dealer holds the other, the outside cards and a junk card
// that is thrown away on picking up. Round 1 only: everyone passes to the dealer, who passes, picks
// up, or picks up and goes alone.
//
// Card play is Monte Carlo for all four players; other bidding by league-calibrated bots.
//
// Usage:
//   node experiments/dealer-right2.ts run [samples=2000] [first=0] [worlds=20]
//   node experiments/dealer-right2.ts combine results/dealer-right2-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { card, cardId, colourOf, RANKS, sameColourSuit, SUITS, type Card, type Rank, type Suit } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { partnerOf, teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng, shuffle, type Rng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type Agent, type HandRecord } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';

const SHAPES = {
  A: '1 outside suit, with the Ace',
  B: '1 outside suit, no Ace',
  C: '2 outside suits, one card an Ace',
  D: '2 outside suits, no Ace',
} as const;
type Shape = keyof typeof SHAPES;

interface Stat { n: number; sum: Record<string, number>; sq: Record<string, number>; outcomes: Record<string, Record<string, number>> }
type Results = Record<string, Stat>;

const pick = <T>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]!;

/** Non-Ace cards of a suit, leaving out the Left Bower (it's a trump). */
function plainCards(suit: Suit, trump: Suit, used: Set<string>): Card[] {
  return (RANKS.filter((r) => r !== 'A') as Rank[])
    .map((r) => card(r, suit))
    .filter((c) => !(c.rank === 'J' && suit === sameColourSuit(trump)) && !used.has(cardId(c)));
}

/** Two outside cards for the shape. */
function outside(shape: Shape, trump: Suit, rng: Rng, used: Set<string>): Card[] {
  const others = shuffle(SUITS.filter((s) => s !== trump), rng);
  const [x, y] = [others[0]!, others[1]!];
  const one = (s: Suit) => { const c = pick(plainCards(s, trump, used), rng); used.add(cardId(c)); return c; };
  const ace = (s: Suit) => { const c = card('A', s); used.add(cardId(c)); return c; };
  // Three outside cards. Two-suit shapes split 2+1 at random.
  const split = rng() < 0.5;
  if (shape === 'A') return [ace(x), one(x), one(x)];
  if (shape === 'B') return [one(x), one(x), one(x)];
  if (shape === 'C') return split ? [ace(x), one(x), one(y)] : [ace(x), one(y), one(y)];
  return [one(x), one(x), one(y)];
}

/** Build a deal: the dealer's five cards and the upcard fixed, everything else random. */
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
  const rng = createRng(16_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });
  const add = (key: string, vals: Record<string, [number, string]>) => {
    const st = (results[key] ??= { n: 0, sum: {}, sq: {}, outcomes: {} });
    st.n++;
    const base = vals.Pass![0];
    for (const [o, [v, label]] of Object.entries(vals)) {
      st.sum[o] = (st.sum[o] ?? 0) + v;
      st.sq[o] = (st.sq[o] ?? 0) + (v - base) ** 2;
      const oc = (st.outcomes[o] ??= {});
      oc[label] = (oc[label] ?? 0) + 1;
    }
  };

  for (let i = first; i < first + samples; i++) {
    const shape = (['A', 'B', 'C', 'D'] as Shape[])[i % 4]!;
    const dealer = (Math.floor(i / 4) % 4) as Seat;
    const team = teamOf(dealer);
    const trump = pick(SUITS, rng);
    // The Right Bower and one other trump (never the Benny or the Left Bower).
    const second = card(pick(['9', '10', 'Q', 'K', 'A'] as Rank[], rng), trump);
    const trumps = [card('J', trump), second];
    const tier = second.kind === 'suited' && (second.rank === 'A' || second.rank === 'K') ? 'other trump A or K' : 'other trump 9, 10 or Q';
    const play = (state: BiddingState): [number, string] => {
      const h = finishHand(state, players(), [0, 0], 10);
      return [!h.result ? 0 : h.result.team === team ? h.result.points : -h.result.points, outcomeLabel(h, team)];
    };

    const used = new Set(trumps.map(cardId));
    const out = outside(shape, trump, rng, used);
    const upcard = pick(trumps, rng);
    // Junk card: a 9 or 10 of a suit that isn't trump, thrown away after picking up.
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
      add(`Round 1|${shape}`, vals);
      add(`Round 1, ${tier}|${shape}`, vals);
      add(`Round 1, ${upcard === trumps[0] ? 'Right Bower turned up' : 'dealer holds the Right Bower, other trump turned up'}|${shape}`, vals);
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/dealer-right2-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: {}, sq: {}, outcomes: {} });
      a.n += s.n;
      for (const o of Object.keys(s.sum)) {
        a.sum[o] = (a.sum[o] ?? 0) + s.sum[o]!;
        a.sq[o] = (a.sq[o] ?? 0) + s.sq[o]!;
        const oc = (a.outcomes[o] ??= {});
        for (const [l, c] of Object.entries(s.outcomes[o]!)) oc[l] = (oc[l] ?? 0) + c;
      }
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const gain = (s: Stat, o: string) => {
    const m = (s.sum[o]! - s.sum.Pass!) / s.n;
    const se = Math.sqrt(Math.max(0, s.sq[o]! / s.n - m * m) / s.n);
    return Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m);
  };
  const pct = (s: Stat, o: string, label: string) => `${Math.round((100 * (s.outcomes[o]?.[label] ?? 0)) / s.n)}%`;
  let out = `# Experiment: should the dealer pick up with only two trumps, one the Right Bower? (Monte Carlo card play)\n\nAverage **net points per hand** for the dealer's team. Gains are compared with passing on the same deal. Bold = outside noise.\n`;
  for (const round of ['Round 1', 'Round 1, Right Bower turned up', 'Round 1, dealer holds the Right Bower, other trump turned up', 'Round 1, other trump A or K', 'Round 1, other trump 9, 10 or Q']) {
    out += `\n## ${round}\n\n| Shape (with the Right Bower + 1 trump) | Hands | Pass | Pick up / name | Alone | Call vs pass | Alone vs pass | Made 3-4 | Marched | Euchred |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
    for (const sh of ['A', 'B', 'C', 'D'] as Shape[]) {
      const s = all[`${round}|${sh}`];
      if (!s) continue;
      const avg = (o: string) => fmt(s.sum[o]! / s.n);
      out += `| ${SHAPES[sh]} | ${s.n.toLocaleString()} | ${avg('Pass')} | ${avg('Call')} | ${avg('Alone')} | ${gain(s, 'Call')} | ${gain(s, 'Alone')} | ${pct(s, 'Call', 'We made it (3-4 tricks)')} | ${pct(s, 'Call', 'We marched')} | ${pct(s, 'Call', 'We were euchred')} |\n`;
    }
    if (round === 'Round 1') {
      out += `\n**When the dealer passes in round 1, what happens next:**\n\n| Shape | Thrown in | We call in round 2 | They call and make it | They call, we euchre them |\n|---|---:|---:|---:|---:|\n`;
      for (const sh of ['A', 'B', 'C', 'D'] as Shape[]) {
        const s = all[`${round}|${sh}`];
        if (!s) continue;
        const ours = ['We made it (3-4 tricks)', 'We marched', 'We were euchred'].reduce((a, l) => a + (s.outcomes.Pass?.[l] ?? 0), 0);
        out += `| ${SHAPES[sh]} | ${pct(s, 'Pass', 'Thrown in')} | ${Math.round((100 * ours) / s.n)}% | ${pct(s, 'Pass', 'They called and made it')} | ${pct(s, 'Pass', 'They called, we euchred them')} |\n`;
      }
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/dealer-right2.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 2_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
