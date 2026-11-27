// "Would you call?": real bidding spots, marked against the simulator's measured best choice.
import { useMemo, useState } from 'react';
import { cardLabel, parseCard, sortHand, SUIT_NAME, SUIT_SYMBOL } from '../../../engine/src/cards.ts';
import type { Seat } from '../../../engine/src/deal.ts';
import bank from './data/bidding-bank.json';
import bennyBank from './data/benny-bank.json';
import {
  actionKey, bestOption, cards, describeHand, grade, guideHeading, guideRule, optionLabel, whyTheyDiffer, pts, ROLE_TEXT, roleOf, saidLabel, seatName,
  type BankQuestion, type Grade, type Level,
} from './bidding.ts';
import { guideAnchor } from './guideDoc.ts';
import { getRecord, getSeen, markSeen, recordRound } from './progress.ts';
import { QuizEnd, QuizFrame } from './QuizFrame.tsx';
import { CardView } from '../ui/CardView.tsx';
import { SuitText } from './SuitText.tsx';

/** Calling spots, plus going alone after a blind call on a turned-up Benny (Finding 19). */
const BANK = [...(bank as unknown as BankQuestion[]), ...(bennyBank as unknown as BankQuestion[])];
const ROUND = 10;

function pickRound(level: Level): BankQuestion[] {
  const pool = BANK.filter((q) => q.level === level);
  const seen = getSeen();
  const shuffle = (xs: BankQuestion[]) => xs.map((q) => [Math.random(), q] as const).sort((a, b) => a[0] - b[0]).map(([, q]) => q);
  // Questions you haven't answered yet come first.
  return [...shuffle(pool.filter((q) => !seen.has(q.id))), ...shuffle(pool.filter((q) => seen.has(q.id)))].slice(0, ROUND);
}

const VERDICT: Record<Grade, string> = {
  best: 'Best choice.',
  fine: 'Fine: as good as the best, near enough.',
  wrong: 'Not the best here.',
};

export function BiddingQuiz({ level, onBack, onGuide }: { level: Level; onBack: () => void; onGuide: (anchor: string) => void }) {
  const quizId = level === 'beginner' ? 'bidding-beginner' : 'bidding';
  const [round, setRound] = useState(() => pickRound(level));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getRecord(quizId));
  const done = index >= round.length;
  const q = round[index];

  const choose = (key: string) => {
    if (chosen || !q) return;
    setChosen(key);
    if (grade(q, key) !== 'wrong') setScore((s) => s + 1);
  };
  const next = () => {
    if (q) markSeen([q.id]);
    setChosen(null);
    const n = index + 1;
    if (n >= round.length) setBest(recordRound(quizId, score, round.length));
    setIndex(n);
  };
  const again = () => {
    setRound(pickRound(level));
    setIndex(0);
    setChosen(null);
    setScore(0);
  };

  const title = level === 'beginner' ? 'Would you call? (starter)' : 'Would you call?';
  if (round.length === 0) {
    return (
      <QuizFrame title={title} index={0} total={1} score={0} onBack={onBack}>
        <p className="rules-lead">No questions yet.</p>
      </QuizFrame>
    );
  }
  return (
    <QuizFrame title={title} index={index} total={round.length} score={score} onBack={onBack}>
      {done ? (
        <QuizEnd score={score} total={round.length} best={best} onAgain={again} onBack={onBack} />
      ) : (
        <Question key={q!.id} q={q!} chosen={chosen} onChoose={choose} onNext={next} onGuide={onGuide} last={index + 1 >= round.length} />
      )}
    </QuizFrame>
  );
}

