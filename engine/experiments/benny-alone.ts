// Experiment: the Benny is turned up. The dealer names trumps blind, picks up their hand and the
// Benny, and discards. Only now, having seen their cards, do they decide whether to go alone
// (house rule, EUCHRE_RULES.md section 4). When should they?
//
// Every deal has the Benny as the upcard: a shuffled deal with the Benny swapped into the upcard's
// place, which gives every such deal the same chance. The dealer names a suit at random (by
// symmetry the suit can't matter, since they can't see their cards; the report checks this),
// picks up, and discards as the bots do. Then the hand is played out twice from that exact point:
// with partner, and alone. Card play by the Monte Carlo bot for all four players.
//
// Hands are grouped by what the dealer holds after the discard (the Benny is always one of them):
// how many trumps, how many Bowers, and off-suit Aces.
//
// Usage:
//   node experiments/benny-alone.ts run [deals=3000] [firstDeal=0] [worlds=20]
//   node experiments/benny-alone.ts combine results/benny-alone-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isLeftBower, isRightBower, isTrump, SUITS, type Card, type Suit } from '../src/cards.ts';
import { dealHand, teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand } from '../src/game.ts';
import { LEAGUE_V3_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';

interface Stat { n: number; partner: number; alone: number; dSq: number; partnerEuchred: number; aloneMarch: number; aloneEuchred: number }
const newStat = (): Stat => ({ n: 0, partner: 0, alone: 0, dSq: 0, partnerEuchred: 0, aloneMarch: 0, aloneEuchred: 0 });
type Stats = Record<string, Stat>;

function add(stats: Stats, key: string, p: { net: number; tricks: number }, a: { net: number; tricks: number }): void {
  const s = (stats[key] ??= newStat());
  s.n++;
  s.partner += p.net;
  s.alone += a.net;
  s.dSq += (a.net - p.net) ** 2;
  if (p.tricks < 3) s.partnerEuchred++;
  if (a.tricks === 5) s.aloneMarch++;
  if (a.tricks < 3) s.aloneEuchred++;
}

/** A random deal with the Benny turned up. */
function bennyDeal(dealer: Seat, rng: ReturnType<typeof createRng>): Deal {
  const d = dealHand(dealer, rng);
  if (d.upcard.kind === 'benny') return d;
  const up = d.upcard;
  const swap = (c: Card): Card => (c.kind === 'benny' ? up : c);
  return {
    ...d,
    hands: d.hands.map((h) => h.map(swap)),
    kitty: [d.kitty[0]!.kind === 'benny' ? up : { kind: 'benny' }, ...d.kitty.slice(1).map(swap)] as Card[],
    upcard: { kind: 'benny' },
  };
}

function describe(hand: readonly Card[], trump: Suit): { trumps: number; bowers: number; aces: number; key: string } {
  const trumps = hand.filter((c) => isTrump(c, trump)).length;
  const bowers = hand.filter((c) => isRightBower(c, trump) || isLeftBower(c, trump)).length;
  const aces = hand.filter((c) => c.kind === 'suited' && c.rank === 'A' && !isTrump(c, trump)).length;
  return { trumps, bowers, aces, key: `${trumps}|${bowers}|${Math.min(aces, 1)}` };
}

function run(deals: number, first: number, worlds: number): void {
  const rng = createRng(424_242 + first);
  const bidder = monteCarloBot({ params: LEAGUE_V3_PARAMS }); // the discard is rule-based
  const byShape: Stats = {};
  const bySuit: Stats = {};
  const started = performance.now();

  const play = (state: BiddingState, seat: Seat, seed: number) => {
    const agents = [0, 1, 2, 3].map((i) => monteCarloBot({ worlds, params: LEAGUE_V3_PARAMS, seed: seed * 4 + i }));
    const h = finishHand(state, agents, [0, 0], 10);
    return { net: h.result!.team === teamOf(seat) ? h.result!.points : -h.result!.points, tricks: h.makerTricks };
  };

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    const deal = bennyDeal(dealer, rng);
    const suit = SUITS[Math.floor(rng() * 4)]!;
    let state = applyBidAction(startBidding(deal), { type: 'name', suit, alone: false });
    state = applyBidAction(state, bidder.bid(bidView(state, dealer, [0, 0], 10))); // discard
    if (state.phase !== 'afterCall' || state.turn !== dealer) throw new Error('expected the dealer\'s go-alone turn');
    const shape = describe(state.hands[dealer]!, suit);
    const p = play(applyBidAction(state, { type: 'pass' }), dealer, i);
    const a = play(applyBidAction(state, { type: 'goAlone' }), dealer, i);
    add(byShape, shape.key, p, a);
    add(bySuit, suit, p, a);
    if ((i - first + 1) % 500 === 0) console.error(`${i - first + 1}/${deals} in ${((performance.now() - started) / 1000).toFixed(0)}s`);
  }

  mkdirSync('results', { recursive: true });
  writeFileSync(`results/benny-alone-from${first}.json`, JSON.stringify({ deals, worlds, byShape, bySuit }, null, 2));
  console.log(`done: ${deals} deals from ${first} in ${((performance.now() - started) / 1000).toFixed(0)}s`);
}

