/**
 * Index preferences: which of the decks in `content/` the reader wants to see.
 *
 * Those decks are read off the filesystem at build time, so a reader cannot
 * delete them the way they can delete an imported deck — and somebody else
 * running this app has no use for the decks I happened to write. Hiding is
 * never deletion: the files are untouched, the routes still resolve, progress
 * against those cards is left where it is, and imported decks are unaffected.
 *
 * Two controls, because they answer different questions. `showBuiltIns` is
 * "none of these are mine"; `hiddenDecks` is "this one isn't useful to me".
 * The master switch does not disturb the per-deck list, so turning the decks
 * back on restores exactly the selection that was there before.
 *
 * Its own storage key, for the same reason as `lib/apiKey.ts`: `decks:custom`
 * is what the export button serialises, and a display preference has no
 * business riding along inside somebody's deck file.
 */

export const PREFS_KEY = "prefs:index";
export const PREFS_VERSION = 2;

/** Fired on the window so anything showing a deck count can recount. */
export const PREFS_EVENT = "index-prefs-changed";

export type IndexPrefs = { showBuiltIns: boolean; hiddenDecks: string[] };

/**
 * Version 1 held `showBuiltIns` alone. It reads as a version 2 with nothing
 * hidden individually, so there is nothing to migrate and nothing to write
 * back — the defaults do the work.
 */
export const DEFAULT_PREFS: IndexPrefs = { showBuiltIns: true, hiddenDecks: [] };

/**
 * Showing every deck is the default, and also the answer whenever storage is
 * unreadable — a private window should look like a first visit, not like
 * someone's decks have gone missing.
 */
export function loadPrefs(): IndexPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<IndexPrefs>;
    return {
      showBuiltIns: parsed?.showBuiltIns !== false,
      hiddenDecks: Array.isArray(parsed?.hiddenDecks)
        ? parsed.hiddenDecks.filter((slug) => typeof slug === "string")
        : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: IndexPrefs) {
  try {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ version: PREFS_VERSION, ...prefs }),
    );
  } catch {
    // A preference that cannot be saved still applies for this page view.
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/**
 * What the reader can actually study, given the preferences. Used for both the
 * grid and the headline count, so the two cannot disagree.
 */
export function visibleDecks<T extends { slug: string }>(
  decks: T[],
  prefs: IndexPrefs,
): T[] {
  if (!prefs.showBuiltIns) return [];
  const hidden = new Set(prefs.hiddenDecks);
  return decks.filter((deck) => !hidden.has(deck.slug));
}
