// Experiment (league ruling, 26 Nov 2026): the maker's partner may drop the maker and go alone
// even when nobody else is alone. When is that worth it?
//
// Random deals, bid by league-calibrated bots. Whenever the maker's partner gets an after-the-call
// turn with no loner and no lone defender, and holds 3+ trumps, the hand is played out both ways
// from that exact point: pass (play with the maker) or go alone (the maker sits out).
// Card play is Monte Carlo for all four players.
//
// Usage:
//   node experiments/partner-alone.ts run [deals=20000] [firstDeal=0] [worlds=20]
//   node experiments/partner-alone.ts combine results/partner-alone-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isTrump, trumpRank, type Card, type Suit } from '../src/cards.ts';
import { dealHand, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, startBidding, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, type Agent, type HandRecord } from '../src/game.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { features } from '../src/bots/evaluate.ts';

interface Stat { n: number; sum: Record<string, number>; dsq: number; outcomes: Record<string, Record<string, number>> }
type Results = Record<string, Stat>;

function handKey(hand: readonly Card[], trump: Suit): string[] {
  const f = features(hand, trump);
  const t = hand.filter((c) => isTrump(c, trump));
  const brl = t.filter((c) => trumpRank(c, trump) >= 6).length === 3;
  const tops = f.topTrumps >= 2 ? '2+ top trumps' : f.topTrumps === 1 ? '1 top trump' : 'no top trump';
  const n = f.trumps >= 5 ? '5 trumps' : f.trumps === 4 ? '4 trumps' : '3 trumps';
  const keys = [`${n}, ${tops}`, `${n}, ${tops}, ${f.offAces > 0 ? 'with' : 'no'} off-suit Ace`];
  if (brl) keys.push('Benny + Right + Left');
  return keys;
}

function outcomeLabel(h: HandRecord, team: number): string {
  if (!h.result || !h.contract) return 'Thrown in';
  const o = h.result.outcome;
  if (h.contract.makerTeam !== team) return 'other';
  return o === 'euchre' || o === 'loneDefenderEuchre' ? 'Euchred' : o === 'march' || o === 'lonerMarch' ? 'Marched' : 'Made 3-4';
}

function run(deals: number, first: number, worlds: number): void {
  const results: Results = {};
  const rng = createRng(18_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });
  let decisions = 0;

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    let b: BiddingState = startBidding(dealHand(dealer, rng));
    while (b.turn !== null) {
      const seat = b.turn;
      const isDecision = b.phase === 'afterCall' && b.maker !== null && seat === partnerOf(b.maker) && b.makerLoner === null && b.loneDefender === null;
      if (isDecision) break;
      b = applyBidAction(b, bidder.bid(bidView(b, seat, [0, 0], 10)));
    }
    if (b.turn === null) continue;
    const seat = b.turn;
    const trump = b.trump!;
    if (features(b.hands[seat]!, trump).trumps < 3) continue;
    decisions++;

    const team = teamOf(seat);
    const play = (s: BiddingState): [number, string] => {
      const h = finishHand(s, players(), [0, 0], 10);
      return [!h.result ? 0 : h.result.team === team ? h.result.points : -h.result.points, outcomeLabel(h, team)];
    };
    const pass = play(applyBidAction(b, { type: 'pass' }));
    const alone = play(applyBidAction(b, { type: 'goAlone' }));
    const round = b.history.some((e) => e.action.type === 'orderUp') ? 'Round 1 (partner ordered up)' : 'Round 2 (partner named)';
    const where = seat === dealer ? 'you are the dealer' : 'you are on the dealer’s right';
    for (const k of [...handKey(b.hands[seat]!, trump).map((h) => `All|${h}`), `Situation|${round}, ${where}`]) {
      const st = (results[k] ??= { n: 0, sum: {}, dsq: 0, outcomes: {} });
      st.n++;
      st.sum.Pass = (st.sum.Pass ?? 0) + pass[0];
      st.sum.Alone = (st.sum.Alone ?? 0) + alone[0];
      st.dsq += (alone[0] - pass[0]) ** 2;
      for (const [o, [, label]] of Object.entries({ Pass: pass, Alone: alone })) {
        const oc = (st.outcomes[o] ??= {});
        oc[label] = (oc[label] ?? 0) + 1;
      }
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/partner-alone-from${first}.json`, JSON.stringify(results));
  console.log(`deals ${deals}, decisions with 3+ trumps ${decisions}`);
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: {}, dsq: 0, outcomes: {} });
      a.n += s.n;
      a.dsq += s.dsq;
      for (const o of Object.keys(s.sum)) a.sum[o] = (a.sum[o] ?? 0) + s.sum[o]!;
      for (const o of Object.keys(s.outcomes)) {
        const oc = (a.outcomes[o] ??= {});
        for (const [l, c] of Object.entries(s.outcomes[o]!)) oc[l] = (oc[l] ?? 0) + c;
      }
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  const pct = (s: Stat, o: string, l: string) => `${Math.round((100 * (s.outcomes[o]?.[l] ?? 0)) / s.n)}%`;
  const row = (label: string, s: Stat) => {
    const m = (s.sum.Alone! - s.sum.Pass!) / s.n;
    const se = Math.sqrt(Math.max(0, s.dsq / s.n - m * m) / s.n);
    const g = Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m);
    return `| ${label} | ${s.n.toLocaleString()} | ${fmt(s.sum.Pass! / s.n)} | ${fmt(s.sum.Alone! / s.n)} | ${g} (±${(2 * se).toFixed(2)}) | ${pct(s, 'Pass', 'Marched')} | ${pct(s, 'Pass', 'Euchred')} | ${pct(s, 'Alone', 'Marched')} | ${pct(s, 'Alone', 'Made 3-4')} | ${pct(s, 'Alone', 'Euchred')} |\n`;
  };
  const head = `| Your hand | Hands | Pass | Go alone | Alone vs pass | With partner: marched | With partner: euchred | Alone: marched | Alone: made 3-4 | Alone: euchred |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  let out = `# Experiment: the maker's partner going alone (Monte Carlo card play)\n\nYour partner made trump; nobody is alone; you still have a turn and hold 3+ trumps. Average **net points per hand** for your team. Bold = outside noise (± is 2 standard errors).\n\n## By hand\n\n${head}`;
  const keys = Object.keys(all).filter((k) => k.startsWith('All|')).sort();
  for (const k of keys.filter((k) => !k.includes('off-suit Ace'))) out += row(k.slice(4), all[k]!);
  out += `\n## By hand and off-suit Ace\n\n${head}`;
  for (const k of keys.filter((k) => k.includes('off-suit Ace'))) out += row(k.slice(4), all[k]!);
  out += `\n## By situation (all 3+ trump hands)\n\n${head}`;
  for (const k of Object.keys(all).filter((k) => k.startsWith('Situation|')).sort()) out += row(k.slice(10), all[k]!);
  mkdirSync('results', { recursive: true });
  writeFileSync('results/partner-alone.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 20_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
