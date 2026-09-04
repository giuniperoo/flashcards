import type { IndexPrefs } from "./prefs";

/**
 * Which decks a shuffled session draws from.
 *
 * `/study/all` and `/print/all` are assembled on the server, which cannot know
 * what this reader has hidden, so the set is narrowed in the browser. Two
 * sources, in this order:
 *
 *   1. `?deck=a,b,c` — an explicit list. A link that says what it contains
 *      works for whoever opens it, which is the point of being able to send
 *      one: the recipient's own hidden decks are none of its business.
 *   2. the reader's preferences, when there is no parameter.
 *
 * Hidden is not deleted, so `/study/kafka` still opens a hidden deck. Only the
 * shuffle, which nobody chose deck by deck, follows the preferences.
 */
export const DECK_PARAM = "deck";

/** Slugs from a `?deck=` value, which may be repeated or comma-separated. */
export function parseDeckParam(value: string | string[] | null): string[] | null {
  if (value === null || value === undefined) return null;
  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((part) => part.split(","))
    .map((slug) => slug.trim())
    .filter(Boolean);
  return parts;
}

/** The `?deck=` value for a set of slugs, or null when nothing is excluded. */
export function deckParamFor(shown: string[], all: string[]): string | null {
  return shown.length === all.length ? null : shown.join(",");
}

/**
 * The slugs to study, given the parameter and the preferences. Unknown slugs
 * are dropped rather than trusted: the parameter comes out of a URL.
 */
export function slugsToStudy(
  all: string[],
  requested: string[] | null,
  prefs: IndexPrefs,
): string[] {
  if (requested) {
    const asked = new Set(requested);
    return all.filter((slug) => asked.has(slug));
  }
  if (!prefs.showBuiltIns) return [];
  const hidden = new Set(prefs.hiddenDecks);
  return all.filter((slug) => !hidden.has(slug));
}
