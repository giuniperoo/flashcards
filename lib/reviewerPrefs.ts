import { DEFAULT_FIRST_INTERVAL, clampFirstInterval } from "./schedule";

/**
 * What the reviewer remembers about this reader, apart from their progress.
 *
 * Two things. Whether the color key beside the strip has already opened by
 * itself: it opens once, the first time a scheduled session starts, and never
 * again unasked. And how soon a card answered wrong comes back, in hours — see
 * `FIRST_INTERVALS` in `lib/schedule.ts`. The index is where that one is set,
 * at the foot of the page beside the mode switch, but the reviewer is what reads
 * it when a card is graded.
 *
 * Neither is in `prefs:index`, which `lib/prefs.ts` says in its first paragraph
 * is for what the index acts on, and progress is no place for a setting.
 *
 * `firstInterval` arrived inside version 1, the way `misses` arrived inside the
 * progress store's version 4: a store without it reads as a day, which is what
 * box 1 always was, so there is nothing to migrate.
 */

export const REVIEWER_PREFS_KEY = "prefs:reviewer";
export const REVIEWER_PREFS_VERSION = 1;

export type ReviewerPrefs = {
  /** The color key has opened on its own once. */
  colorKeyShown: boolean;
  /** Hours before a card answered wrong comes back. 24 is the ordinary day. */
  firstInterval: number;
};

export const DEFAULT_REVIEWER_PREFS: ReviewerPrefs = {
  colorKeyShown: false,
  firstInterval: DEFAULT_FIRST_INTERVAL,
};

/**
 * Only a stored `true` counts as the key shown, and only a value on the list
 * counts as an interval. Anything else — nothing stored, a private window, a
 * mangled value — reads as the default, and the worst that does is show the key
 * once more or bring a red card back in a day.
 */
export function loadReviewerPrefs(): ReviewerPrefs {
  if (typeof window === "undefined") return DEFAULT_REVIEWER_PREFS;
  try {
    const raw = window.localStorage.getItem(REVIEWER_PREFS_KEY);
    if (!raw) return DEFAULT_REVIEWER_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReviewerPrefs> | null;
    return {
      colorKeyShown: parsed?.colorKeyShown === true,
      firstInterval: clampFirstInterval(parsed?.firstInterval),
    };
  } catch {
    return DEFAULT_REVIEWER_PREFS;
  }
}

/**
 * Writes the fields given over what is stored, so the reviewer marking the key
 * shown cannot reset the interval the index set, and the other way round.
 */
export function saveReviewerPrefs(changes: Partial<ReviewerPrefs>) {
  try {
    const next = { ...loadReviewerPrefs(), ...changes };
    window.localStorage.setItem(
      REVIEWER_PREFS_KEY,
      JSON.stringify({ version: REVIEWER_PREFS_VERSION, ...next }),
    );
  } catch {
    // Not remembered. The key may open by itself once more, or a red card come
    // back in a day. Nothing worse.
  }
}
