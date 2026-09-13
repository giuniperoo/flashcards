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
 * `scheduled` is a third and it is not about decks at all: it is whether this
 * reader wants the spaced repetition app or free study. It is on unless they
 * choose free study. It lives here
 * because the index is what acts on it — it writes `?scheduled` into its own
 * study links, and from task 5 it draws due counts. What the reviewer reads is
 * the parameter, never this; see `lib/studyMode.ts` for why they are separate.
 *
 * Its own storage key, for the same reason as `lib/apiKey.ts`: `decks:custom`
 * is what the export button serialises, and a display preference has no
 * business riding along inside somebody's deck file.
 */

export const PREFS_KEY = "prefs:index";
export const PREFS_VERSION = 4;

/** Fired on the window so anything showing a deck count can recount. */
export const PREFS_EVENT = "index-prefs-changed";

export type IndexPrefs = {
  showBuiltIns: boolean;
  hiddenDecks: string[];
  scheduled: boolean;
};

/**
 * The decks in `content/` are mine rather than the reader's, so a first visit
 * starts without them: the index opens on their own decks and a button at the
 * foot of the page offering mine. Turning them on is a decision, and a stored
 * one — this default only ever describes somebody who has not made it.
 *
 * This is also what the server renders, since it is what the server can know,
 * which is what keeps the index from flashing decks away on load.
 *
 * Scheduling is on. Spaced repetition is what the app is now, and free study is
 * the way out of it rather than the other way round. It started off, while the
 * scheduled reviewer was new and the question was whether this should be a
 * spaced repetition app at all; living with it answered that.
 *
 * Version 1 held `showBuiltIns` alone and version 2 added `hiddenDecks`. Each
 * reads as the version after it with the new field at its default, so there is
 * nothing to migrate and nothing to write back — the defaults do the work.
 *
 * Version 4 is where the default for `scheduled` flipped, and it does need a
 * rule. Every version 3 store holds a `scheduled`, because saving any
 * preference wrote all three — so a stored `false` there is as likely to mean
 * "showed the built-in decks once" as "chose free study". Nothing can tell the
 * two apart, so a version 3 `false` reads as never chosen and takes the new
 * default. From version 4 on, a stored `false` is a choice and is kept.
 */
export const DEFAULT_PREFS: IndexPrefs = {
  showBuiltIns: false,
  hiddenDecks: [],
  scheduled: true,
};

/**
 * A first visit is also the answer whenever storage is unreadable — a private
 * window should look like a first visit, not like someone's decks have gone
 * missing. `showBuiltIns` has to be stored as true to count as true, so a
 * half-written or hand-edited value falls back to the default rather than to
 * the opposite of it.
 */
export function loadPrefs(): IndexPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<IndexPrefs> & { version?: unknown };
    const current = typeof parsed?.version === "number" && parsed.version >= 4;
    return {
      showBuiltIns: parsed?.showBuiltIns === true,
      hiddenDecks: Array.isArray(parsed?.hiddenDecks)
        ? parsed.hiddenDecks.filter((slug) => typeof slug === "string")
        : [],
      // Only a `false` written since the default flipped counts as choosing
      // free study. Anything else — an older store, a missing or mangled
      // value — is the default.
      scheduled: !(current && parsed.scheduled === false),
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
