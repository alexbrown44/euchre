// Player preferences, remembered in this browser only.
import type { Difficulty } from './game/bots.ts';
import { TARGET_MAX, TARGET_MIN } from './config.ts';

export type Speed = 'slow' | 'normal' | 'fast';

export interface Settings {
  difficulty: Difficulty;
  target: number;
  speed: Speed;
}

export const DEFAULT_SETTINGS: Settings = { difficulty: 'medium', target: 10, speed: 'normal' };

/** Milliseconds a bot waits before moving, and a finished trick stays on the table. */
export const PACE: Record<Speed, { bot: number; trick: number }> = {
  slow: { bot: 2200, trick: 3500 },
  normal: { bot: 1500, trick: 2500 },
  fast: { bot: 700, trick: 1300 },
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
