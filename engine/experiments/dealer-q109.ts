// Experiment (league question): should the dealer make trump with the Queen, 10 and 9 of trumps?
//
// Four hand shapes, each with Q-10-9 of trumps plus two outside cards:
//   A. 1 outside suit, with its Ace      (the Ace + another card of that suit)
//   B. 1 outside suit, no Ace            (two cards of one suit)
//   C. 2 outside suits, one is an Ace    (an Ace + a card of another suit)
//   D. 2 outside suits, no Ace           (one card each of two suits)
// The outside cards are dealt at random within the shape (never an Ace unless the shape has one,
// never the Left Bower). Everything else is dealt at random.
//
// Round 1: one of the Q, 10, 9 is turned up and the dealer holds the other two, plus the two
//   outside cards and a junk card (thrown away on picking up, so the hand ends with the shape).
//   If everyone passes to the dealer: pass / pick up / pick up and go alone.
// Round 2: the dealer holds all three, everyone has passed to them in round two, and the suit wasn't
//   turned down. Name it / name it alone / pass (the hand is thrown in).
//
// Card play is Monte Carlo for all four players; other bidding by league-calibrated bots.
//
// Usage:
//   node experiments/dealer-q109.ts run [samples=2000] [first=0] [worlds=20]
//   node experiments/dealer-q109.ts combine results/dealer-q109-from*.json

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
  if (shape === 'A') return [ace(x), one(x)];
  if (shape === 'B') return [one(x), one(x)];
  if (shape === 'C') return [ace(x), one(y)];
  return [one(x), one(y)];
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
  const rng = createRng(15_000_000 + first);
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
    const q109 = (['Q', '10', '9'] as Rank[]).map((r) => card(r, trump));
    const play = (state: BiddingState): [number, string] => {
      const h = finishHand(state, players(), [0, 0], 10);
      return [!h.result ? 0 : h.result.team === team ? h.result.points : -h.result.points, outcomeLabel(h, team)];
    };

    // Round 1: one of Q-10-9 turned up.
    {
      const used = new Set(q109.map(cardId));
      const out = outside(shape, trump, rng, used);
      const upcard = pick(q109, rng);
      // Junk card: a 9 or 10 of a suit that isn't trump, thrown away after picking up.
      const junk = pick(SUITS.filter((s) => s !== trump).flatMap((s) => plainCards(s, trump, used).filter((c) => c.kind === 'suited' && (c.rank === '9' || c.rank === '10'))), rng);
      const hand = [...q109.filter((c) => c !== upcard), ...out, junk];
      let b = startBidding(buildDeal(dealer, hand, upcard, rng));
      while (b.turn !== null && b.turn !== dealer && b.phase === 'round1') b = applyBidAction(b, bidder.bid(bidView(b, b.turn, [0, 0], 10)));
      if (b.phase === 'round1' && b.turn === dealer) {
        const pickUp = (alone: boolean): [number, string] => {
          let s = applyBidAction(b, { type: 'orderUp', alone });
          while (s.turn !== null && s.phase !== 'discard') s = applyBidAction(s, bidder.bid(bidView(s, s.turn, [0, 0], 10)));
          if (s.phase === 'discard') s = applyBidAction(s, { type: 'discard', card: junk });
          return play(s);
        };
        add(`Round 1|${shape}`, { Pass: play(applyBidAction(b, { type: 'pass' })), Call: pickUp(false), Alone: pickUp(true) });
      }
    }

    // Round 2: the dealer holds Q-10-9; another suit was turned down. It rarely comes back to the
    // dealer, so try up to 300 deals per sample.
    for (let attempt = 0; attempt < 300; attempt++) {
      const used = new Set(q109.map(cardId));
      const out = outside(shape, trump, rng, used);
      const down = pick(SUITS.filter((s) => s !== trump), rng);
      const upcard = pick(newDeck().filter((c) => c.kind === 'suited' && c.suit === down && !used.has(cardId(c)) && !(c.rank === 'J' && down === sameColourSuit(trump))), rng);
      let b = startBidding(buildDeal(dealer, [...q109, ...out], upcard, rng));
      // Everyone passes round 1 (the dealer turns it down) and the first three pass round 2; otherwise skip.
      while (b.turn !== null && (b.phase === 'round1' || b.phase === 'round2') && !(b.phase === 'round2' && b.turn === dealer)) {
        b = applyBidAction(b, b.turn === dealer ? { type: 'pass' } : bidder.bid(bidView(b, b.turn, [0, 0], 10)));
      }
      if (b.phase === 'round2' && b.turn === dealer) {
        const rel = colourOf(trump) === colourOf(down) ? 'next' : 'opposite colour';
        const name = (alone: boolean): [number, string] => play(applyBidAction(b, { type: 'name', suit: trump, alone } as BidAction));
        add(`Round 2 (${rel})|${shape}`, { Pass: [0, 'Thrown in'], Call: name(false), Alone: name(true) });
        break;
      }
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/dealer-q109-from${first}.json`, JSON.stringify(results));
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
  let out = `# Experiment: should the dealer make on Queen, 10, 9 of trumps? (Monte Carlo card play)\n\nAverage **net points per hand** for the dealer's team. Gains are compared with passing on the same deal. Bold = outside noise.\n`;
  for (const round of ['Round 1', 'Round 2 (next)', 'Round 2 (opposite colour)']) {
    out += `\n## ${round}\n\n| Shape (with Q-10-9 of trumps) | Hands | Pass | Pick up / name | Alone | Call vs pass | Alone vs pass | Made 3-4 | Marched | Euchred |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
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
  writeFileSync('results/dealer-q109.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 2_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
