// Card-play puzzles for "What would you play?".
//
// A hand is dealt and bid by league bots, then played by Monte Carlo bots up to one of your turns
// (seat 0) where you have a real choice. Each card you could play is then measured: the cards you
// can't see are dealt `samples` different ways, keeping only deals that fit everything you know
// (the calls made, who has run out of which suit, and the cards played), and the hand is played
// out from the same deal after each card, with Monte Carlo card play for all four players.
//
// Usage:
//   node experiments/quiz-play.ts run <spots> <first> [samples=200] [worlds=12]  -> out/quiz-play/<first>.json
//   node experiments/quiz-play.ts combine [out=../app/src/learn/data/play-bank.json]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cardId, effectiveSuit, isTrump, sameCard, trickWinnerIndex, type Card } from '../src/cards.ts';
import { newDeck } from '../src/deck.ts';
import { dealHand, partnerOf, teamOf, type Deal, type Seat } from '../src/deal.ts';
import { createRng, shuffle, type Rng } from '../src/rng.ts';
import { applyBidAction, contractOf, startBidding, type BidAction, type BiddingState, type BidEvent } from '../src/bidding.ts';
import { bidView, playView, type Agent } from '../src/game.ts';
import { applyPlay, legalPlays, makerTricks, startPlay, type PlayState } from '../src/play.ts';
import { scoreHand } from '../src/scoring.ts';
import { DEFAULT_PARAMS, LEAGUE_RULE_PARAMS, ruleBot } from '../src/bots/ruleBot.ts';
import { monteCarloBot, sampleWorld } from '../src/bots/monteCarlo.ts';

const SCORE = [0, 0] as const;
const TARGET = 10;
const ME: Seat = 0;
const CLOSE = 0.05; // as in the app: closer than this counts as "fine"
const DIR = 'out/quiz-play';

const bidder = ruleBot(LEAGUE_RULE_PARAMS);
const guideBot = ruleBot(DEFAULT_PARAMS);

const key = (a: BidAction): string =>
  a.type === 'discard' ? `discard-${cardId(a.card)}`
  : a.type === 'name' ? `name-${a.suit}${a.alone ? '-alone' : ''}`
  : a.type === 'orderUp' ? `orderUp${a.alone ? '-alone' : ''}`
  : a.type;

const playedBy = (p: PlayState, seat: Seat): Card[] =>
  [...p.tricks.flatMap((t) => t.plays), ...p.current.plays].filter((x) => x.seat === seat).map((x) => x.card);

const allPlays = (p: PlayState) => [...p.tricks.flatMap((t) => t.plays), ...p.current.plays];

/**
 * A deal of the hidden cards that fits what you know at this point, with the calls replayed by
 * league bots. Returns the play state at your turn in that deal, or null if this try didn't fit.
 */
function world(spot: PlayState, b: BiddingState, rng: Rng): PlayState | null {
  const deal = b.deal;
  const v = playView(spot, ME, SCORE, TARGET, deal.upcard);
  const hands = sampleWorld(v, rng, 20);
  if (!hands) return null;
  const c = spot.contract;
  const up = deal.upcard;
  const original: Card[][] = [[], [], [], []];
  original[ME] = [...deal.hands[ME]!];
  const used = new Set<string>(original[ME].map(cardId));
  let discard: Card | null = null;
  for (const s of spot.active) {
    if (s === ME) continue;
    original[s] = [...hands[s]!, ...playedBy(spot, s)];
    for (const x of original[s]) used.add(cardId(x));
  }
  if (c.dealerPickedUp && deal.dealer === ME) discard = c.discard;
  let rest = shuffle(newDeck().filter((x) => !used.has(cardId(x)) && !sameCard(x, up) && !(discard && sameCard(x, discard))), rng);
  for (const s of c.sittingOut) {
    original[s] = rest.slice(0, 5);
    rest = rest.slice(5);
  }
  if (c.dealerPickedUp && deal.dealer !== ME) {
    // The dealer's hand now holds the upcard (or played it); before picking up, it held their discard instead.
    const d = deal.dealer;
    discard = rest[0]!;
    rest = rest.slice(1);
    original[d] = [...original[d]!.filter((x) => !sameCard(x, up)), discard];
  }
  if (rest.length !== 4) return null; // 25 cards: 4 hands of 5, the upcard and 4 more in the kitty
  const kitty = [up, ...rest];
  if (original.some((h) => h.length !== 5)) return null;
  const d2: Deal = { dealer: deal.dealer, hands: original, upcard: up, kitty };

  // Replay the calls. The dealer's discard must be the card this deal says they threw.
  let s = startBidding(d2);
  for (const ev of b.history) {
    const a = bidder.bid(bidView(s, ev.seat, SCORE, TARGET));
    const want: BidAction = ev.action.type === 'discard' ? { type: 'discard', card: discard! } : ev.action;
    if (key(a) !== key(want)) return null;
    s = applyBidAction(s, a);
  }
  if (s.phase !== 'done') return null;
  let p = startPlay(contractOf(s), deal.dealer);
  try {
    for (const x of allPlays(spot)) p = applyPlay(p, x.card);
  } catch {
    return null;
  }
  return p.turn === ME ? p : null;
}

