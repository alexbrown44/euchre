// Learn mode: quiz content and links stay valid when the guide or the rules page change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guideToHtml } from '../src/learn/guideHtml.ts';
import { RULES_QUESTIONS } from '../src/learn/rulesQuiz.ts';
import { actionKey, bestOption, grade, guideChoice, guideHeading, type BankQuestion } from '../src/learn/bidding.ts';
import type { Seat } from '../../engine/src/deal.ts';

const guide = guideToHtml(readFileSync(new URL('../../STRATEGY_GUIDE.md', import.meta.url), 'utf8'));
const headingTexts = new Set(guide.headings.map((h) => h.text.replace(/\s*\(F\d+(?:, F\d+)*\)\s*$/, '').toLowerCase()));

test('every guide section a bidding answer links to exists in the guide', () => {
  const opt = (action: BankQuestion['guide'], mean: number) => ({ action, mean, margin: 0 });
  for (const phase of ['round1', 'round2'] as const) {
    for (let seat = 0; seat < 4; seat++) {
      for (const alone of [false, true]) {
        const call = phase === 'round1' ? { type: 'orderUp' as const, alone } : { type: 'name' as const, suit: 'H' as const, alone };
        const q: BankQuestion = {
          id: 't', level: 'seasoned', dealer: 0, seat: seat as Seat, phase, hand: [], upcard: '9S', history: [],
          options: [opt({ type: 'pass' }, 0), opt(call, 1)], guide: { type: 'pass' }, samples: 1,
        };
        const h = guideHeading(q);
        assert.ok(headingTexts.has(h.toLowerCase()), `missing guide heading: "${h}"`);
      }
    }
  }
});

test('the guide has the one-page card the Learn page links to', () => {
  assert.ok(guide.headings.some((h) => h.id === 'the-one-page-card'));
});

test('rules quiz: unique ids, four different options, and sections that exist on the rules page', () => {
  const rulesPage = readFileSync(new URL('../src/ui/Rules.tsx', import.meta.url), 'utf8');
  const ids = new Set<string>();
  for (const q of RULES_QUESTIONS) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.equal(new Set(q.options).size, 4, `question ${q.id} needs 4 different options`);
    assert.ok(rulesPage.includes(`id="${q.section}"`), `question ${q.id}: no section ${q.section} on the rules page`);
  }
  assert.ok(RULES_QUESTIONS.length >= 30);
});

test('bidding answers: the best is right, close calls are fine, clear losers are wrong', () => {
  const q: BankQuestion = {
    id: 't', level: 'seasoned', dealer: 0, seat: 1, phase: 'round1', hand: [], upcard: '9S', history: [], guide: { type: 'pass' }, samples: 300,
    options: [
      { action: { type: 'pass' }, mean: 0.1, margin: 0.1 },
      { action: { type: 'orderUp', alone: false }, mean: 0.6, margin: 0 },
      { action: { type: 'orderUp', alone: true }, mean: 0.57, margin: 0.08 },
    ],
  };
  assert.equal(actionKey(bestOption(q).action), 'orderUp');
  assert.equal(grade(q, 'orderUp'), 'best');
  assert.equal(grade(q, 'orderUp-alone'), 'fine');
  assert.equal(grade(q, 'pass'), 'wrong');
});

test('the bidding bank, once built, has valid questions at both levels', () => {
  const bank = JSON.parse(readFileSync(new URL('../src/learn/data/bidding-bank.json', import.meta.url), 'utf8')) as BankQuestion[];
  if (bank.length === 0) return;
  for (const q of bank) {
    assert.equal(q.hand.length, 5);
    assert.ok(q.options.length >= 2);
    assert.ok(q.options.some((o) => grade(q, actionKey(o.action)) === 'wrong'), `${q.id}: every option is right`);
  }
  assert.ok(bank.some((q) => q.level === 'beginner'));
  assert.ok(bank.some((q) => q.level === 'seasoned'));
});

