// "What would you play?": card-play puzzles, marked against the simulator's measured best card.
import { useMemo, useState } from 'react';
import { cardId, parseCard, sameCard, sortHand, SUIT_NAME, SUIT_SYMBOL } from '../../../engine/src/cards.ts';
import { legalPlays } from '../../../engine/src/play.ts';
import bank from './data/play-bank.json';
import { pts, type Grade, type Level } from './bidding.ts';
import { playHint } from './coach.ts';
import {
  bestPlay, contractText, gradePlay, isMakers, label, seatName, toState, topicHeading, topicName, whyPlaysDiffer,
  type PlayQuestion,
} from './play.ts';
import { guideAnchor } from './guideDoc.ts';
import { getRecord, getSeen, markSeen, recordRound } from './progress.ts';
import { QuizEnd, QuizFrame } from './QuizFrame.tsx';
import { CardView } from '../ui/CardView.tsx';
import { SuitText } from './SuitText.tsx';

const BANK = bank as unknown as PlayQuestion[];
const ROUND = 10;

function pickRound(level: Level): PlayQuestion[] {
  const pool = BANK.filter((q) => q.level === level);
  const seen = getSeen();
  const shuffle = (xs: PlayQuestion[]) => xs.map((q) => [Math.random(), q] as const).sort((a, b) => a[0] - b[0]).map(([, q]) => q);
  return [...shuffle(pool.filter((q) => !seen.has(q.id))), ...shuffle(pool.filter((q) => seen.has(q.id)))].slice(0, ROUND);
}

const VERDICT: Record<Grade, string> = {
  best: 'Best card.',
  fine: 'Fine: as good as the best, near enough.',
  wrong: 'Not the best here.',
};

export function PlayQuiz({ level, onBack, onGuide }: { level: Level; onBack: () => void; onGuide: (anchor: string) => void }) {
  const quizId = level === 'beginner' ? 'play-beginner' : 'play';
  const [round, setRound] = useState(() => pickRound(level));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getRecord(quizId));
  const done = index >= round.length;
  const q = round[index];

  const choose = (card: string) => {
    if (chosen || !q) return;
    setChosen(card);
    if (gradePlay(q, card) !== 'wrong') setScore((s) => s + 1);
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

  const title = level === 'beginner' ? 'What would you play? (starter)' : 'What would you play?';
  if (round.length === 0) {
    return (
      <QuizFrame title={title} index={0} total={1} score={0} onBack={onBack}>
        <p className="rules-lead">No puzzles yet.</p>
      </QuizFrame>
    );
  }
  return (
    <QuizFrame title={title} index={index} total={round.length} score={score} onBack={onBack}>
      {done ? (
        <QuizEnd score={score} total={round.length} best={best} onAgain={again} onBack={onBack} />
      ) : (
        <Puzzle key={q!.id} q={q!} chosen={chosen} onChoose={choose} onNext={next} onGuide={onGuide} last={index + 1 >= round.length} />
      )}
    </QuizFrame>
  );
}

