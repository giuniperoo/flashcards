import type { StudyCard } from "./types";

export type Grade = "held" | "review";

/**
 * One store for the whole app, keyed `{deckSlug}:{cardId}`.
 *
 * Version 1 was an unversioned `{ drafts, grades }` keyed by `{deckSlug}:{index}`,
 * which reassigned every later card's history whenever a card was inserted.
 * Version 2 keys by `{deckSlug}:{cardId}` instead, which is unique across the
 * whole app on its own — but it still lived under one key per route,
 * `progress:all` from the shuffle and `progress:{slug}` from the deck. The same
 * card therefore had two records with two different values, and nothing
 * reconciled them: a draft written an hour ago read as empty on the other route,
 * and the two tallies disagreed.
 *
 * Version 3 drops the partition. The record shape is unchanged; there is simply
 * one key. No suffix either — the suffix *was* the partition, and keeping one
 * would imply a sibling store that is not coming.
 */
export type ProgressStore = {
  version: 3;
  drafts: Record<string, string>;
  grades: Record<string, Grade>;
};

export const PROGRESS_KEY = "progress";
export const CURRENT_VERSION = 3;

/** What versions 1 and 2 were keyed by: `progress:all` and `progress:{slug}`. */
const LEGACY_PREFIX = "progress:";

export const emptyProgress: ProgressStore = {
  version: CURRENT_VERSION,
  drafts: {},
  grades: {},
};

export function cardKey(card: StudyCard) {
  return `${card.deck.slug}:${card.id}`;
}

/** The key shape version 1 used, so a v1 store can be read back. */
function legacyKey(card: StudyCard) {
  return `${card.deck.slug}:${card.index}`;
}

/** Both key shapes lead with the slug, and a slug holds no colon. */
function deckOfKey(key: string) {
  const at = key.indexOf(":");
  return at === -1 ? "" : key.slice(0, at);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asGrade(value: unknown): Grade | undefined {
  return value === "held" || value === "review" ? value : undefined;
}

/** The two maps, without the envelope. What merging actually operates on. */
type Entries = { drafts: Record<string, string>; grades: Record<string, Grade> };

/**
 * Review beats held. Versions 1 and 2 carry no timestamps, so a card graded
 * both ways in two stores has no better tiebreak than an arbitrary one. Being
 * wrong this way costs one extra review; being wrong the other way retires a
 * card that was never learned.
 */
function mergeGrade(a: Grade | undefined, b: Grade): Grade {
  return a === "review" || b === "review" ? "review" : b;
}

/**
 * The longer draft wins, and anything beats nothing. Same absence of
 * timestamps, same arbitrariness — but a draft is writing the reader did, and
 * the fuller attempt is the better guess at which one they would want back.
 */
function mergeDraft(a: string | undefined, b: string): string {
  return a !== undefined && a.length >= b.length ? a : b;
}

/**
 * Both rules are order-independent, which is what lets a read fold in however
 * many legacy keys it finds without caring which it saw first.
 */
function take(into: Entries, key: string, drafts: Record<string, unknown>, grades: Record<string, unknown>, from: string) {
  const draft = drafts[from];
  if (typeof draft === "string") into.drafts[key] = mergeDraft(into.drafts[key], draft);
  const grade = asGrade(grades[from]);
  if (grade) into.grades[key] = mergeGrade(into.grades[key], grade);
}

/** Whether a key holds anything this read could use. */
function usable(drafts: Record<string, unknown>, grades: Record<string, unknown>, key: string) {
  return typeof drafts[key] === "string" || asGrade(grades[key]) !== undefined;
}

/**
 * Folds one stored value into `into`, and reports what could not be placed.
 *
 * A version 2 or 3 store is already keyed by card id, so all of it lands. An
 * unversioned one is keyed by position and needs the deck's cards to rewrite,
 * and a read only holds the cards for the route it was called from. So entries
 * for a deck we *do* hold cards for and still cannot place are dropped — they
 * are unreachable however long they are kept — while entries for a deck this
 * route has never seen are handed back, so the key can be left behind for the
 * route that can finish it, minus whatever has already been taken. Each entry
 * is therefore consumed exactly once, which is what stops a later read from
 * merging a stale grade back over a newer one.
 */
function fold(raw: unknown, cards: StudyCard[], into: Entries) {
  if (!isRecord(raw)) return { left: null, taken: 0 };

  const drafts = isRecord(raw.drafts) ? raw.drafts : {};
  const grades = isRecord(raw.grades) ? raw.grades : {};
  const keys = new Set([...Object.keys(drafts), ...Object.keys(grades)]);

  if (raw.version === 2 || raw.version === CURRENT_VERSION) {
    let taken = 0;
    for (const key of keys) {
      if (!usable(drafts, grades, key)) continue;
      take(into, key, drafts, grades, key);
      taken++;
    }
    return { left: null, taken };
  }

  const byLegacy = new Map(cards.map((c) => [legacyKey(c), cardKey(c)]));
  const known = new Set(cards.map((c) => c.deck.slug));
  const left: Entries = { drafts: {}, grades: {} };
  let taken = 0;
  let leftAny = false;

  for (const key of keys) {
    if (!usable(drafts, grades, key)) continue;
    const id = byLegacy.get(key);
    if (id) {
      take(into, id, drafts, grades, key);
      taken++;
    } else if (!known.has(deckOfKey(key))) {
      take(left, key, drafts, grades, key);
      leftAny = true;
    }
  }

  return { left: leftAny ? left : null, taken };
}

function readKey(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // A corrupt or unavailable value is nothing to fold in.
    return null;
  }
}