function finish(start: PlayState, agents: Agent[], upcard: Card): number {
  let s = start;
  while (s.turn !== null) s = applyPlay(s, agents[s.turn]!.play(playView(s, s.turn, SCORE, TARGET, upcard)));
  const r = scoreHand(s.contract, makerTricks(s));
  return r.team === teamOf(ME) ? r.points : -r.points;
}

/** What sort of decision this is, for the puzzle's heading and for balancing the bank. */
function topic(p: PlayState): string {
  const c = p.contract;
  const makers = teamOf(ME) === c.makerTeam;
  const plays = p.current.plays;
  const alone = c.makerLoner !== null ? (makers ? 'loner-maker' : 'loner-defend') : c.loneDefender !== null ? (makers ? 'vs-lone-defender' : 'lone-defender') : '';
  if (alone && alone !== 'loner-defend' && plays.length === 0) return `${alone}-lead`;
  if (alone === 'loner-defend') return plays.length === 0 ? 'loner-defend-lead' : 'loner-defend-follow';
  if (alone) return `${alone}-follow`;
  if (plays.length === 0) return `${makers ? 'maker' : 'defender'}-${p.tricks.length === 0 ? 'opening' : 'later'}-lead`;
  const led = effectiveSuit(plays[0]!.card, p.trump);
  const hand = p.hands[ME]!;
  const canFollow = hand.some((x) => effectiveSuit(x, p.trump) === led);
  const winner = plays[trickWinnerIndex(plays.map((x) => x.card), p.trump)]!.seat;
  if (!canFollow) return winner === partnerOf(ME) ? 'void-partner-winning' : 'void-opponent-winning';
  return winner === partnerOf(ME) ? 'follow-partner-winning' : 'follow-opponent-winning';
}

interface Option { card: string; mean: number; margin: number }

function measure(spot: PlayState, b: BiddingState, samples: number, worlds: number, rng: Rng, seed: number) {
  const legal = legalPlays(spot);
  const sums = legal.map(() => 0);
  const per: number[][] = legal.map(() => []);
  let n = 0;
  let triesUsed = 0;
  for (let tries = 0; n < samples && tries < samples * 400; tries++) {
    triesUsed = tries + 1;
    const w = world(spot, b, rng);
    if (!w) continue;
    n++;
    legal.forEach((card, i) => {
      const agents = ([0, 1, 2, 3] as Seat[]).map((s) =>
        monteCarloBot({ worlds, params: s === ME ? DEFAULT_PARAMS : LEAGUE_RULE_PARAMS, seed: seed + n * 8 + s }));
      const x = finish(applyPlay(w, card), agents, b.deal.upcard);
      sums[i] += x;
      per[i]!.push(x);
    });
    // Give up early on spots where every card is about as good.
    if (n === 40) {
      const m = sums.map((x) => x / n);
      if (Math.max(...m) - Math.min(...m) < 0.12) return null;
    }
  }
  if (n < samples / 2) return null;
  const means = sums.map((x) => x / n);
  const best = means.indexOf(Math.max(...means));
  const options: Option[] = legal.map((card, i) => {
    const d = per[i]!.map((x, k) => x - per[best]![k]!);
    const md = d.reduce((a, x) => a + x, 0) / n;
    const sd = Math.sqrt(Math.max(0, d.reduce((a, x) => a + x * x, 0) / n - md * md));
    return { card: cardId(card), mean: Number(means[i]!.toFixed(3)), margin: Number((2 * sd / Math.sqrt(n)).toFixed(3)) };
  });
  return { options, n, tries: triesUsed };
}

/** Play a dealt hand with Monte Carlo bots, and pick one of your turns with a real choice. */
function findSpot(rng: Rng, seed: number): { spot: PlayState; b: BiddingState } | null {
  const dealer = Math.floor(rng() * 4) as Seat;
  const deal = dealHand(dealer, rng);
  let b = startBidding(deal);
  while (b.turn !== null) b = applyBidAction(b, bidder.bid(bidView(b, b.turn, SCORE, TARGET)));
  if (b.phase !== 'done') return null; // thrown in
  let p = startPlay(contractOf(b), dealer);
  if (!p.active.includes(ME)) return null;
  const agents = ([0, 1, 2, 3] as Seat[]).map((s) => monteCarloBot({ worlds: 16, params: LEAGUE_RULE_PARAMS, seed: seed + s }));
  const choices: PlayState[] = [];
  while (p.turn !== null) {
    if (p.turn === ME && legalPlays(p).length >= 2 && p.tricks.length <= 3) choices.push(p);
    p = applyPlay(p, agents[p.turn]!.play(playView(p, p.turn, SCORE, TARGET, deal.upcard)));
  }
  if (choices.length === 0) return null;
  return { spot: choices[Math.floor(rng() * choices.length)]!, b };
}