function Puzzle({ q, chosen, onChoose, onNext, onGuide, last }: {
  q: PlayQuestion;
  chosen: string | null;
  onChoose: (card: string) => void;
  onNext: () => void;
  onGuide: (anchor: string) => void;
  last: boolean;
}) {
  const state = useMemo(() => toState(q), [q]);
  const hand = useMemo(() => sortHand(state.hands[q.seat]!, q.trump), [state, q]);
  const legal = useMemo(() => legalPlays(state), [state]);
  const hint = useMemo(() => playHint(state, q.seat, [0, 0], 10, parseCard(q.upcard)), [state, q]);
  const best = bestPlay(q);
  const sorted = [...q.options].sort((a, b) => b.mean - a.mean);
  const g = chosen ? gradePlay(q, chosen) : null;
  const heading = topicHeading(q);
  const anchor = guideAnchor(heading);
  const guideGrade = gradePlay(q, q.guide);
  const guideOpt = q.options.find((o) => o.card === q.guide);
  const won = state.tricksWon;
  const us = won[q.seat % 2]!, them = won[(q.seat + 1) % 2]!;
  const trickNo = q.tricks.length + 1;
  const leading = q.current.plays.length === 0;

  return (
    <section className="quiz-q bid-q play-q">
      <p className="play-topic">{topicName(q)}</p>
      <div className="bid-situation">
        <p>
          <strong>{q.dealer === q.seat ? 'You are the dealer.' : `${seatName(q.dealer)} is the dealer.`}</strong>{' '}
          <SuitText text={contractText(q)} />
        </p>
        <p>
          Trumps: <strong><SuitText text={`${SUIT_NAME[q.trump]} ${SUIT_SYMBOL[q.trump]}`} /></strong>
          {' · '}
          {isMakers(q) ? 'Your side made trumps.' : 'You are defending.'}
          {' · '}
          Tricks: you {us}, them {them}
        </p>
        <div className="play-felt">
          {q.tricks.length > 0 && (
            <ol className="play-tricks" aria-label="Tricks so far">
              {q.tricks.map((t, i) => (
                <li key={i}>
                  <span className="play-trick-no">Trick {i + 1}</span>
                  {t.plays.map((p, k) => (
                    <span key={k} className={`play-trick-card ${p.seat === t.winner ? 'play-won' : ''}`}>
                      {seatName(p.seat)} <SuitText text={label(p.card)} />
                    </span>
                  ))}
                </li>
              ))}
            </ol>
          )}
          <p className="bid-round">
            Trick {trickNo}: {leading ? 'your lead.' : `${seatName(q.current.leader)} led.`}
          </p>
          {!leading && (
            <div className="play-current">
              {q.current.plays.map((p, i) => (
                <div key={i} className="play-current-card">
                  <CardView card={state.current.plays[i]!.card} size="table" />
                  <span>{seatName(p.seat)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="quiz-question">{chosen ? 'Your hand' : leading ? 'What do you lead?' : 'What do you play?'}</p>
      </div>

      <div className="hand quiz-hand" aria-label="Your hand">
        {hand.map((c) => {
          const id = cardId(c);
          const ok = legal.some((x) => sameCard(x, c));
          const isChosen = chosen === id;
          return (
            <CardView
              key={id}
              card={c}
              size="hand"
              playable={!chosen && ok}
              dimmed={!ok}
              highlight={isChosen}
              onClick={!chosen && ok ? () => onChoose(id) : undefined}
            />
          );
        })}
      </div>
      {!chosen && legal.length < hand.length && <p className="hint play-follow">You must follow suit: the greyed cards can't be played.</p>}

      {chosen && g && (
        <div className={`quiz-feedback ${g === 'wrong' ? 'no' : 'ok'}`} role="status">
          <p>
            <strong>{VERDICT[g]}</strong> {g !== 'best' && <>The best card is the <strong><SuitText text={label(best.card)} /></strong>.</>}
          </p>
          <table className="bid-results">
            <caption>Average points per hand for your team</caption>
            <tbody>
              {sorted.map((o) => {
                const gr = gradePlay(q, o.card);
                return (
                  <tr key={o.card} className={o.card === chosen ? 'bid-chosen' : ''}>
                    <td>
                      <SuitText text={label(o.card)} />
                      {o.card === chosen && <span className="bid-you"> your choice</span>}
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
              <h3>Two views on this position</h3>
              <div className="bid-view">
                <p className="bid-view-label">The guide's rule of thumb</p>
                {hint.why.map((w) => (
                  <p key={w}><SuitText text={w} /></p>
                ))}
                <p>
                  It points to the <strong><SuitText text={label(q.guide)} /></strong>
                  {guideOpt && <> ({pts(guideOpt.mean)} points a hand)</>}.
                </p>
              </div>
              <div className="bid-view">
                <p className="bid-view-label">The simulator, for this exact position</p>
                <p>
                  The <strong><SuitText text={label(best.card)} /></strong> ({pts(best.mean)} points a hand)
                  {guideOpt && <>, {pts(best.mean - guideOpt.mean).replace('+', '')} more than the rule's choice</>}.
                </p>
              </div>
              <p className="bid-view-label">Why they can differ</p>
              <ul className="bid-why">
                {whyPlaysDiffer(q).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bid-guide-note">
              <p>
                The guide's rule of thumb plays the <strong><SuitText text={label(q.guide)} /></strong>
                {guideGrade === 'fine' && best.card !== q.guide ? ', which is about as good here.' : ', which is right here.'}
              </p>
              {hint.why.map((w) => (
                <p key={w}><SuitText text={w} /></p>
              ))}
            </div>
          )}
          <p className="hint bid-method">
            Measured by dealing the cards you can't see {q.samples} different ways (keeping only deals that fit the calls and the cards
            played so far) and playing the hand out after each card. Cards too close to the best to tell apart (within 0.05 points a
            hand, or within the measuring error) count as right.
          </p>
          <div className="quiz-feedback-actions">
            {anchor && (
              <button type="button" className="btn btn-small" onClick={() => onGuide(anchor)}>
                Guide: {heading}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {last ? 'See your score' : 'Next puzzle'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
