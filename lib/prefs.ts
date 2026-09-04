/**
 * Index preferences. There is one so far: whether the decks that ship in
 * `content/` are shown at all.
 *
 * The built-in decks are read off the filesystem at build time, so a reader
 * cannot delete them the way they can delete an imported deck — and somebody
 * else running this app has no use for the decks I happened to write. Hiding
 * them is a display preference, never a deletion: the files are untouched, the
 * routes still resolve, and progress against those cards is left where it is.
 *
 * Its own storage key, for the same reason as `lib/apiKey.ts`: `decks:custom`
 * is what the export button serialises, and a display preference has no
 * business riding along inside somebody's deck file.
 */

export const PREFS_KEY = "prefs:index";
export const PREFS_VERSION = 1;

/** Fired on the window so anything showing a deck count can recount. */
export const PREFS_EVENT = "index-prefs-changed";

type PrefsStore = { version: 1; showBuiltIns: boolean };

/**
 * Showing the decks is the default, and also the answer whenever storage is
 * unreadable — a private window should look like a first visit, not like
 * someone's decks have gone missing.
 */
export function loadShowBuiltIns(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as PrefsStore;
    return parsed?.showBuiltIns !== false;
  } catch {
    return true;
  }
}

export function saveShowBuiltIns(showBuiltIns: boolean) {
  const store: PrefsStore = { version: PREFS_VERSION, showBuiltIns };
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(store));
  } catch {
    // A preference that cannot be saved still applies for this page view.
  }
  // Kept in step with the pre-paint script in `app/layout.tsx`, which reads
  // this same attribute back on the next load to avoid a flash of decks the
  // reader has hidden.
  document.documentElement.toggleAttribute("data-built-ins-hidden", !showBuiltIns);
  window.dispatchEvent(new Event(PREFS_EVENT));
}
