import { useCallback, useEffect, useRef, useState } from 'react';
import { Home } from './ui/Home.tsx';
import { Game } from './ui/Game.tsx';
import { Rules } from './ui/Rules.tsx';
import { Learn } from './learn/Learn.tsx';
import { Guide } from './learn/Guide.tsx';
import { RulesQuiz } from './learn/RulesQuiz.tsx';
import { BiddingQuiz } from './learn/BiddingQuiz.tsx';
import { FirstHand } from './learn/FirstHand.tsx';
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
  // Pages other than the front page and the game have their own address (#rules, #learn,
  // #guide/<section>, #quiz/<name>), so the browser's back button and shared links work.
  const [route, setRoute] = useState(() => location.hash.slice(1));
  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // The quiz in progress, kept while its "Read the rule" or guide links are open.
  const [quizRoute, setQuizRoute] = useState<string | null>(() => (location.hash.startsWith('#quiz/') ? location.hash.slice(1) : null));
  useEffect(() => {
    if (route.startsWith('quiz/')) setQuizRoute(route);
    else if (!route.startsWith('rules') && !route.startsWith('guide')) setQuizRoute(null);
  }, [route]);
  // How many pages deep we've gone within the app, so Back can use the browser's history.
  const depth = useRef(0);
  const go = (to: string) => {
    depth.current++;
    location.hash = to;
    window.scrollTo(0, 0);
  };
  const back = () => {
    if (depth.current > 0) {
      depth.current--;
      history.back();
      return;
    }
    // Opened directly from a link: go up a level instead of leaving the app.
    const up = route.startsWith('quiz/') || route.startsWith('guide') || route === 'first-hand' ? 'learn' : '';
    history.replaceState(null, '', up ? `#${up}` : location.pathname + location.search);
    setRoute(up);
  };

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

  if (!game) {
    const [page, arg] = [route.split('/')[0], route.split('/').slice(1).join('/') || null];
    const activeQuiz = route.startsWith('quiz/') ? route : quizRoute;
    const quiz =
      activeQuiz === 'quiz/rules' ? <RulesQuiz onBack={back} onRules={(sec) => go(`rules/${sec}`)} />
      : activeQuiz === 'quiz/bidding-beginner' ? <BiddingQuiz level="beginner" onBack={back} onGuide={(a) => go(`guide/${a}`)} />
      : activeQuiz === 'quiz/bidding' ? <BiddingQuiz level="seasoned" onBack={back} onGuide={(a) => go(`guide/${a}`)} />
      : null;
    const other =
      page === 'rules' ? <Rules section={arg} onBack={back} />
      : page === 'learn' ? <Learn onBack={back} onGo={go} />
      : page === 'guide' ? <Guide section={arg} onBack={back} />
      : page === 'first-hand' ? <FirstHand onBack={back} onGo={go} />
      : null;
    // A quiz stays open underneath while you read a rule or the guide from it, so you keep your place.
    if (quiz) {
      const reading = route !== activeQuiz;
      return (
        <>
          <div hidden={reading}>{quiz}</div>
          {reading && other}
        </>
      );
    }
    if (other) return other;
  }

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
      onRules={() => go('rules')}
      onLearn={() => go('learn')}
      canResume={!!resumable}
      onResume={() => {
        if (!resumable) return;
        setGame({ state: resumable.state, settings: { ...resumable.settings, speed: settings.speed } });
        setGameKey((k) => k + 1);
      }}
    />
  );
}
