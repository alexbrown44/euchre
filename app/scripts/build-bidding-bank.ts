// Picks the "Would you call?" questions from the simulator's spots and writes:
//   app/src/learn/data/bidding-bank.json  (what the app uses)
//   BIDDING_QUIZ_REVIEW.md                (the same questions, for a person to check)
//
// Usage (from app/):
//   node scripts/build-bidding-bank.ts ../engine/results/quiz-bank-all.json

import { readFileSync, writeFileSync } from 'node:fs';
import { cardLabel, sortHand } from '../../engine/src/cards.ts';
import {
  actionKey, bestOption, cards, CLOSE, describeHand, grade, guideChoice, guideHeading, guideRule, optionLabel, whyTheyDiffer, pts, ROLE_TEXT, roleOf, saidLabel, seatName,
  type BankQuestion, type Level,
} from '../src/learn/bidding.ts';

type Spot = Omit<BankQuestion, 'level'>;

const src = process.argv[2] ?? '../engine/results/quiz-bank-all.json';
const spots = JSON.parse(readFileSync(src, 'utf8')) as Spot[];

/**
 * Starter questions have exactly one right answer, clearly ahead of everything else, and it's the
 * answer the guide's rule of thumb gives: beginners should learn the rules of thumb first.
 */
const BEGINNER_GAP = 0.4;
/** At most this share of each level's answers may be "pass". */
const MAX_PASS = 0.4;

const chosen: BankQuestion[] = [];
let dropped = 0;
for (const s of spots) {
  const q: BankQuestion = { ...s, level: 'seasoned' };
  // The guide's view is what the written guide says (not the Medium bot the simulator recorded).
  q.guide = guideChoice(q);
  if (!q.options.some((o) => actionKey(o.action) === actionKey(q.guide))) throw new Error(`${q.id}: the guide's choice isn't a legal option`);
  const best = bestOption(q);
  const fine = q.options.filter((o) => grade(q, actionKey(o.action)) !== 'wrong');
  // Every choice within the measuring error of the best: nothing to learn from it.
  if (fine.length === q.options.length) { dropped++; continue; }
  // The best must be clearly ahead of the nearest wrong choice.
  const wrong = q.options.filter((o) => grade(q, actionKey(o.action)) === 'wrong');
  const gap = best.mean - Math.max(...wrong.map((o) => o.mean));
  if (gap < CLOSE) { dropped++; continue; }
  const secondGap = best.mean - Math.max(...q.options.filter((o) => o !== best).map((o) => o.mean));
  const guideRight = grade(q, actionKey(q.guide)) !== 'wrong';
  q.level = fine.length === 1 && secondGap >= BEGINNER_GAP && guideRight ? 'beginner' : 'seasoned';
  chosen.push(q);
}

// Keep "pass" from dominating: most random hands are passes.
const bank: BankQuestion[] = [];
for (const level of ['beginner', 'seasoned'] as Level[]) {
  const qs = chosen.filter((q) => q.level === level);
  const calls = qs.filter((q) => bestOption(q).action.type !== 'pass');
  const passes = qs.filter((q) => bestOption(q).action.type === 'pass');
  const maxPasses = Math.floor((calls.length * MAX_PASS) / (1 - MAX_PASS));
  bank.push(...calls, ...passes.slice(0, maxPasses));
}
bank.sort((a, b) => (a.level === b.level ? a.id.localeCompare(b.id) : a.level === 'beginner' ? -1 : 1));
writeFileSync('src/learn/data/bidding-bank.json', JSON.stringify(bank));

