// The strategy guide, read in the app. The text is STRATEGY_GUIDE.md at the repository root.
import { useEffect, useMemo } from 'react';
import { GUIDE } from './guideDoc.ts';

export function Guide({ section, onBack }: { section: string | null; onBack: () => void }) {
  const doc = GUIDE;
  const contents = useMemo(() => doc.headings.filter((h) => h.level === 2), [doc]);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Opened at a section (e.g. from a quiz answer): jump straight there.
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [section]);

  return (
    <main className="rules guide">
      <header className="rules-bar">
        <button type="button" className="btn btn-small rules-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <img className="bar-logo" src="/logo.svg" alt="" width={34} height={34} />
        <h1>Strategy guide</h1>
      </header>

      <details className="guide-contents">
        <summary>Contents</summary>
        <nav aria-label="Guide sections">
          {contents.map((h) => (
            <button key={h.id} type="button" onClick={() => go(h.id)}>
              {h.text}
            </button>
          ))}
        </nav>
      </details>

      <article className="guide-body" dangerouslySetInnerHTML={{ __html: doc.html }} />

      <button type="button" className="btn btn-primary rules-done" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