/**
 * Collected before anything is removed: the loop below mutates storage, and
 * `key(i)` is an index into a list that reindexes underneath it.
 */
function legacyKeys() {
  const keys: string[] = [];
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key && key.startsWith(LEGACY_PREFIX)) keys.push(key);
    }
  } catch {
    // Storage unavailable. Nothing to migrate.
  }
  return keys.sort();
}

/**
 * Asks the browser to exempt this origin from eviction. Chromium may grant it
 * on a site the reader has engaged with; WebKit will almost certainly ignore it
 * and apply its seven-day timer anyway. It earns its place by having no
 * interface: nothing to explain, nothing to press, and never worse than not
 * asking.
 */
let persistenceAsked = false;
function requestPersistence() {
  if (persistenceAsked) return;
  persistenceAsked = true;
  try {
    if (typeof navigator !== "undefined") void navigator.storage?.persist?.();
  } catch {
    // Unsupported or refused. The store still works, it is just evictable.
  }
}

/**
 * Reads the store, folding in every legacy key it finds on the way through and
 * persisting the result immediately so the migration happens once.
 *
 * Idempotent: once the legacy keys are consumed there is nothing left to take,
 * and a read stops writing. `cards` is needed only to rewrite version 1's
 * position keys onto card ids.
 */
export function loadProgress(cards: StudyCard[]): ProgressStore {
  if (typeof window === "undefined") return emptyProgress;

  requestPersistence();

  const into: Entries = { drafts: {}, grades: {} };
  fold(readKey(PROGRESS_KEY), cards, into);

  let changed = false;
  for (const key of legacyKeys()) {
    const { left, taken } = fold(readKey(key), cards, into);
    if (!left) {
      remove(key);
      changed = true;
    } else if (taken > 0) {
      write(key, left);
      changed = true;
    }
  }

  const store: ProgressStore = { version: CURRENT_VERSION, ...into };
  if (changed) saveProgress(store);
  return store;
}

function write(key: string, value: object) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota — progress simply will not persist.
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function saveProgress(store: ProgressStore) {
  write(PROGRESS_KEY, store);
}

/**
 * Drops everything belonging to a deck — a key *prefix*, not a key. One store
 * holds every deck now, so deleting an imported deck means removing the entries
 * whose key leads with its slug rather than removing a store of its own.
 *
 * Its own legacy key goes too, in case no read has folded it in yet. Nothing
 * else can hold it: `progress:all` was only ever the built-in shuffle, and
 * built-in decks are hidden rather than deleted.
 */
export function forgetDeck(slug: string) {
  if (typeof window === "undefined") return;

  const prefix = `${slug}:`;
  const raw = readKey(PROGRESS_KEY);
  if (isRecord(raw)) {
    const keep = (map: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(map).filter(([key]) => !key.startsWith(prefix)));
    write(PROGRESS_KEY, {
      version: CURRENT_VERSION,
      drafts: keep(isRecord(raw.drafts) ? raw.drafts : {}),
      grades: keep(isRecord(raw.grades) ? raw.grades : {}),
    });
  }

  remove(`${LEGACY_PREFIX}${slug}`);
}