function run(spots: number, first: number, samples: number, worlds: number) {
  const rng = createRng(77_000_000 + first);
  const out: unknown[] = [];
  const started = performance.now();
  let seed = first * 1_000_000;
  for (let i = 0; out.length < spots && i < spots * 20; i++) {
    seed += 10_000;
    const found = findSpot(rng, seed);
    if (!found) continue;
    const { spot, b } = found;
    const t = topic(spot);
    const m = measure(spot, b, samples, worlds, rng, seed);
    const guide = cardId(guideBot.play(playView(spot, ME, SCORE, TARGET, b.deal.upcard)));
    const elapsed = ((performance.now() - started) / 1000).toFixed(0);
    if (!m) {
      console.error(`${first}/${i} ${t}: too close or no fit, skipped (${elapsed}s)`);
      continue;
    }
    console.error(`${first}/${i} ${t}: ${m.options.map((o) => `${o.card} ${o.mean.toFixed(2)}`).join(', ')} guide ${guide} n=${m.n} trick ${spot.tricks.length + 1} tries ${m.tries} (${elapsed}s)`);
    const c = spot.contract;
    out.push({
      id: `play-${first}-${i}`,
      topic: t,
      dealer: b.deal.dealer,
      seat: ME,
      upcard: cardId(b.deal.upcard),
      trump: c.trump,
      maker: c.maker,
      makerLoner: c.makerLoner,
      loneDefender: c.loneDefender,
      dealerPickedUp: c.dealerPickedUp,
      myDiscard: b.deal.dealer === ME && c.discard ? cardId(c.discard) : null,
      history: b.history.filter((e) => e.action.type !== 'discard' || b.deal.dealer === ME).map((e: BidEvent) => ({ seat: e.seat, action: e.action.type === 'discard' ? { type: 'discard', card: cardId(e.action.card) } : e.action })),
      tricks: spot.tricks.map((tr) => ({ leader: tr.leader, winner: tr.winner, plays: tr.plays.map((x) => ({ seat: x.seat, card: cardId(x.card) })) })),
      current: { leader: spot.current.leader, plays: spot.current.plays.map((x) => ({ seat: x.seat, card: cardId(x.card) })) },
      hand: spot.hands[ME]!.map(cardId),
      options: m.options,
      guide,
      samples: m.n,
    });
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/${first}.json`, JSON.stringify(out, null, 1));
  }
  console.error(`batch ${first}: ${out.length} spots`);
}

interface Spot { id: string; topic: string; options: Option[]; guide: string; hand: string[] }

function combine(outPath: string) {
  const spots = readdirSync(DIR).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Spot[]);
  const kept: unknown[] = [];
  const perTopic = new Map<string, number>();
  const PER_TOPIC = 12;
  for (const s of spots) {
    const best = Math.max(...s.options.map((o) => o.mean));
    const ok = (o: Option) => best - o.mean <= Math.max(CLOSE, o.margin);
    // Keep spots with at least one clearly worse card: otherwise every answer is right.
    if (s.options.every(ok)) continue;
    const g = s.options.find((o) => o.card === s.guide)!;
    // Starter: the guide's card is best (or as good), and the wrong cards cost a lot.
    const wrongGap = Math.min(...s.options.filter((o) => !ok(o)).map((o) => best - o.mean));
    const level = ok(g) && wrongGap >= 0.4 ? 'beginner' : 'seasoned';
    // Balance the bank: at most PER_TOPIC puzzles of each kind at each level.
    const k = `${s.topic}|${level}`;
    if ((perTopic.get(k) ?? 0) >= PER_TOPIC) continue;
    perTopic.set(k, (perTopic.get(k) ?? 0) + 1);
    kept.push({ ...s, level });
  }
  writeFileSync(outPath, JSON.stringify(kept, null, 1) + '\n');
  const count = (lv: string) => kept.filter((k) => (k as { level: string }).level === lv).length;
  console.log(`${kept.length} of ${spots.length} spots kept (${count('beginner')} starter, ${count('seasoned')} seasoned) -> ${outPath}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'run') run(Number(args[0] ?? 5), Number(args[1] ?? 1), Number(args[2] ?? 200), Number(args[3] ?? 12));
else if (cmd === 'combine') combine(args[0] ?? '../app/src/learn/data/play-bank.json');
else console.error('usage: run <spots> <first> [samples] [worlds] | combine [out]');
