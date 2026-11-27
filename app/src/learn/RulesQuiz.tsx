// The rules quiz: 10 questions a round, drawn from the house rules.
import { useMemo, useState } from 'react';
import { RULES_QUESTIONS, type RulesQuestion } from './rulesQuiz.ts';
import { QuizEnd, QuizFrame } from './QuizFrame.tsx';
import { SuitText } from './SuitText.tsx';
import { getRecord, recordRound } from './progress.ts';

const ROUND = 10;

function shuffled<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Asked {
  q: RulesQuestion;
  options: string[];
}

const newRound = (): Asked[] => shuffled(RULES_QUESTIONS).slice(0, ROUND).map((q) => ({ q, options: shuffled(q.options) }));

export function RulesQuiz({ onBack, onRules }: { onBack: () => void; onRules: (section: string) => void }) {
  const [round, setRound] = useState(newRound);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<RulesQuestion[]>([]);
  const [best, setBest] = useState(() => getRecord('rules'));
  const done = index >= round.length;
  const asked = round[index];
  const right = useMemo(() => asked?.q.options[0], [asked]);

  const choose = (o: string) => {
    if (chosen || !asked) return;
    setChosen(o);
    if (o === right) setScore((s) => s + 1);
    else setMissed((m) => [...m, asked.q]);
  };
  const next = () => {
    setChosen(null);
    const n = index + 1;
    if (n >= round.length) setBest(recordRound('rules', score, round.length));
    setIndex(n);
  };
  const again = () => {
    setRound(newRound());
    setIndex(0);
    setChosen(null);
    setScore(0);
    setMissed([]);
  };

  return (
    <QuizFrame title="Rules quiz" index={index} total={round.length} score={score} onBack={onBack}>
      {done ? (
        <QuizEnd score={score} total={round.length} best={best} onAgain={again} onBack={onBack}>
          {missed.length > 0 && (
            <div className="quiz-missed">
              <h2>Worth another look</h2>
              <ul>
                {missed.map((q) => (
                  <li key={q.id}>
                    <SuitText text={q.question} /> <strong><SuitText text={q.options[0]!} /></strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </QuizEnd>
      ) : (
        <section className="quiz-q">
          <p className="quiz-question">
            <SuitText text={asked!.q.question} />
          </p>
          <div className="quiz-options">
            {asked!.options.map((o) => {
              const state = !chosen ? '' : o === right ? 'quiz-right' : o === chosen ? 'quiz-wrong' : 'quiz-faded';
              return (
                <button key={o} type="button" className={`quiz-option ${state}`} onClick={() => choose(o)} disabled={!!chosen && o !== chosen && o !== right}>
                  <SuitText text={o} />
                </button>
              );
            })}
          </div>
          {chosen && (
            <div className={`quiz-feedback ${chosen === right ? 'ok' : 'no'}`} role="status">
              <strong>{chosen === right ? 'Right.' : 'Not quite.'}</strong> <SuitText text={asked!.q.explain} />
              <div className="quiz-feedback-actions">
                <button type="button" className="btn btn-small" onClick={() => onRules(asked!.q.section)}>
                  Read the rule
                </button>
                <button type="button" className="btn btn-primary" onClick={next}>
                  {index + 1 >= round.length ? 'See your score' : 'Next question'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </QuizFrame>
  );
}
