/**
 * Scheduling is a mode, and the URL is what says so.
 *
 * `/study/kafka` opens the deck, the way it always has. `/study/kafka?scheduled`
 * opens what is due. No parameter, no scheduling — which is the whole point of
 * putting it here rather than in a preference the reviewer reads: a link says
 * which reviewer it opens, a bookmark somebody already has cannot change under
 * them, and the two can sit side by side while the reader works out which app
 * they would rather have.
 *
 * The preference in `lib/prefs.ts` is a separate thing with a separate job: it
 * is what the *index* writes into its own links, and what the index draws with.
 * A URL cannot reach a deck card.
 *
 * This is the same division `lib/deckFilter.ts` already runs on `?deck=`.
 */

export const SCHEDULED_PARAM = "scheduled";

/**
 * Whether a search string asks for a scheduled session. Bare presence is the
 * flag — `?scheduled` and `?scheduled=1` both mean yes, and nothing means no.
 */
export function wantsSchedule(search: string) {
  return new URLSearchParams(search).has(SCHEDULED_PARAM);
}

/** The same address with the mode taken off it, for stepping out into free study. */
export function withoutSchedule(href: string) {
  const url = new URL(href);
  url.searchParams.delete(SCHEDULED_PARAM);
  return url.pathname + url.search + url.hash;
}

/**
 * A deck's study link, carrying the mode when it is on. `search` is a query the
 * link already has, like the shuffled card's `?deck=a,b`. The flag goes last and
 * bare, so it reads as a flag.
 */
export function studyHref(slug: string, scheduled: boolean, search = "") {
  if (!scheduled) return `/study/${slug}${search}`;
  return `/study/${slug}${search ? `${search}&` : "?"}${SCHEDULED_PARAM}`;
}