function Question({ q, chosen, onChoose, onNext, onGuide, last }: {
  q: BankQuestion;
  chosen: string | null;
  onChoose: (key: string) => void;
  onNext: () => void;
  onGuide: (anchor: string) => void;
  last: boolean;
}) {
  const hand = useMemo(() => sortHand(cards(q.hand), q.trump ?? null), [q]);
  const benny = q.phase === 'bennyAlone';
  const up = cards([q.upcard])[0]!;
  const role = roleOf(q.seat, q.dealer);
  const dealerName = seatName(q, q.dealer);
  const round1 = q.history.slice(0, q.phase === 'round2' ? 4 : q.history.length);
  const round2 = q.phase === 'round2' ? q.history.slice(4) : [];
  const best = bestOption(q);
  const sorted = [...q.options].sort((a, b) => b.mean - a.mean);
  const g = chosen ? grade(q, chosen) : null;
  const heading = guideHeading(q);
  const anchor = guideAnchor(heading);
  const guideKey = actionKey(q.guide);
  const guideGrade = grade(q, guideKey);
  const guideOpt = q.options.find((o) => actionKey(o.action) === guideKey);

  const calls = (hs: { seat: Seat; action: BankQuestion['guide'] }[]) =>
    hs.length === 0 ? <span className="hint">Nobody has spoken yet.</span> : hs.map((h, i) => (
      <span key={i} className="quiz-call">
        <strong>{seatName(q, h.seat)}:</strong> {saidLabel(h.action)}
      </span>
    ));

  return (
    <section className="quiz-q bid-q">
      <div className="bid-situation">
        <p>
          <strong>{dealerName === 'You' ? 'You are the dealer.' : `${dealerName} is the dealer.`}</strong>{' '}
          {dealerName !== 'You' && <>You are {ROLE_TEXT[role]}.</>} Score 0–0, game to 10.
        </p>
        <div className="bid-table">
          <div className="bid-upcard">
            <CardView card={up} size="table" dimmed={q.phase === 'round2'} />
            <span>{q.phase === 'round2' ? 'turned down' : 'turned up'}</span>
          </div>
          <div className="bid-calls">
            {benny && q.trump ? (
              <>
                <p className="bid-round">
                  The Benny was turned up, so you named trumps blind, before looking at your cards:{' '}
                  <strong>
                    <SuitText text={`${SUIT_NAME[q.trump]} ${SUIT_SYMBOL[q.trump]}`} />
                  </strong>
                  .
                </p>
                <p className="bid-round">
                  You picked up your hand and the Benny{q.discard && <>, and discarded the <SuitText text={cardLabel(parseCard(q.discard))} /> face down</>}.
                </p>
              </>
            ) : q.phase === 'round2' ? (
              <>
                <p className="bid-round">Round one: everyone passed.</p>
                <p className="bid-round">Round two so far:</p>
                <div className="quiz-calls">{calls(round2)}</div>
              </>
            ) : (
              <>
                <p className="bid-round">Round one so far:</p>
                <div className="quiz-calls">{calls(round1)}</div>
              </>
            )}
          </div>
        </div>
        <p className="quiz-question">
          {benny
            ? 'Now you can see your cards. Go alone, or keep your partner?'
            : q.phase === 'round1'
            ? role === 'dealer'
              ? 'Everyone has passed to you. Pick it up, or pass?'
              : 'Your call. Order it up, or pass?'
            : `Your call. Name a suit (not ${SUIT_NAME[up.kind === 'suited' ? up.suit : 'S'].toLowerCase()}), or pass?`}
        </p>
      </div>

      <div className="hand quiz-hand" aria-label="Your hand">
        {hand.map((c, i) => (
          <CardView key={i} card={c} size="hand" />
        ))}
      </div>

      <div className={`quiz-options ${q.phase === 'round2' ? 'quiz-options-grid' : ''}`}>
        {q.options.map((o) => {
          const key = actionKey(o.action);
          const gr = chosen ? grade(q, key) : null;
          const state = !chosen ? '' : key === chosen ? (gr === 'wrong' ? 'quiz-wrong' : 'quiz-right') : gr === 'best' ? 'quiz-right' : 'quiz-faded';
          return (
            <button key={key} type="button" className={`quiz-option ${state} ${o.action.type === 'pass' ? 'quiz-option-pass' : ''}`} onClick={() => onChoose(key)} disabled={!!chosen && key !== chosen && gr !== 'best'}>
              {optionLabel(q, o.action)}
            </button>
          );
        })}
      </div>

      {chosen && g && (
        <div className={`quiz-feedback ${g === 'wrong' ? 'no' : 'ok'}`} role="status">
          <p>
            <strong>{VERDICT[g]}</strong> {g !== 'best' && <>The best choice is <strong>{optionLabel(q, best.action)}</strong>.</>}
          </p>
          {describeHand(q).map((line) => (
            <p key={line} className="bid-hand-note"><SuitText text={line} /></p>
          ))}
          <table className="bid-results">
            <caption>Average points per hand for your team</caption>
            <tbody>
              {sorted.map((o) => {
                const key = actionKey(o.action);
                const gr = grade(q, key);
                return (
                  <tr key={key} className={key === chosen ? 'bid-chosen' : ''}>
                    <td>
                      {optionLabel(q, o.action)}
                      {key === chosen && <span className="bid-you"> your choice</span>}
                    </td>
                    <td className="num">{pts(o.mean)}</td>
                    <td className="bid-mark">{gr === 'best' ? '✔ best' : gr === 'fine' ? '≈ close' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {guideGrade === 'wrong' ? (
            <div className="bid-views">
              <h3>Two views on this hand</h3>
              <div className="bid-view">
                <p className="bid-view-label">The guide's rule of thumb</p>
                <p>
                  <SuitText text={guideRule(q)} />
                </p>
                <p>
                  For this hand it points to <strong>{optionLabel(q, q.guide)}</strong>
                  {guideOpt && <> ({pts(guideOpt.mean)} points a hand)</>}.
                </p>
              </div>
              <div className="bid-view">
                <p className="bid-view-label">The simulator, for this exact hand</p>
                <p>
                  <strong>{optionLabel(q, best.action)}</strong> ({pts(best.mean)} points a hand)
                  {guideOpt && <>, {pts(best.mean - guideOpt.mean).replace('+', '')} more than the rule's choice</>}.
                </p>
              </div>
              <p className="bid-view-label">Why they can differ</p>
              <ul className="bid-why">
                {whyTheyDiffer(q).map((r) => (
                  <li key={r}>
                    <SuitText text={r} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="bid-guide-note">
              The guide's rule of thumb says <strong>{optionLabel(q, q.guide)}</strong>
              {guideGrade === 'fine' && actionKey(best.action) !== guideKey ? ', which is about as good here.' : ', which is right here.'}
            </p>
          )}
          <p className="hint bid-method">
            Measured by dealing the hidden cards {q.samples} different ways{benny ? '' : ' (keeping only deals that fit the calls so far)'} and playing
            each choice out. Choices too close to the best to tell apart (within 0.05 points a hand, or within the measuring error) count as right.
          </p>
          <div className="quiz-feedback-actions">
            {anchor && (
              <button type="button" className="btn btn-small" onClick={() => onGuide(anchor)}>
                Guide: {heading.replace(/ \(.*\)$/, '')}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {last ? 'See your score' : 'Next hand'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

