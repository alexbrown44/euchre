// Player preferences, remembered in this browser only.
import type { Difficulty } from './game/bots.ts';
import { TARGET_MAX, TARGET_MIN } from './config.ts';

export type Speed = 'slow' | 'normal' | 'fast';

export interface Settings {
  difficulty: Difficulty;
  target: number;
  speed: Speed;
  fourColour: boolean;
}

export const DEFAULT_SETTINGS: Settings = { difficulty: 'medium', target: 10, speed: 'normal', fourColour: false };

/** Milliseconds a bot waits before moving, and a finished trick stays on the table. */
export const PACE: Record<Speed, { bot: number; trick: number }> = {
  slow: { bot: 1300, trick: 2200 },
  normal: { bot: 800, trick: 1500 },
  fast: { bot: 350, trick: 800 },
};

const KEY = 'euchre.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    s.target = Math.min(TARGET_MAX, Math.max(TARGET_MIN, Math.round(Number(s.target) || 10)));
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage can be blocked (private windows); settings then last for this visit only.
  }
}
