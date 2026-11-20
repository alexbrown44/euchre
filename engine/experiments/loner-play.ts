// Experiment: card play in loner hands.
//
// Hands are bid and played by Monte Carlo bots (league-calibrated bidding). In hands with a loner
// (maker alone against two defenders) or a lone defender (one defender against two makers),
// whenever one of these decisions comes up the hand is played out from that exact card each way
// (every player Monte Carlo), and net points for the deciding player's team are compared:
//
//  Against a loner:
//   1. The loner's lead (any trick, while trumps are still out): highest trump (draw), lowest
//      trump, an off-suit Ace, or the lowest off-suit card.
//   2. A defender's lead: an off-suit Ace, the lowest off-suit card, the highest off-suit card
//      that isn't an Ace, the lowest trump, or the highest trump.
//   3. A defender who can't follow while the loner is winning: trump in or throw off.
//   4. A defender whose partner is winning: let it go or take it.
//  Lone defender:
//   5. The lone defender's lead: an off-suit Ace, the lowest off-suit card, the lowest trump, or
//      the highest trump.
//   6. The makers' lead against a lone defender: highest trump, lowest trump, off-suit Ace, lowest off-suit.
//
// Usage:
//   node experiments/loner-play.ts run [deals=20000] [firstDeal=0] [worlds=20]
//   node experiments/loner-play.ts combine results/loner-play-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { effectiveSuit, isTrump, sameCard, trumpRank, type Card, type Suit } from '../src/cards.ts';
import { dealHand, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, contractOf, startBidding } from '../src/bidding.ts';
import { bidView, playView, type Agent } from '../src/game.ts';
import { applyPlay, legalPlays, makerTricks, startPlay, type PlayState } from '../src/play.ts';
import { scoreHand } from '../src/scoring.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { keepValue } from '../src/bots/evaluate.ts';
import { highestUnseenTrump, isBoss, knowledgeOf, partnerIsWinning, playersAfterMe, unseenTrumpCount, wouldWinNow } from '../src/bots/knowledge.ts';

// Not every option exists in every hand (e.g. an off-suit Ace). Each option's result is kept as a
// paired difference from the first option (present in every hand), over the hands where it exists.
interface Stat { n: number; sum: Record<string, number>; cnt: Record<string, number>; diff: Record<string, number> }
type Results = Record<string, Stat>; // key = tactic|situation

const lowest = (cards: Card[], trump: Suit) => [...cards].sort((a, b) => keepValue(a, trump) - keepValue(b, trump))[0]!;
const highest = (cards: Card[], trump: Suit) => [...cards].sort((a, b) => keepValue(b, trump) - keepValue(a, trump))[0]!;
const isAce = (c: Card) => c.kind === 'suited' && c.rank === 'A';

