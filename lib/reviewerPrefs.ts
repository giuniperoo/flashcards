/**
 * What the reviewer remembers about this reader, apart from their progress.
 *
 * One thing so far: whether the color key beside the strip has already opened
 * by itself. It opens once, the first time a scheduled session starts, and never
 * again unasked. That is the reviewer's to know, not the index's, so it is not
 * in `prefs:index` — `lib/prefs.ts` says in its first paragraph what that key is
 * for — and progress is no place for a fact about the screen.
 */

export const REVIEWER_PREFS_KEY = "prefs:reviewer";
export const REVIEWER_PREFS_VERSION = 1;

export type ReviewerPrefs = {
  /** The color key has opened on its own once. */
  colorKeyShown: boolean;
};

export const DEFAULT_REVIEWER_PREFS: ReviewerPrefs = { colorKeyShown: false };

/**
 * Only a stored `true` counts. Anything else — nothing stored, a private window,
 * a mangled value — reads as never shown, and the worst that does is show the key
 * once more.
 */
export function loadReviewerPrefs(): ReviewerPrefs {
  if (typeof window === "undefined") return DEFAULT_REVIEWER_PREFS;
  try {
    const raw = window.localStorage.getItem(REVIEWER_PREFS_KEY);
    if (!raw) return DEFAULT_REVIEWER_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReviewerPrefs> | null;
    return { colorKeyShown: parsed?.colorKeyShown === true };
  } catch {
    return DEFAULT_REVIEWER_PREFS;
  }
}

export function saveReviewerPrefs(prefs: ReviewerPrefs) {
  try {
    window.localStorage.setItem(
      REVIEWER_PREFS_KEY,
      JSON.stringify({ version: REVIEWER_PREFS_VERSION, ...prefs }),
    );
  } catch {
    // Not remembered, so the key may open by itself once more. Nothing worse.
  }
}
