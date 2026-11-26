import { useCallback, useState } from 'react';
import { Home } from './ui/Home.tsx';
import { Game } from './ui/Game.tsx';
import { newGame, type TableState } from './game/table.ts';
import { SEAT_NAMES } from './config.ts';
import { loadSettings, saveSettings, type Settings } from './settings.ts';

const GAME_KEY = 'euchre.solo-game.v1';

interface Saved {
  state: TableState;
  settings: Settings;
}

function loadGame(): Saved | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return saved.state.stage === 'gameOver' ? null : saved;
  } catch {
    return null;
  }
}

function storeGame(saved: Saved | null): void {
  try {
    if (saved && saved.state.stage !== 'gameOver') localStorage.setItem(GAME_KEY, JSON.stringify(saved));
    else localStorage.removeItem(GAME_KEY);
  } catch {
    // Storage can be blocked; the game then isn't kept between visits.
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<Saved | null>(null);
  const [resumable, setResumable] = useState<Saved | null>(loadGame);
  const [gameKey, setGameKey] = useState(0);

  const changeSettings = (update: (s: Settings) => Settings) => {
    setSettings((prev) => {
      const next = update(prev);
      saveSettings(next);
      return next;
    });
  };

  const start = () => {
    const state = newGame({ target: settings.target, names: SEAT_NAMES, seed: Math.floor(Math.random() * 2 ** 31) });
    setGame({ state, settings });
    setGameKey((k) => k + 1);
  };

  const onSave = useCallback(
    (state: TableState) => {
      if (!game) return;
      const saved = { state, settings: game.settings };
      storeGame(saved);
      setResumable(state.stage === 'gameOver' ? null : saved);
    },
    [game],
  );

  if (game) {
    return (
      <Game
        key={gameKey}
        initial={game.state}
        settings={game.settings}
        onSave={onSave}
        onHome={() => setGame(null)}
        onNewGame={start}
      />
    );
  }

  return (
    <Home
      settings={settings}
      onChange={changeSettings}
      onStart={start}
      canResume={!!resumable}
      onResume={() => {
        if (!resumable) return;
        setGame({ state: resumable.state, settings: { ...resumable.settings, speed: settings.speed, fourColour: settings.fourColour } });
        setGameKey((k) => k + 1);
      }}
    />
  );
}