function run(deals: number, first: number, worlds: number): void {
  const results: Results = {};
  const rng = createRng(14_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const main = players();
  let upcard: Card;

  const finish = (state: PlayState, seat: Seat): number => {
    const agents = players();
    let s = state;
    while (s.turn !== null) s = applyPlay(s, agents[s.turn]!.play(playView(s, s.turn, [0, 0], 10, upcard)));
    const r = scoreHand(s.contract, makerTricks(s));
    return r.team === teamOf(seat) ? r.points : -r.points;
  };
  const record = (key: string, options: Record<string, Card>, state: PlayState, seat: Seat) => {
    const distinct = Object.entries(options).filter(([, c], i, all) => all.findIndex(([, d]) => sameCard(c, d)) === i);
    if (distinct.length < 2) return;
    const st = (results[key] ??= { n: 0, sum: {}, cnt: {}, diff: {} });
    st.n++;
    const vals = Object.entries(options).map(([name, card]) => [name, finish(applyPlay(state, card), seat)] as const);
    const base = vals[0]![1];
    for (const [name, v] of vals) {
      st.sum[name] = (st.sum[name] ?? 0) + v;
      st.cnt[name] = (st.cnt[name] ?? 0) + 1;
      st.diff[name] = (st.diff[name] ?? 0) + (v - base);
    }
  };

  for (let i = first; i < first + deals; i++) {
    const deal = dealHand((i % 4) as Seat, rng);
    upcard = deal.upcard;
    let b = startBidding(deal);
    while (b.turn !== null) b = applyBidAction(b, main[b.turn]!.bid(bidView(b, b.turn, [0, 0], 10)));
    if (b.phase !== 'done') continue;
    const contract = contractOf(b);
    const loner = contract.makerLoner !== null && contract.loneDefender === null;
    const loneDef = contract.loneDefender !== null && contract.makerLoner === null;
    if (!loner && !loneDef) continue;
    const trump = contract.trump;
    let state = startPlay(contract, deal.dealer);

    while (state.turn !== null) {
      const seat = state.turn;
      const v = playView(state, seat, [0, 0], 10, upcard);
      const legal = legalPlays(state);
      const onMakers = teamOf(seat) === contract.makerTeam;
      const trumps = legal.filter((c) => isTrump(c, trump));
      const offs = legal.filter((c) => !isTrump(c, trump));
      const trickNo = state.tricks.length + 1;
      const trick = trickNo === 1 ? 'trick 1' : 'tricks 2-4';
      const k = knowledgeOf(v);
      const leading = state.current.plays.length === 0;
      const held = v.hand.filter((c) => isTrump(c, trump)).length;
      const nT = held >= 3 ? '3+' : String(held);
      const trumpsOut = unseenTrumpCount(k, trump) > 0;
      const aces = offs.filter(isAce);

      if (leading && trickNo <= 4) {
        if ((loner || loneDef) && onMakers && trumps.length && trumpsOut) {
          // 1 / 6. The makers' lead.
          const top = highest(trumps, trump);
          const boss = trumpRank(top, trump) > highestUnseenTrump(k, trump) ? 'holding the top trump' : 'not holding the top trump';
          const opts: Record<string, Card> = { 'Highest trump (draw)': top };
          if (trumps.length >= 2) opts['Lowest trump'] = lowest(trumps, trump);
          if (aces.length) opts['Off-suit Ace'] = aces[0]!;
          if (offs.length) opts['Lowest off-suit'] = lowest(offs, trump);
          const tactic = loner ? 'Loner leads' : 'Makers lead against a lone defender';
          record(`${tactic}|${trick}, ${nT} trumps, ${boss}, ${aces.length ? 'holding an off-suit Ace' : 'no off-suit Ace'}`, opts, state, seat);
        } else if (!onMakers && offs.length) {
          // 2 / 5. A defender's lead.
          const opts: Record<string, Card> = { 'Lowest off-suit': lowest(offs, trump) };
          if (aces.length) opts['Off-suit Ace'] = aces[0]!;
          const nonAce = offs.filter((c) => !isAce(c));
          if (loner && nonAce.length) opts['Highest off-suit, not an Ace'] = highest(nonAce, trump);
          if (trumps.length) {
            opts['Lowest trump'] = lowest(trumps, trump);
            opts['Highest trump'] = highest(trumps, trump);
          }
          const tactic = loner ? 'Defender leads against a loner' : 'Lone defender leads';
          record(`${tactic}|${trick}, ${nT} trumps, ${aces.length ? 'holding an off-suit Ace' : 'no off-suit Ace'}`, opts, state, seat);
        }
      }

      if (!leading && legal.length >= 2 && !onMakers && loner) {
        const winners = legal.filter((c) => wouldWinNow(v, c));
        const losers = legal.filter((c) => !wouldWinNow(v, c));
        const after = playersAfterMe(v);
        // 3. Trump in against the loner.
        const voidInLed = legal.length === v.hand.length && !isTrump(state.current.plays[0]!.card, trump);
        const winningTrumps = trumps.filter((c) => wouldWinNow(v, c));
        if (!partnerIsWinning(v) && voidInLed && winningTrumps.length && offs.length) {
          const pos = after === 0 ? 'last to play' : 'loner still to play';
          record(`Defender trumps in against a loner|${pos}, trick ${trickNo}`, { 'Trump in': lowest(winningTrumps, trump), 'Throw off': lowest(offs, trump) }, state, seat);
        }
        // 4. Partner winning: let it go or take it.
        if (partnerIsWinning(v) && winners.length && losers.length) {
          const partnerCard = state.current.plays.find((p) => p.seat === partnerOf(seat))!.card;
          const safe = after === 0 ? 'last to play' : isBoss(partnerCard, k, trump) ? "loner still to play, partner's card can't be beaten" : "loner still to play, partner's card could be beaten";
          record(`Defender, partner winning, against a loner|${safe}`, { 'Let it go': lowest(losers, trump), 'Take it': lowest(winners, trump) }, state, seat);
        }
        // 7. Throwing off against a loner: can't follow suit, and throwing an off-suit card.
        const led = effectiveSuit(state.current.plays[0]!.card, trump);
        const cantFollow = !v.hand.some((c) => effectiveSuit(c, trump) === led);
        const throwable = offs.filter((c) => !wouldWinNow(v, c));
        if (cantFollow && throwable.length >= 2) {
          const suitOf = (c: Card) => effectiveSuit(c, trump);
          const opts: Record<string, Card> = { 'Lowest card': lowest(throwable, trump) };
          const lone = throwable.filter((c) => throwable.filter((x) => suitOf(x) === suitOf(c)).length === 1 && !isBoss(c, k, trump));
          if (lone.length) opts['Make a void (a lone card)'] = lowest(lone, trump);
          const fromLong = throwable.filter((c) => throwable.filter((x) => suitOf(x) === suitOf(c)).length >= 2);
          if (fromLong.length) opts['From a longer suit (keep every suit)'] = lowest(fromLong, trump);
          const partnerSuits = state.tricks.filter((t) => t.leader === partnerOf(seat) && !isTrump(t.plays[0]!.card, trump)).map((t) => suitOf(t.plays[0]!.card));
          const inPartner = throwable.filter((c) => partnerSuits.includes(suitOf(c)));
          const notPartner = throwable.filter((c) => !partnerSuits.includes(suitOf(c)));
          if (inPartner.length && notPartner.length) {
            opts["From partner's suit"] = lowest(inPartner, trump);
            opts["Keep partner's suit (throw elsewhere)"] = lowest(notPartner, trump);
          }
          const who = partnerIsWinning(v) ? 'partner winning' : 'loner winning';
          record(`Throwing off against a loner|${who}, ${trumps.length ? 'holding trump' : 'no trumps'}, ${trickNo <= 2 ? 'tricks 1-2' : 'tricks 3-4'}`, opts, state, seat);
        }
      }

      state = applyPlay(state, main[seat]!.play(v));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/loner-play-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: {}, cnt: {}, diff: {} });
      a.n += s.n;
      for (const o of Object.keys(s.sum)) {
        a.sum[o] = (a.sum[o] ?? 0) + s.sum[o]!;
        a.cnt[o] = (a.cnt[o] ?? 0) + s.cnt[o]!;
        a.diff[o] = (a.diff[o] ?? 0) + s.diff[o]!;
      }
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  let out = `# Experiment: card play in loner hands (Monte Carlo play for everyone)\n\nAverage **net points per hand** for the deciding player's team, for each card choice from the same position.\n`;
  const tactics = [...new Set(Object.keys(all).map((k) => k.split('|')[0]!))];
  for (const t of tactics) {
    out += `\n## ${t}\n\n| Situation | Hands | Results by choice | Best |\n|---|---:|---|---|\n`;
    for (const [k, s] of Object.entries(all).filter(([k]) => k.startsWith(t + '|')).sort(([a], [b]) => a.localeCompare(b))) {
      if (s.n < 150) continue;
      // Base option's average over all hands, plus each option's paired difference from it.
      const baseName = Object.keys(s.sum)[0]!;
      const baseAvg = s.sum[baseName]! / s.n;
      const opts = Object.keys(s.sum).map((o) => [o + (s.cnt[o]! < s.n ? ` (${Math.round((100 * s.cnt[o]!) / s.n)}% of hands)` : ''), baseAvg + s.diff[o]! / s.cnt[o]!] as const).sort((a, b) => b[1] - a[1]);
      out += `| ${k.split('|')[1]} | ${s.n.toLocaleString()} | ${opts.map(([o, v]) => `${o}: ${fmt(v)}`).join('; ')} | ${opts[0]![0]} |\n`;
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/loner-play.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 20_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));
