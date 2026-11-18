// Experiment: card-play tactics.
//
// Hands are bid and played by Monte Carlo bots (league-calibrated bidding). Whenever a tactic
// applies, the hand is played out from that exact card each way (every player Monte Carlo), and
// net points for the deciding player's team are compared:
//
//  1. Opening lead (first trick of the hand), makers: highest trump ("drawing"), lowest trump
//     while holding a higher one ("gone fishing"), an off-suit Ace, or the lowest off-suit card.
//     Defenders: an off-suit Ace, the lowest off-suit card, or the lowest trump.
//  2. Let it go: partner is winning the trick and you could win it instead. Let it go (lowest
//     card that doesn't win) or take it (lowest card that wins).
//  2b. Let it go, partner still to play: you play before your partner and could win now. Go low
//     and leave it to your partner, or win it now.
//  3. Trumping in: you're out of the suit led and an opponent is winning. Trump in (lowest trump
//     that wins) or throw off (lowest non-trump).
//
// Usage:
//   node experiments/card-play.ts run [hands=20000] [firstHand=0] [worlds=20] [onlyTactic]
//   node experiments/card-play.ts combine results/card-play-from*.json

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isTrump, sameCard, trumpRank, type Card } from '../src/cards.ts';
import { dealHand, partnerOf, teamOf, type Seat } from '../src/deal.ts';
import { createRng } from '../src/rng.ts';
import { applyBidAction, contractOf, startBidding } from '../src/bidding.ts';
import { bidView, playView, type Agent } from '../src/game.ts';
import { applyPlay, legalPlays, makerTricks, startPlay, type PlayState } from '../src/play.ts';
import { scoreHand } from '../src/scoring.ts';
import { LEAGUE_RULE_PARAMS } from '../src/bots/ruleBot.ts';
import { monteCarloBot } from '../src/bots/monteCarlo.ts';
import { keepValue } from '../src/bots/evaluate.ts';
import { highestUnseenTrump, isBoss, knowledgeOf, partnerIsWinning, playersAfterMe, wouldWinNow } from '../src/bots/knowledge.ts';

/** Optional: only record tactics whose name starts with this (6th argument). */
const ONLY = process.argv[2] === 'run' ? process.argv[6] : undefined;

interface Stat { n: number; sum: Record<string, number> }
type Results = Record<string, Stat>; // key = tactic|situation

const lowest = (cards: Card[], trump: Parameters<typeof keepValue>[1]) => [...cards].sort((a, b) => keepValue(a, trump) - keepValue(b, trump))[0]!;
const highest = (cards: Card[], trump: Parameters<typeof keepValue>[1]) => [...cards].sort((a, b) => keepValue(b, trump) - keepValue(a, trump))[0]!;

