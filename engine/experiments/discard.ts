// Experiment: the dealer's discard after picking up.
//
// Every time the dealer picks up (and plays with their partner or alone), the hand is played out
// once for each sensible discard: every off-suit card, and the lowest trump. Then like-for-like
// comparisons are made within the same hand:
//
//  1. Make a void: discard a lone off-suit card (not an Ace), or the lowest card of a longer suit?
//  2. A lone off-suit Ace: discard it (making a void), or a low card from another suit?
//  3. Discard the lowest trump instead of the card the bots would throw (usually an off-suit card).
//
// Card play is Monte Carlo for all four players; bidding by league-calibrated bots.
//
// Usage:
//   node experiments/discard.ts run [deals=10000] [firstDeal=0] [worlds=20]
//   node experiments/discard.ts combine results/discard-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { effectiveSuit, isTrump, sameCard, type Card, type Suit } from '../src/cards.ts';
import { dealHand, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding } from '../src/bidding.ts';
import { bidView, finishHand, type Agent } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { chooseDiscard, keepValue } from '../src/bots/evaluate.ts';

interface Stat { n: number; sum: number; sq: number } // of (first option − second option)
type Results = Record<string, Stat>;

const rankGroup = (c: Card) => (c.kind !== 'suited' ? '?' : c.rank === 'K' ? 'King' : c.rank === 'Q' || c.rank === 'J' ? 'Queen or Jack' : '10 or 9');