function merge(into: Stats, from: Stats): void {
  for (const [k, s] of Object.entries(from)) {
    const t = (into[k] ??= newStat());
    for (const f of Object.keys(s) as (keyof Stat)[]) t[f] += s[f];
  }
}

function combine(files: string[]): void {
  const byShape: Stats = {};
  const bySuit: Stats = {};
  let deals = 0;
  let worlds = 0;
  for (const f of files) {
    const r = JSON.parse(readFileSync(f, 'utf8')) as { deals: number; worlds: number; byShape: Stats; bySuit: Stats };
    deals += r.deals;
    worlds = r.worlds;
    merge(byShape, r.byShape);
    merge(bySuit, r.bySuit);
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const pc = (x: number, n: number) => `${((100 * x) / n).toFixed(0)}%`;
  const row = (label: string, s: Stat) => {
    const gain = (s.alone - s.partner) / s.n;
    const se = Math.sqrt(Math.max(0, s.dSq / s.n - gain * gain) / s.n);
    return `| ${label} | ${s.n.toLocaleString()} | ${fmt(s.partner / s.n)} | ${pc(s.partnerEuchred, s.n)} | ${fmt(s.alone / s.n)} | ${pc(s.aloneMarch, s.n)} | ${pc(s.aloneEuchred, s.n)} | **${fmt(gain)}** (±${(2 * se).toFixed(2)}) |\n`;
  };
  const head = `| Dealer's hand after the discard | Hands | Points with partner | Euchred with partner | Points alone | March alone | Euchred alone | **Gain from going alone** |\n|---|---:|---:|---:|---:|---:|---:|---:|\n`;

  let out = `# Experiment: the Benny turned up, going alone after the blind call\n\n`;
  out += `${deals.toLocaleString()} deals with the Benny turned up, each played out with partner and alone from the same point; Monte Carlo card play (${worlds} worlds) for all four players. Points are the dealer's team's, per hand.\n\n`;

  const all = newStat();
  merge({ all } as Stats, {});
  for (const s of Object.values(bySuit)) for (const f of Object.keys(s) as (keyof Stat)[]) all[f] += s[f];
  out += `## Overall\n\n${head}${row('Every blind call', all)}\n`;

  out += `## By the suit named\n\n${head}`;
  for (const suit of SUITS) if (bySuit[suit]) out += row(suit, bySuit[suit]!);

  const keys = Object.keys(byShape).sort((a, b) => {
    const [ta, ba, aa] = a.split('|').map(Number);
    const [tb, bb, ab] = b.split('|').map(Number);
    return ta! - tb! || ba! - bb! || aa! - ab!;
  });
  out += `\n## By hand (trumps include the Benny; "Bowers" counts the Right and Left; "Ace" means at least one off-suit Ace)\n\n${head}`;
  for (const k of keys) {
    const [t, b, a] = k.split('|').map(Number);
    const s = byShape[k]!;
    if (s.n < 50) continue;
    out += row(`${t} trump${t === 1 ? '' : 's'}, ${b} Bower${b === 1 ? '' : 's'}, ${a ? 'an Ace' : 'no Ace'}`, s);
  }

  // By trump count alone, for the headline.
  out += `\n## By number of trumps\n\n${head}`;
  for (let t = 1; t <= 5; t++) {
    const s = newStat();
    for (const [k, v] of Object.entries(byShape)) if (Number(k.split('|')[0]) === t) for (const f of Object.keys(v) as (keyof Stat)[]) s[f] += v[f];
    if (s.n) out += row(`${t} trump${t === 1 ? '' : 's'}`, s);
  }

  mkdirSync('results', { recursive: true });
  writeFileSync('results/benny-alone.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 3000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