function run(hands: number, first: number, worlds: number): void {
  const results: Results = {};
  const rng = createRng(9_000_000 + first);
  let seed = first * 1000;
  const players = (): Agent[] => [0, 1, 2, 3].map(() => monteCarloBot({ worlds, params: LEAGUE_RULE_PARAMS, seed: seed++ }));
  const main = players();

  /** Play the hand out from `state` and return net points for `seat`'s team. */
  const finish = (state: PlayState, seat: Seat): number => {
    const agents = players();
    let s = state;
    while (s.turn !== null) s = applyPlay(s, agents[s.turn]!.play(playView(s, s.turn, [0, 0], 10, upcard)));
    const r = scoreHand(s.contract, makerTricks(s));
    return r.team === teamOf(seat) ? r.points : -r.points;
  };
  const record = (key: string, options: Record<string, Card>, state: PlayState, seat: Seat) => {
    if (ONLY && !key.startsWith(ONLY)) return;
    // Only compare genuinely different cards.
    const distinct = Object.entries(options).filter(([, c], i, all) => all.findIndex(([, d]) => sameCard(c, d)) === i);
    if (distinct.length < 2) return;
    const st = (results[key] ??= { n: 0, sum: {} });
    st.n++;
    for (const [name, card] of Object.entries(options)) {
      st.sum[name] = (st.sum[name] ?? 0) + finish(applyPlay(state, card), seat);
    }
  };

  let upcard: Card;
  for (let i = first; i < first + hands; i++) {
    const deal = dealHand((i % 4) as Seat, rng);
    upcard = deal.upcard;
    let b = startBidding(deal);
    while (b.turn !== null) b = applyBidAction(b, main[b.turn]!.bid(bidView(b, b.turn, [0, 0], 10)));
    if (b.phase !== 'done') continue;
    const contract = contractOf(b);
    if (contract.makerLoner !== null || contract.loneDefender !== null) continue; // 4-handed play only
    let state = startPlay(contract, deal.dealer);
    const trump = contract.trump;

    while (state.turn !== null) {
      const seat = state.turn;
      const v = playView(state, seat, [0, 0], 10, upcard);
      const legal = legalPlays(state);
      const onMakers = teamOf(seat) === contract.makerTeam;
      const trumps = legal.filter((c) => isTrump(c, trump));
      const offs = legal.filter((c) => !isTrump(c, trump));
      const trickNo = state.tricks.length + 1;
      const k = knowledgeOf(v);

      // 1. Opening lead.
      if (trickNo === 1 && state.current.plays.length === 0) {
        const nT = Math.min(trumps.length, 3);
        const offAces = offs.filter((c) => c.kind === 'suited' && c.rank === 'A');
        if (onMakers && trumps.length >= 1) {
          const top = highest(trumps, trump);
          const boss = trumpRank(top, trump) > highestUnseenTrump(k, trump) ? 'holding the top trump' : 'not holding the top trump';
          const role = seat === contract.maker ? 'maker' : "maker's partner";
          const opts: Record<string, Card> = { 'Highest trump (draw)': top };
          if (trumps.length >= 2) opts['Lowest trump (gone fishing)'] = lowest(trumps, trump);
          if (offAces.length) opts['Off-suit Ace'] = offAces[0]!;
          if (offs.length) opts['Lowest off-suit'] = lowest(offs, trump);
          record(`Opening lead (makers)|${role}, ${nT === 3 ? '3+' : nT} trumps, ${boss}`, opts, state, seat);
        } else if (!onMakers && offs.length) {
          const opts: Record<string, Card> = { 'Lowest off-suit': lowest(offs, trump) };
          if (offAces.length) opts['Off-suit Ace'] = offAces[0]!;
          if (trumps.length) opts['Lowest trump'] = lowest(trumps, trump);
          record(`Opening lead (defenders)|${nT === 3 ? '3+' : nT} trumps, ${offAces.length ? 'holding an off-suit Ace' : 'no off-suit Ace'}`, opts, state, seat);
        }
      }

      if (state.current.plays.length > 0 && legal.length >= 2) {
        const winners = legal.filter((c) => wouldWinNow(v, c));
        const losers = legal.filter((c) => !wouldWinNow(v, c));
        const after = playersAfterMe(v);
        const side = onMakers ? 'makers' : 'defenders';

        // 2. Let it go.
        if (partnerIsWinning(v) && winners.length && losers.length) {
          const partnerCard = state.current.plays.find((p) => p.seat === partnerOf(seat))!.card;
          const safe = after === 0 ? 'last to play' : isBoss(partnerCard, k, trump) ? "opponent still to play, partner's card can't be beaten" : "opponent still to play, partner's card could be beaten";
          record(`Let it go|${side}, ${safe}`, { 'Let it go': lowest(losers, trump), 'Take it': lowest(winners, trump) }, state, seat);
        }

        // 2b. Let it go, partner still to play: you play before your partner and could win now,
        // but go low and leave it for your partner.
        const partnerPlayed = state.current.plays.some((p) => p.seat === partnerOf(seat));
        if (!partnerPlayed && !partnerIsWinning(v) && winners.length && losers.length) {
          const myWinner = lowest(winners, trump);
          const kind = isTrump(myWinner, trump) ? 'winning with a trump' : 'winning with the suit led';
          const safe = isBoss(myWinner, k, trump) ? "my winner can't be beaten" : 'my winner could be beaten';
          // How strong is my hand overall? Trumps held (going low is about saving strength for later).
          const held = v.hand.filter((c) => isTrump(c, trump)).length;
          const strengthLabel = held >= 3 ? 'I hold 3+ trumps' : held === 2 ? 'I hold 2 trumps' : held === 1 ? 'I hold 1 trump' : 'I hold no trumps';
          record(`Let it go, partner still to play|${side}, ${kind}, ${safe}, ${strengthLabel}`, { 'Go low (leave it to partner)': lowest(losers, trump), 'Win it now': myWinner }, state, seat);
        }

        // 3. Trumping in.
        const ledSuitTrump = isTrump(state.current.plays[0]!.card, trump);
        if (!ledSuitTrump && !partnerIsWinning(v) && offs.length && trumps.length) {
          const winningTrumps = trumps.filter((c) => wouldWinNow(v, c));
          const voidInLed = legal.length === v.hand.length; // can play anything = can't follow
          if (voidInLed && winningTrumps.length) {
            const pos = after === 0 ? 'last to play' : after === 1 ? 'one opponent still to play' : 'two players still to play';
            record(`Trumping in|${side}, ${pos}, trick ${trickNo}`, { 'Trump in': lowest(winningTrumps, trump), 'Throw off': lowest(offs, trump) }, state, seat);
          }
        }
      }

      state = applyPlay(state, main[seat]!.play(v));
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/card-play${ONLY ? '-' + ONLY.replace(/[^a-z]+/gi, '-').toLowerCase() : ''}-from${first}.json`, JSON.stringify(results));
}

function combine(files: string[]): void {
  const all: Results = {};
  for (const f of files) {
    for (const [k, s] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Results)) {
      const a = (all[k] ??= { n: 0, sum: {} });
      a.n += s.n;
      for (const [o, v] of Object.entries(s.sum)) a.sum[o] = (a.sum[o] ?? 0) + v;
    }
  }
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  let out = `# Experiment: card-play tactics (Monte Carlo play for everyone)\n\nAverage **net points per hand** for the deciding player's team, for each card choice from the same position. Only four-handed hands (no loners).\n`;
  const tactics = [...new Set(Object.keys(all).map((k) => k.split('|')[0]!))];
  for (const t of tactics) {
    out += `\n## ${t}\n\n| Situation | Hands | Results by choice | Best |\n|---|---:|---|---|\n`;
    for (const [k, s] of Object.entries(all).filter(([k]) => k.startsWith(t + '|')).sort(([a], [b]) => a.localeCompare(b))) {
      if (s.n < 200) continue;
      const opts = Object.entries(s.sum).map(([o, v]) => [o, v / s.n] as const).sort((a, b) => b[1] - a[1]);
      out += `| ${k.split('|')[1]} | ${s.n.toLocaleString()} | ${opts.map(([o, v]) => `${o}: ${fmt(v)}`).join('; ')} | ${opts[0]![0]} |\n`;
    }
  }
  mkdirSync('results', { recursive: true });
  writeFileSync('results/card-play.md', out);
  console.log(out);
}

if (process.argv[2] === 'combine') combine(process.argv.slice(3));
else run(Number(process.argv[3] ?? 20_000), Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 20));

