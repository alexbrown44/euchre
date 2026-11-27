// Learn: two tracks over the same material. "New to Euchre" starts from the rules; "Sharpen your
// game" goes straight to the decisions where good players differ.
import { useState } from 'react';
import { getRecord, getTrack, setTrack, type QuizId, type Track } from './progress.ts';

interface Item {
  title: string;
  blurb: string;
  route?: string;
  quiz?: QuizId;
  soon?: boolean;
}

const TRACKS: Record<Track, { label: string; intro: string; items: Item[] }> = {
  new: {
    label: 'New to Euchre',
    intro: 'Start with the rules, test yourself, then try some clear-cut calling decisions.',
    items: [
      { title: 'The rules', blurb: 'How the game works, in plain language, including our house rules.', route: 'rules' },
      { title: 'Rules quiz', blurb: '10 quick questions a round on the cards, the calling and the scoring.', route: 'quiz/rules', quiz: 'rules' },
      { title: 'Would you call? (starter)', blurb: 'Real hands with a clear right answer: order it up, name a suit, or pass?', route: 'quiz/bidding-beginner', quiz: 'bidding-beginner' },
      { title: 'The one-page card', blurb: 'The strategy guide\'s key advice on a single page.', route: 'guide/the-one-page-card' },
      { title: 'Your first hand', blurb: 'A guided deal that explains each step as it happens.', soon: true },
      { title: 'Guided practice game', blurb: 'A real game against easy bots, with hints on every turn.', soon: true },
    ],
  },
  sharpen: {
    label: 'Sharpen your game',
    intro: 'The decisions where pub players differ, answered by simulating hundreds of thousands of hands.',
    items: [
      { title: 'Would you call?', blurb: 'Real hands, including the close ones. See how much each choice is worth.', route: 'quiz/bidding', quiz: 'bidding' },
      { title: 'Strategy guide', blurb: 'Every rule of thumb, with the evidence behind it.', route: 'guide' },
      { title: 'What would you play?', blurb: 'Card-play puzzles: leads, letting it go, stoppers.', soon: true },
      { title: 'Coached play and hand review', blurb: 'Play the Hard bots, then see which decisions cost you points.', soon: true },
      { title: 'Your weak spots', blurb: 'Your accuracy by topic, so you know what to practise.', soon: true },
    ],
  },
};

export function Learn({ onBack, onGo }: { onBack: () => void; onGo: (route: string) => void }) {
  const [track, pick] = useState<Track | null>(getTrack);
  const choose = (t: Track) => {
    setTrack(t);
    pick(t);
  };

  return (
    <main className="rules learn">
      <header className="rules-bar">
        <button type="button" className="btn btn-small rules-back" onClick={onBack} aria-label="Back to the front page">
          ←
        </button>
        <h1>Learn</h1>
      </header>

      {track === null && <p className="rules-lead">New to Euchre, or want to sharpen up? Pick a track. You can switch at any time.</p>}

      <div className="seg learn-tracks" role="tablist" aria-label="Track">
        {(Object.keys(TRACKS) as Track[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={track === t} className={track === t ? 'on' : ''} onClick={() => choose(t)}>
            {TRACKS[t].label}
          </button>
        ))}
      </div>

      {track && (
        <>
          <p className="hint learn-intro">{TRACKS[track].intro}</p>
          <div className="learn-items">
            {TRACKS[track].items.map((it) => {
              const rec = it.quiz ? getRecord(it.quiz) : null;
              return it.soon ? (
                <div key={it.title} className="mode mode-soon" aria-disabled="true">
                  <span className="mode-title">{it.title}</span>
                  <span className="mode-blurb">{it.blurb} Coming soon.</span>
                </div>
              ) : (
                <button key={it.title} type="button" className="mode" onClick={() => onGo(it.route!)}>
                  <span className="mode-title">{it.title}</span>
                  <span className="mode-blurb">{it.blurb}</span>
                  {rec && (
                    <span className="learn-best">
                      Best: {rec.best}/{rec.total} · {rec.rounds} {rec.rounds === 1 ? 'round' : 'rounds'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