test("the guide's choice follows the guide's written rules", () => {
  const spot = (seatFromDealer: number, phase: 'round1' | 'round2', hand: string[], upcard: string): BankQuestion => ({
    id: 't', level: 'seasoned', dealer: 0, seat: (seatFromDealer % 4) as Seat, phase, hand, upcard, history: [], guide: { type: 'pass' }, samples: 0, options: [],
  });
  const k = (q: BankQuestion) => actionKey(guideChoice(q));
  // Left of dealer: pass with 3 trumps; Benny + Right + Left pass; 4 with two top trumps alone.
  assert.equal(k(spot(1, 'round1', ['JS', 'AS', 'KS', 'AH', '9D'], '9S')), 'pass');
  assert.equal(k(spot(1, 'round1', ['BENNY', 'JS', 'JC', '9H', '9D'], '9S')), 'pass');
  assert.equal(k(spot(1, 'round1', ['JS', 'JC', 'KS', 'QS', '9D'], '9S')), 'orderUp-alone');
  // Right of dealer: Benny + Right + Left alone.
  assert.equal(k(spot(3, 'round1', ['BENNY', 'JS', 'JC', '9H', '9D'], '9S')), 'orderUp-alone');
  // Dealer's partner: Up and Down with 4 trumps, pass with 3.
  assert.equal(k(spot(2, 'round1', ['JS', 'AS', 'KS', 'QS', '9D'], '9S')), 'orderUp-alone');
  assert.equal(k(spot(2, 'round1', ['JS', 'AS', 'KS', 'AH', '9D'], '9S')), 'pass');
  // Dealer: 3 trumps pick up; Right + 1 picks up unless three outside suits; 3 trumps (2 big) + outside Ace alone.
  assert.equal(k(spot(0, 'round1', ['QS', '10S', '9H', 'KH', 'QD'], '9S')), 'orderUp');
  assert.equal(k(spot(0, 'round1', ['JS', '9H', 'KH', 'QD', 'KD'], '9S')), 'orderUp');
  assert.equal(k(spot(0, 'round1', ['JS', '9H', 'QD', 'KC', '10H'], '9S')), 'pass');
  assert.equal(k(spot(0, 'round1', ['JS', 'AS', 'AH', '9D', '10D'], '9S')), 'orderUp-alone');
  // Round two, left of dealer: next with 2 and an off-suit Ace; opposite colour needs a top trump.
  assert.equal(k(spot(1, 'round2', ['AC', 'QC', 'AH', '9D', '10D'], '9S')), 'name-C');
  assert.equal(k(spot(1, 'round2', ['AH', 'KH', 'QH', '9D', '10C'], '9S')), 'pass');
  // Dealer, last: pass with 2 trumps.
  assert.equal(k(spot(0, 'round2', ['AC', 'QC', 'KH', '9D', '10D'], '9S')), 'pass');
});

test('Benny go-alone questions: valid hands, the guide\'s rule, and a wrong answer in each', () => {
  const benny = JSON.parse(readFileSync(new URL('../src/learn/data/benny-bank.json', import.meta.url), 'utf8')) as BankQuestion[];
  assert.ok(benny.length >= 10);
  for (const q of benny) {
    assert.equal(q.phase, 'bennyAlone');
    assert.equal(q.hand.length, 5);
    assert.ok(q.hand.includes('BENNY'), `${q.id}: you hold the Benny`);
    assert.ok(q.discard && !q.hand.includes(q.discard), `${q.id}: the discard is not in your hand`);
    assert.equal(actionKey(q.guide), actionKey(guideChoice(q)), q.id);
    assert.ok(q.options.some((o) => grade(q, actionKey(o.action)) === 'wrong'), `${q.id}: every option is right`);
    assert.ok(headingTexts.has(guideHeading(q).toLowerCase()));
  }
  assert.ok(benny.some((q) => q.level === 'beginner') && benny.some((q) => q.level === 'seasoned'));
});

test('the bank records the written guide\'s choice', () => {
  const bank = JSON.parse(readFileSync(new URL('../src/learn/data/bidding-bank.json', import.meta.url), 'utf8')) as BankQuestion[];
  for (const q of bank) assert.equal(actionKey(q.guide), actionKey(guideChoice(q)), q.id);
});
