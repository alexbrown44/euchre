// About this app, and where to send feedback.
import { APP_NAME, FEEDBACK_EMAIL } from '../config.ts';

export function About({ onBack }: { onBack: () => void }) {
  const mail = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} app feedback`)}`;
  return (
    <main className="rules about">
      <header className="rules-bar">
        <button type="button" className="btn btn-small rules-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1>About &amp; feedback</h1>
      </header>

      <div className="about-card">
        <img className="about-logo" src="/logo.svg" alt="" width={72} height={72} />
        <div>
          <p>
            This app was built by Alex, using Claude. It plays Euchre by our Cornish pub-league house rules, and its strategy
            advice comes from simulating hundreds of thousands of hands.
          </p>
          <p>Any feedback, please email:</p>
          <a className="btn btn-primary about-mail" href={mail}>
            {FEEDBACK_EMAIL}
          </a>
          <p className="hint">Ideas, bugs, a rule that doesn&apos;t match your league: all welcome.</p>
        </div>
      </div>
    </main>
  );
}
