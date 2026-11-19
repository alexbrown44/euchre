// Experiment: the player on the dealer's left leads the first trick. What is that worth, and
// should it change how they bid?
//
// Part A, the value of the lead. Every four-handed contract the bots reach is played out four
// times from the first trick: the same cards and the same trump, with only the opening leader
// changed. Results are seen from the player on the dealer's left: leading (as the rules say),
// playing second, third (partner leads) or last (back hand).
//
// Part B, calling by seat. At their turn, the players on the dealer's left and right are played
// out both ways: call (order up in round one; name their best suit in round two) or pass. The same
// hand shape is compared from both seats. The left player leads if their team makes trump; the
// right player's opponent (the left player) leads instead.
//
// Card play is Monte Carlo for all four players; bidding by league-calibrated bots.
//
// Usage:
//   node experiments/lead-seat.ts run [deals=5000] [firstDeal=0] [worlds=20]
//   node experiments/lead-seat.ts combine results/lead-seat-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isTrump, SUITS, trumpRank, type Card, type Suit } from '../src/cards.ts';
import { dealHand, leftOf, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, contractOf, startBidding, type BidAction, type BiddingState } from '../src/bidding.ts';
import { bidView, finishHand, playView, type Agent } from '../src/game.ts';
import { applyPlay, makerTricks, startPlay, type PlayState } from '../src/play.ts';
import { scoreHand } from '../src/scoring.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { strength } from '../src/bots/evaluate.ts';

interface Stat { n: number; sum: Record<string, number>; sq: Record<string, number> }
type Results = Record<string, Stat>; // key = part|situation
const POSITIONS = ['Lead', 'Second', 'Third (partner leads)', 'Last (back hand)'] as const;

function add(results: Results, key: string, vals: Record<string, number>, base: string): void {
  const st = (results[key] ??= { n: 0, sum: {}, sq: {} });
  st.n++;
  for (const [o, v] of Object.entries(vals)) {
    st.sum[o] = (st.sum[o] ?? 0) + v;
    st.sq[o] = (st.sq[o] ?? 0) + (v - vals[base]!) ** 2;
  }
}

/** Trumps and top trumps (Benny, Right, Left) held in a suit. */
function shape(hand: readonly Card[], trump: Suit): { trumps: number; tops: number } {
  const t = hand.filter((c) => isTrump(c, trump));
  return { trumps: t.length, tops: t.filter((c) => trumpRank(c, trump) >= 6).length };
}
const shapeLabel = (s: { trumps: number; tops: number }) =>
  `${s.trumps >= 4 ? '4+' : s.trumps} trumps, ${s.tops >= 2 ? '2+ top trumps' : s.tops === 1 ? '1 top trump' : 'no top trump'}`;

