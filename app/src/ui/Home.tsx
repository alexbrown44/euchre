import { useState } from 'react';
import { APP_NAME, APP_TAGLINE, TARGET_MAX, TARGET_MIN } from '../config.ts';
import { DIFFICULTIES } from '../game/bots.ts';
import type { Settings, Speed } from '../settings.ts';

interface Props {
  settings: Settings;
  onChange: (update: (s: Settings) => Settings) => void;
  onStart: () => void;
  onRules: () => void;
  onLearn: () => void;
  onAbout: () => void;
  canResume: boolean;
  onResume: () => void;
}

const SPEEDS: { id: Speed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

export function Home({ settings, onChange, onStart, onRules, onLearn, onAbout, canResume, onResume }: Props) {
  const [mode, setMode] = useState<'solo' | null>('solo');
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange((s) => ({ ...s, [k]: v }));
  const step = (d: number) => onChange((s) => ({ ...s, target: Math.min(TARGET_MAX, Math.max(TARGET_MIN, s.target + d)) }));

  return (
    <main className="home">
      <header className="home-head">
        <div className="home-suits" aria-hidden="true">
          <span className="home-suit home-suit-black">♠</span>
          <span className="home-suit home-suit-red">♥</span>
          <span className="home-suit home-suit-red">♦</span>
          <span className="home-suit home-suit-black">♣</span>
        </div>
        <div className="home-brand">
          <img className="home-logo" src="/logo.svg" alt="" width={64} height={64} />
          <h1>{APP_NAME}</h1>
        </div>
        <p className="tagline">{APP_TAGLINE}</p>
        <button type="button" className="rules-link" onClick={onRules}>
          How to play: our rules →
        </button>
      </header>

      {canResume && (
        <button type="button" className="btn btn-primary resume" onClick={onResume}>
          Resume your game
        </button>
      )}

      <section className="modes" aria-label="Choose how to play">
        <button type="button" className={`mode ${mode === 'solo' ? 'mode-on' : ''}`} onClick={() => setMode('solo')}>
          <span className="mode-title">Play against bots</span>
          <span className="mode-blurb">You and a bot partner against two bots.</span>
        </button>
        <button type="button" className="mode" onClick={onLearn}>
          <span className="mode-title">Learn &amp; improve</span>
          <span className="mode-blurb">New to Euchre or a seasoned player: the rules, quizzes, and the evidence behind every call.</span>
        </button>
        <div className="mode mode-soon" aria-disabled="true">
          <span className="mode-title">Play with friends</span>
          <span className="mode-blurb">Online games with a room code. Coming soon.</span>
        </div>
      </section>

      {mode === 'solo' && (
        <section className="panel setup" aria-label="Game settings">
          <fieldset>
            <legend>Bot strength</legend>
            <div className="seg">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} type="button" className={settings.difficulty === d.id ? 'on' : ''} aria-pressed={settings.difficulty === d.id} onClick={() => set('difficulty', d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
            <p className="hint">{DIFFICULTIES.find((d) => d.id === settings.difficulty)!.blurb}</p>
          </fieldset>

          <fieldset>
            <legend>
              Game to <strong>{settings.target}</strong> points
            </legend>
            <div className="target-row">
              <button type="button" className="btn btn-small" aria-label="Fewer points" onClick={() => step(-1)} disabled={settings.target <= TARGET_MIN}>
                −
              </button>
              <input
                type="range"
                min={TARGET_MIN}
                max={TARGET_MAX}
                step={1}
                value={settings.target}
                onChange={(e) => set('target', Number(e.target.value))}
                aria-label="Points needed to win"
              />
              <button type="button" className="btn btn-small" aria-label="More points" onClick={() => step(1)} disabled={settings.target >= TARGET_MAX}>
                +
              </button>
            </div>
            <div className="target-ends">
              <span>{TARGET_MIN}</span>
              <span>{TARGET_MAX}</span>
            </div>
          </fieldset>

          <fieldset>
            <legend>Bot speed</legend>
            <div className="seg">
              {SPEEDS.map((sp) => (
                <button key={sp.id} type="button" className={settings.speed === sp.id ? 'on' : ''} aria-pressed={settings.speed === sp.id} onClick={() => set('speed', sp.id)}>
                  {sp.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="button" className="btn btn-primary start" onClick={onStart}>
            {canResume ? 'Start a new game' : 'Deal'}
          </button>
        </section>
      )}

      <footer className="home-foot">
        <button type="button" className="home-foot-link" onClick={onAbout}>
          About &amp; feedback
        </button>
      </footer>
    </main>
  );
}
