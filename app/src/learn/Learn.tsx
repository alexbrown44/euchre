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

const TRACKS: Record<Track, { label: string; pitch: string; suit: string; red: boolean; intro: string; items: Item[] }> = {
  new: {
    label: 'New to Euchre',
    pitch: 'The rules, a quiz, and hands with a clear right answer.',
    suit: '♦',
    red: true,
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
    pitch: 'Close calls and the evidence behind every rule of thumb.',
    suit: '♠',
    red: false,
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

  const ready = track ? TRACKS[track].items.filter((it) => !it.soon) : [];
  const soon = track ? TRACKS[track].items.filter((it) => it.soon) : [];

  return (
    <main className="rules learn">
      <header className="rules-bar">
        <button type="button" className="btn btn-small rules-back" onClick={onBack} aria-label="Back to the front page">
          ←
        </button>
        <h1>Learn &amp; improve</h1>
      </header>

      <section className="learn-hero">
        <h2>Get better at Euchre</h2>
        <p>{track === null ? 'New to the game, or after an edge at the pub? Pick a track. You can switch at any time.' : 'Pick up where you left off, or switch track below.'}</p>
      </section>

      <div className="learn-tracks" role="tablist" aria-label="Track">
        {(Object.keys(TRACKS) as Track[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={track === t} className={`learn-track ${track === t ? 'learn-track-on' : ''}`} onClick={() => choose(t)}>
            <span className={`learn-track-suit ${TRACKS[t].red ? 'home-suit-red' : 'home-suit-black'}`} aria-hidden="true">{TRACKS[t].suit}</span>
            <span className="learn-track-text">
              <span className="learn-track-label">{TRACKS[t].label}</span>
              <span className="learn-track-pitch">{TRACKS[t].pitch}</span>
              {track === null && (
                <span className="learn-track-has">
                  {TRACKS[t].items.filter((it) => !it.soon).map((it) => it.title.replace(/ \(starter\)$/, '')).join(' · ')}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {track && (
        <>
          <p className="learn-intro">{TRACKS[track].intro}</p>
          <ol className="learn-items">
            {ready.map((it, i) => {
              const rec = it.quiz ? getRecord(it.quiz) : null;
              return (
                <li key={it.title}>
                  <button type="button" className="learn-item" onClick={() => onGo(it.route!)}>
                    <span className="learn-step" aria-hidden="true">{i + 1}</span>
                    <span className="learn-item-text">
                      <span className="mode-title">{it.title}</span>
                      <span className="mode-blurb">{it.blurb}</span>
                      {rec && (
                        <span className="learn-best">
                          Best {rec.best}/{rec.total} · {rec.rounds} {rec.rounds === 1 ? 'round' : 'rounds'}
                        </span>
                      )}
                    </span>
                    <span className="learn-go" aria-hidden="true">›</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {soon.length > 0 && (
            <>
              <h3 className="learn-soon-head">Coming soon</h3>
              <ul className="learn-soon">
                {soon.map((it) => (
                  <li key={it.title}>
                    <span className="mode-title">{it.title}</span>
                    <span className="mode-blurb">{it.blurb}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