function run(deals: number, first: number, worlds: number): void {
  const results: Results = {};
  const add = (key: string, diff: number) => {
    const s = (results[key] ??= { n: 0, sum: 0, sq: 0 });
    s.n++; s.sum += diff; s.sq += diff * diff;
  };
  const rng = createRng(12_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    let b = startBidding(dealHand(dealer, rng));
    while (b.turn !== null && b.phase !== 'discard') b = applyBidAction(b, bidder.bid(bidView(b, b.turn, [0, 0], 10)));
    // Skip lone defence, and a turned-up Benny (the dealer called blind: a different situation).
    if (b.phase !== 'discard' || b.loneDefender !== null || b.deal.upcard.kind === 'benny') continue;
    const trump = b.trump!;
    const hand = b.hands[dealer]!;
    const mode = b.makerLoner === dealer ? 'Dealer alone' : 'Dealer with partner';
    const suitOf = (c: Card) => effectiveSuit(c, trump) as Suit;
    const inSuit = (c: Card) => hand.filter((x) => suitOf(x) === suitOf(c));
    const isAce = (c: Card) => c.kind === 'suited' && c.rank === 'A';

    // Sensible options: every off-suit card, plus the lowest trump.
    const offs = hand.filter((c) => !isTrump(c, trump));
    const trumps = hand.filter((c) => isTrump(c, trump)).sort((a, c) => keepValue(a, trump) - keepValue(c, trump));
    const options = [...offs, ...(trumps.length ? [trumps[0]!] : [])];
    if (options.length < 2) continue;
    const value = new Map<Card, number>();
    for (const c of options) {
      const h = finishHand(applyBidAction(b, { type: 'discard', card: c }), players(), [0, 0], 10);
      value.set(c, !h.result ? 0 : h.result.team === teamOf(dealer) ? h.result.points : -h.result.points);
    }
    const v = (c: Card) => value.get(c)!;

    // 1. Make a void: a lone non-Ace off-suit card vs the lowest card of a longer off-suit suit.
    const lowestOf = (c: Card) => inSuit(c).sort((a, x) => keepValue(a, trump) - keepValue(x, trump))[0]!;
    const singles = offs.filter((c) => inSuit(c).length === 1 && !isAce(c));
    const longLows = [...new Set(offs.filter((c) => inSuit(c).length >= 2).map(lowestOf))].filter((c) => !isAce(c));
    for (const s of singles) {
      for (const l of longLows) {
        add(`Void|${mode}|lone ${rankGroup(s)}|${rankGroup(l)} from a ${inSuit(l).length >= 3 ? '3+' : 2}-card suit`, v(s) - v(l));
      }
    }

    // 2. A lone off-suit Ace vs the lowest card of another off-suit suit.
    for (const a of offs.filter((c) => isAce(c) && inSuit(c).length === 1)) {
      for (const o of [...new Set(offs.filter((c) => suitOf(c) !== suitOf(a)).map(lowestOf))]) {
        if (isAce(o)) continue;
        add(`Ace|${mode}|${inSuit(o).length === 1 ? 'a lone low card (also makes a void)' : 'a low card from a longer suit'}`, v(a) - v(o));
      }
    }

    // 4. Hand shape after the discard (off-suit discards only, so the trumps stay the same):
    // how many outside suits are left, and whether an off-suit Ace is kept.
    const shapeAfter = (c: Card) => {
      const rest = offs.filter((x) => x !== c);
      const n = new Set(rest.map(suitOf)).size;
      return { n, ace: rest.some(isAce), label: n === 0 ? 'all trumps' : `${n} outside suit${n > 1 ? 's' : ''}, ${rest.some(isAce) ? 'with an off-suit Ace' : 'no off-suit Ace'}` };
    };
    const byShape = new Map<string, { n: number; ace: boolean; vals: number[] }>();
    for (const c of offs) {
      const s = shapeAfter(c);
      const g = byShape.get(s.label) ?? { n: s.n, ace: s.ace, vals: [] };
      g.vals.push(v(c));
      byShape.set(s.label, g);
    }
    const shapes = [...byShape.entries()].sort(([, a], [, b]) => a.n - b.n || Number(a.ace) - Number(b.ace));
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    for (let x = 0; x < shapes.length; x++) {
      for (let y = x + 1; y < shapes.length; y++) {
        add(`Shape|${mode}|${trumps.length} trumps|${shapes[x]![0]}|${shapes[y]![0]}`, mean(shapes[x]![1].vals) - mean(shapes[y]![1].vals));
      }
    }

    // 3. Lowest trump vs the bots' choice.
    const bot = chooseDiscard(hand, trump);
    if (!isTrump(bot, trump) && trumps.length) {
      const sameRef = options.find((c) => sameCard(c, bot))!;
      add(`Trump|${mode}|${trumps.length} trumps in 6 cards|${offs.some(isAce) ? 'holding an off-suit Ace' : 'no off-suit Ace'}`, v(trumps[0]!) - v(sameRef));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/discard-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: 0, sq: 0 });
      a.n += s.n; a.sum += s.sum; a.sq += s.sq;
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const cell = (s: Stat | undefined) => {
    if (!s || s.n < 100) return '–';
    const m = s.sum / s.n;
    const se = Math.sqrt(Math.max(0, s.sq / s.n - m * m) / s.n);
    return `${Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m)} (${s.n.toLocaleString()})`;
  };
  const titles: Record<string, string> = {
    Void: '1. Make a void? Discard a lone off-suit card vs the lowest card of a longer suit\n\nPositive = making the void is better.',
    Ace: '2. A lone off-suit Ace: discard it vs a low card from another suit\n\nPositive = discarding the Ace is better.',
    Trump: '3. Discard the lowest trump vs the bots\' usual off-suit discard\n\nPositive = discarding the trump is better.',
    Shape: '4. Hand shape after the discard: fewer outside suits, or keep an off-suit Ace?\n\nOff-suit discards from the same hand, grouped by the shape they leave (trumps counted in the 6 cards, so they are unchanged). Positive = the first shape is better.',
  };
  const show = (part: string, s: string) => {
    const p = s.split('|');
    if (part === 'Shape') return `${p[0]}: **${p[1]}** vs ${p[2]}`;
    if (part === 'Trump') return p.join(', ');
    return `${p[0]}, vs ${p.slice(1).join(', ')}`;
  };
  let out = `# Experiment: the dealer's discard (Monte Carlo card play)\n\nDifferences in average **net points per hand** for the dealer's team between two discards from the same hand. Hands in brackets. Bold = outside noise (2 standard errors).\n`;
  for (const part of ['Shape', 'Void', 'Ace', 'Trump']) {
    out += `\n## ${titles[part]}\n\n| Situation | Dealer with partner | Dealer alone |\n|---|---:|---:|\n`;
    const sits = [...new Set(Object.keys(all).filter((k) => k.startsWith(part + '|')).map((k) => k.split('|').slice(2).join('|')))].sort();
    for (const s of sits) {
      out += `| ${show(part, s)} |${cell(all[`${part}|Dealer with partner|${s}`])} | ${cell(all[`${part}|Dealer alone|${s}`])} |\n`;
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/discard.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 10_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
