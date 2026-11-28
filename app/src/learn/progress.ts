// What the learner has done, kept in this browser only (like the saved game).

export type QuizId = 'rules' | 'bidding-beginner' | 'bidding' | 'play-beginner' | 'play';
export type Track = 'new' | 'sharpen';

export interface QuizRecord {
  best: number;
  total: number;
  rounds: number;
}

const KEY = 'euchre.learn.v1';

interface Stored {
  track?: Track;
  quizzes?: Partial<Record<QuizId, QuizRecord>>;
  /** Bidding questions answered well, so new rounds prefer ones not yet seen. */
  seen?: string[];
  /** Lessons finished. */
  done?: string[];
}

function load(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

function save(s: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage can be blocked; progress then isn't kept.
  }
}

export const getTrack = (): Track | null => load().track ?? null;
export const setTrack = (track: Track) => save({ ...load(), track });

export const getRecord = (id: QuizId): QuizRecord | null => load().quizzes?.[id] ?? null;

export function recordRound(id: QuizId, score: number, total: number): QuizRecord {
  const s = load();
  const old = s.quizzes?.[id];
  const rec: QuizRecord = {
    best: old && old.best / old.total >= score / total ? old.best : score,
    total: old && old.best / old.total >= score / total ? old.total : total,
    rounds: (old?.rounds ?? 0) + 1,
  };
  save({ ...s, quizzes: { ...s.quizzes, [id]: rec } });
  return rec;
}

export const getSeen = (): Set<string> => new Set(load().seen ?? []);
export function markSeen(ids: string[]): void {
  const s = load();
  save({ ...s, seen: [...new Set([...(s.seen ?? []), ...ids])] });
}

/** Lessons finished, such as "first-hand". */
export const isDone = (id: string): boolean => (load().done ?? []).includes(id);
export function markDone(id: string): void {
  const s = load();
  if (!(s.done ?? []).includes(id)) save({ ...s, done: [...(s.done ?? []), id] });
}