function run(deals: number, first: number, worlds: number): void {
  const results: Results = {};
  const rng = createRng(10_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const bidder = monteCarloBot({ params: LEAGUE_RULE_PARAMS });

  for (let i = first; i < first + deals; i++) {
    const dealer = (i % 4) as Seat;
    const deal = dealHand(dealer, rng);
    const upcard = deal.upcard;
    const left = leftOf(dealer);
    const right = partnerOf(left);

    // Net points for `seat`'s team when the bidding continues from `state` with `action`.
    const branch = (state: BiddingState, action: BidAction, seat: Seat): number => {
      const h = finishHand(applyBidAction(state, action), players(), [0, 0], 10);
      return !h.result ? 0 : h.result.team === teamOf(seat) ? h.result.points : -h.result.points;
    };

    // Part B: bidding, with branches at the left and right players' turns.
    let b = startBidding(deal);
    while (b.turn !== null) {
      const seat = b.turn;
      const seatName = seat === left ? 'Left of dealer' : seat === right ? 'Right of dealer' : null;
      if (seatName && upcard.kind === 'suited') {
        if (b.phase === 'round1') {
          const s = shape(deal.hands[seat]!, upcard.suit);
          if (s.trumps >= 2) {
            add(results, `Round 1|${shapeLabel(s)}|${seatName}`, {
              Pass: branch(b, { type: 'pass' }, seat),
              Call: branch(b, { type: 'orderUp', alone: false }, seat),
            }, 'Pass');
          }
        } else if (b.phase === 'round2') {
          const hand = deal.hands[seat]!;
          const best = SUITS.filter((x) => x !== upcard.suit).reduce((a, x) => (strength(hand, x) > strength(hand, a) ? x : a), SUITS.find((x) => x !== upcard.suit)!);
          const s = shape(hand, best);
          if (s.trumps >= 2) {
            add(results, `Round 2|${shapeLabel(s)}|${seatName}`, {
              Pass: branch(b, { type: 'pass' }, seat),
              Call: branch(b, { type: 'name', suit: best, alone: false }, seat),
            }, 'Pass');
          }
        }
      }
      b = applyBidAction(b, bidder.bid(bidView(b, seat, [0, 0], 10)));
    }

    // Part A: the same contract with each player leading.
    if (b.phase !== 'done') continue;
    const contract = contractOf(b);
    if (contract.makerLoner !== null || contract.loneDefender !== null) continue; // four-handed only
    const vals: Record<string, number> = {};
    POSITIONS.forEach((pos, k) => {
      // Lead: left leads. Second: the dealer leads. Third: left's partner leads. Last: dealer's partner leads.
      const leader = [left, dealer, right, partnerOf(dealer)][k]! as Seat;
      const agents = players();
      let s: PlayState = { ...startPlay(contract, dealer), current: { leader, plays: [], winner: null }, turn: leader };
      while (s.turn !== null) s = applyPlay(s, agents[s.turn]!.play(playView(s, s.turn, [0, 0], 10, upcard)));
      const r = scoreHand(s.contract, makerTricks(s));
      vals[pos] = r.team === teamOf(left) ? r.points : -r.points;
    });
    const role = contract.maker === left ? 'Maker' : contract.maker === right ? "Maker's partner" : 'Defender';
    const s = shape(contract.hands[left]!, contract.trump);
    add(results, `Lead|${role}|All hands`, vals, 'Lead');
    add(results, `Lead|${role}|${s.trumps >= 3 ? '3+' : s.trumps} trumps`, vals, 'Lead');
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/lead-seat-from${first}.json`, JSON.stringify(results));
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
  const avg = (s: Stat, o: string) => s.sum[o]! / s.n;
  /** Gain of `o` over `base`, bold when outside noise (2 standard errors). */
  const gain = (s: Stat, o: string, base: string) => {
    const m = avg(s, o) - avg(s, base);
    const se = Math.sqrt(Math.max(0, s.sq[o]! / s.n - m * m) / s.n);
    return Math.abs(m) > 2 * se ? `**${fmt(m)}**` : fmt(m);
  };

  let out = `# Experiment: the opening lead and the player on the dealer's left (Monte Carlo card play)\n\n`;
  out += `All figures are average **net points per hand** for the team of the player named. Bold = outside noise (2 standard errors).\n\n`;
  out += `## Part A: what leading the first trick is worth\n\nThe same cards and trump, played out with only the opening leader changed. Seen from the player on the dealer's left. Four-handed hands only. Columns after "Lead" show the change if this player had **not** led.\n\n`;
  out += `| Left player is | Hand | Hands | Lead | Second | Third (partner leads) | Last (back hand) |\n|---|---|---:|---:|---:|---:|---:|\n`;
  for (const role of ['Maker', "Maker's partner", 'Defender']) {
    for (const h of ['All hands', '0 trumps', '1 trumps', '2 trumps', '3+ trumps']) {
      const s = all[`Lead|${role}|${h}`];
      if (!s || s.n < 200) continue;
      out += `| ${role} | ${h} | ${s.n.toLocaleString()} | ${fmt(avg(s, 'Lead'))} | ${POSITIONS.slice(1).map((p) => gain(s, p, 'Lead')).join(' | ')} |\n`;
    }
  }
  for (const round of ['Round 1', 'Round 2']) {
    out += `\n## Part B: ${round}, call or pass, by seat\n\n`;
    out += round === 'Round 1'
      ? `Trumps counted in the upcard's suit (the dealer then picks it up). Call = order up (partner kept).\n\n`
      : `The player's best suit (not the turned-down suit). Call = name it (partner kept).\n\n`;
    out += `| Hand | Left of dealer: hands | Left: call vs pass | Right of dealer: hands | Right: call vs pass | Left minus right |\n|---|---:|---:|---:|---:|---:|\n`;
    const shapes = [...new Set(Object.keys(all).filter((k) => k.startsWith(round + '|')).map((k) => k.split('|')[1]!))].sort();
    for (const sh of shapes) {
      const l = all[`${round}|${sh}|Left of dealer`];
      const r = all[`${round}|${sh}|Right of dealer`];
      if (!l || !r || l.n < 200 || r.n < 200) continue;
      const gl = avg(l, 'Call') - avg(l, 'Pass');
      const gr = avg(r, 'Call') - avg(r, 'Pass');
      const sel = Math.sqrt(Math.max(0, l.sq.Call! / l.n - gl * gl) / l.n);
      const ser = Math.sqrt(Math.max(0, r.sq.Call! / r.n - gr * gr) / r.n);
      const d = gl - gr;
      const dTxt = Math.abs(d) > 2 * Math.hypot(sel, ser) ? `**${fmt(d)}**` : fmt(d);
      out += `| ${sh} | ${l.n.toLocaleString()} | ${gain(l, 'Call', 'Pass')} | ${r.n.toLocaleString()} | ${gain(r, 'Call', 'Pass')} | ${dTxt} |\n`;
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/lead-seat.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 5_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