// The review document.
const count = (level: Level, pred: (q: BankQuestion) => boolean) => bank.filter((q) => q.level === level && pred(q)).length;
let md = `# Bidding quiz: questions for review\n\n`;
md += `These are the "Would you call?" questions in the app's Learn mode. Each is a real deal: league-style bots bid until it's your turn, then every choice was scored by dealing the hidden cards a few hundred ways (keeping only deals that fit the calls so far) and playing each choice out. Numbers are **average net points per hand for your team**; score 0-0, game to 10.\n\n`;
md += `A choice counts as right if it is the best, or within ${CLOSE} points a hand of it (or within the measuring error). **Starter** questions have one clear answer, at least ${BEGINNER_GAP} points ahead of the next choice, and it's the answer the guide's rule of thumb gives.\n\n`;
md += `| | Starter | Seasoned |\n|---|---:|---:|\n`;
md += `| Questions | ${count('beginner', () => true)} | ${count('seasoned', () => true)} |\n`;
md += `| Answer is a call | ${count('beginner', (q) => bestOption(q).action.type !== 'pass')} | ${count('seasoned', (q) => bestOption(q).action.type !== 'pass')} |\n`;
md += `| Answer is alone | ${count('beginner', (q) => { const a = bestOption(q).action; return (a.type === 'orderUp' || a.type === 'name') && a.alone; })} | ${count('seasoned', (q) => { const a = bestOption(q).action; return (a.type === 'orderUp' || a.type === 'name') && a.alone; })} |\n`;
md += `| The guide's rule of thumb gets it wrong | ${count('beginner', (q) => grade(q, actionKey(q.guide)) === 'wrong')} | ${count('seasoned', (q) => grade(q, actionKey(q.guide)) === 'wrong')} |\n\n`;
md += `${spots.length} spots were simulated; ${dropped} were dropped because the choices were too close to call, and some plain passes were left out so passing doesn't dominate.\n\n`;
md += `If an answer looks wrong for our league, note its number and I'll look at it.\n`;
const differs = bank
  .filter((q) => q.level === 'seasoned')
  .map((q, i) => ({ q, n: `Q${i + 1}` }))
  .filter(({ q }) => grade(q, actionKey(q.guide)) === 'wrong');
if (differs.length) {
  md += `\n**Where the guide's rule of thumb and the simulator disagree** (worth a look, both for the quiz and for the guide): ${differs.map((d) => d.n).join(', ')}.\n`;
}

for (const level of ['beginner', 'seasoned'] as Level[]) {
  md += `\n## ${level === 'beginner' ? 'Starter' : 'Seasoned'} questions\n`;
  bank.filter((q) => q.level === level).forEach((q, i) => {
    const role = roleOf(q.seat, q.dealer);
    const dealer = seatName(q, q.dealer);
    const hand = sortHand(cards(q.hand), null).map(cardLabel).join(' ');
    const up = cardLabel(cards([q.upcard])[0]!);
    const calls = q.history.length ? q.history.map((h) => `${seatName(q, h.seat)}: ${saidLabel(h.action)}`).join(', ') : 'none yet';
    md += `\n### ${level === 'beginner' ? 'S' : 'Q'}${i + 1} · ${q.phase === 'round1' ? 'Round one' : 'Round two'}, you are ${dealer === 'You' ? 'the dealer' : ROLE_TEXT[role]}\n\n`;
    md += `- **Your hand:** ${hand} · **${q.phase === 'round1' ? 'Turned up' : 'Turned down'}:** ${up} · **Calls so far:** ${calls}\n`;
    for (const line of describeHand(q)) md += `- ${line}\n`;
    md += `- **Answer:** ${optionLabel(q, bestOption(q).action)} · guide's rule: ${optionLabel(q, q.guide)}${grade(q, actionKey(q.guide)) === 'wrong' ? ' (**differs**)' : ''} · guide section: ${guideHeading(q)}\n\n`;
    if (grade(q, actionKey(q.guide)) === 'wrong') {
      md += `> **Two views.** *Guide's rule of thumb:* ${guideRule(q)} It points to **${optionLabel(q, q.guide)}**. *Simulator, for this exact hand:* **${optionLabel(q, bestOption(q).action)}**.\n>\n> **Why they can differ:**\n`;
      for (const r of whyTheyDiffer(q)) md += `> - ${r}\n`;
      md += '\n';
    }
    md += `| Choice | Points a hand | |\n|---|---:|---|\n`;
    for (const o of [...q.options].sort((a, b) => b.mean - a.mean)) {
      const g = grade(q, actionKey(o.action));
      md += `| ${optionLabel(q, o.action)} | ${pts(o.mean)} | ${g === 'best' ? 'best' : g === 'fine' ? 'close' : ''} |\n`;
    }
  });
}
writeFileSync('../BIDDING_QUIZ_REVIEW.md', md);
console.log(`bank: ${bank.length} questions (${count('beginner', () => true)} starter, ${count('seasoned', () => true)} seasoned); ${dropped} dropped as too close`);
