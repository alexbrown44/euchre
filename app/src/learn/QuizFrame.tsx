// The frame every quiz shares: a header with progress, the question, and the end-of-round summary.
import type { ReactNode } from 'react';

export function QuizFrame({ title, index, total, score, onBack, children }: {
  title: string;
  index: number;
  total: number;
  score: number;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main className="rules quiz">
      <header className="rules-bar">
        <button type="button" className="btn btn-small rules-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1>{title}</h1>
        <img className="bar-logo" src="/logo-mark.svg" alt="" width={26} height={39} />
      </header>
      <div className="quiz-progress" aria-label={`Question ${Math.min(index + 1, total)} of ${total}, ${score} right so far`}>
        <span>
          Question {Math.min(index + 1, total)} of {total}
        </span>
        <span className="quiz-score">{score} right</span>
        <div className="quiz-bar" aria-hidden="true">
          <div style={{ width: `${(100 * index) / total}%` }} />
        </div>
      </div>
      {children}
    </main>
  );
}

export function QuizEnd({ score, total, best, onAgain, onBack, children }: {
  score: number;
  total: number;
  best: { best: number; total: number } | null;
  onAgain: () => void;
  onBack: () => void;
  children?: ReactNode;
}) {
  const pct = Math.round((100 * score) / total);
  const verdict = pct === 100 ? 'Perfect round!' : pct >= 80 ? 'Well played.' : pct >= 50 ? 'Getting there.' : 'Keep practising: it comes quickly.';
  return (
    <section className="quiz-end">
      <p className="quiz-end-score">
        {score} <small>out of</small> {total}
      </p>
      <p className="quiz-end-verdict">{verdict}</p>
      {best && (
        <p className="hint">
          Your best: {best.best} out of {best.total}
        </p>
      )}
      {children}
      <div className="quiz-end-actions">
        <button type="button" className="btn btn-primary" onClick={onAgain}>
          Another round
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Back to Learn &amp; improve
        </button>
      </div>
    </section>
  );
}
