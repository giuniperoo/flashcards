import type { StudyCard } from "./types";
import { FIRST_BOX, addDays, type Grade } from "./schedule";

/**
 * What the app remembers about one card: what you wrote, and when it comes back.
 *
 * `box`, `misses`, `due` and `reviewed` mean nothing while `seen` is false — a
 * card you have typed an answer into but never graded has no place in the
 * schedule yet. `seen` is the authority on that, not a sentinel box or an empty
 * date.
 *
 * `misses` is how many times running the card has been answered wrong. It is not
 * the box. The box is how far the card has climbed, decides when it comes back,
 * and is what the strip colours by; `misses` is how much trouble a card is giving
 * you, and goes to nothing the moment you get it right. Neither derives the
 * other: a wrong answer always sends a card to box 1, so the box alone cannot
 * tell a card missed once from one missed five times.
 *
 * Nothing reads `misses` now. The strip coloured by it for a while and went back
 * to the box, and the count stayed for the same reason as `reviewed` below: stop
 * recording it and the history is gone for good. It is what you would want to
 * find the cards you keep failing.
 *
 * `reviewed` is not read anywhere yet. It goes in now because it is the one
 * field here that cannot be backfilled later: nothing else records *when* a
 * review happened, and `due` is no substitute, since a box-5 card reviewed a
 * fortnight ago carries a later `due` than a box-1 card done this morning. It
 * is what a future sync would need to resolve a conflict, and it is empty on
 * every record migrated from an older store, because those stores never knew.
 */
export type CardProgress = {
  draft: string;
  box: number;
  misses: number;
  due: string;
  reviewed: string;
  seen: boolean;
};

/**
 * One store for the whole app, keyed `{deckSlug}:{cardId}`.
 *
 * Version 1 was an unversioned `{ drafts, grades }` keyed by `{deckSlug}:{index}`,
 * which reassigned every later card's history whenever a card was inserted.
 * Version 2 keyed by `{deckSlug}:{cardId}` instead, but still lived under one
 * key per route, so the same card had two records and nothing reconciled them.
 * Version 3 collapsed those into this single key.
 *
 * Version 4 replaces the two parallel maps with one record per card. A grade
 * was a verdict; a record is a schedule, and the two halves of a card's history
 * cannot be kept in step when they are stored apart.
 */
export type ProgressStore = {
  version: 4;
  cards: Record<string, CardProgress>;
};

export const PROGRESS_KEY = "progress";
export const CURRENT_VERSION = 4;

/** What versions 1 and 2 were keyed by: `progress:all` and `progress:{slug}`. */
const LEGACY_PREFIX = "progress:";

/** The versions that stored `{ drafts, grades }` already keyed by card id. */
const ID_KEYED = [2, 3];

/** A card that has been written on but never graded. Spread, never mutated. */
export const unseenCard: CardProgress = {
  draft: "",
  box: FIRST_BOX,
  misses: 0,
  due: "",
  reviewed: "",
  seen: false,
};

export const emptyProgress: ProgressStore = { version: CURRENT_VERSION, cards: {} };

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

/** The two maps every version before 4 stored. What merging operates on. */
type Entries = { drafts: Record<string, string>; grades: Record<string, Grade> };

/**
 * Review beats held. Versions 1 to 3 carry no timestamps, so a card graded both
 * ways in two stores has no better tiebreak than an arbitrary one. Being wrong
 * this way costs one extra review; being wrong the other way retires a card
 * that was never learned.
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
function take(
  into: Entries,
  key: string,
  drafts: Record<string, unknown>,
  grades: Record<string, unknown>,
  from: string,
) {
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
 * Folds one pre-version-4 value into `into`, and reports what could not be placed.
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

  if (typeof raw.version === "number" && ID_KEYED.includes(raw.version)) {
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

/**
 * A grade becomes a place in the schedule.
 *
 * Held comes back tomorrow in box 2, review comes back today in box 1, and a
 * card carrying only a draft has not been graded at all. Held deliberately does
 * *not* get box 2's two days: the old stores never recorded when a card was
 * graded, so an interval has nothing to count from. Bringing everything back
 * within a day and letting the first real grade set a real date is the reading
 * that cannot silently hide a card. `reviewed` stays empty for the same reason.
 *
 * A review becomes one miss rather than none or many: the old stores knew the
 * last verdict and not how many times it had been given, and one is the fewest
 * that is still true.
 */
function scheduleFor(grade: Grade | undefined, today: string) {
  if (!grade) return { box: FIRST_BOX, misses: 0, due: "", reviewed: "", seen: false };
  if (grade === "review") {
    return { box: FIRST_BOX, misses: 1, due: today, reviewed: "", seen: true };
  }
  return {
    box: FIRST_BOX + 1,
    misses: 0,
    due: addDays(today, 1),
    reviewed: "",
    seen: true,
  };
}

function toRecords(entries: Entries, today: string) {
  const out: Record<string, CardProgress> = {};
  const keys = new Set([...Object.keys(entries.drafts), ...Object.keys(entries.grades)]);
  for (const key of keys) {
    // Draft first, to match `readRecords`. A record built two ways should
    // serialise to the same string, or a second read rewrites the store and
    // the migration stops being idempotent in the only way you can observe.
    out[key] = {
      draft: entries.drafts[key] ?? "",
      ...scheduleFor(entries.grades[key], today),
    };
  }
  return out;
}

/**
 * A version 4 record beats one migrated from an older store, because it is the
 * one this version wrote and the only one carrying a real schedule. The older
 * store can still contribute a draft the newer record does not have.
 */
function mergeRecord(a: CardProgress | undefined, b: CardProgress): CardProgress {
  if (!a) return b;
  const draft = mergeDraft(a.draft, b.draft);
  return a.seen ? { ...a, draft } : { ...b, draft };
}

/**
 * `misses` arrived after version 4 did, and is read in without a version of its
 * own. A missing count has one right answer, so there is nothing to migrate —
 * and bumping the envelope would send every version 4 store down the path for
 * the older shapes, which reduces a record to a verdict and throws its box away.
 *
 * A record without it is read the way `scheduleFor` reads an old grade: a card
 * sitting in box 1 was last answered wrong, which is one miss; any other card
 * was last answered right, which is none. Reading does not write it back, so
 * `loadProgress` still leaves an untouched store alone. The next save does write
 * it, and in practice that is the reviewer opening, since it saves what it
 * loaded — which is harmless, because what it writes is what a read derives.
 */
function readRecords(value: unknown): Record<string, CardProgress> {
  const out: Record<string, CardProgress> = {};
  if (!isRecord(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const box = typeof entry.box === "number" ? entry.box : FIRST_BOX;
    const seen = entry.seen === true;
    out[key] = {
      draft: typeof entry.draft === "string" ? entry.draft : "",
      box,
      misses:
        typeof entry.misses === "number" && Number.isFinite(entry.misses)
          ? Math.max(0, Math.trunc(entry.misses))
          : seen && box === FIRST_BOX
            ? 1
            : 0,
      due: typeof entry.due === "string" ? entry.due : "",
      reviewed: typeof entry.reviewed === "string" ? entry.reviewed : "",
      seen,
    };
  }
  return out;
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
 * Reads the store, migrating everything older on the way through and persisting
 * the result immediately so it happens once.
 *
 * Every version before 4 reduces to drafts and grades first, wherever it was
 * stored, and converts to records in one place — so the route-merge rules and
 * the schedule rules stay separate and each is only written once. `cards` is
 * needed only to rewrite version 1's position keys onto card ids.
 *
 * Idempotent: once the older shapes are consumed there is nothing left to take,
 * and a read stops writing.
 */
export function loadProgress(cards: StudyCard[], today: string): ProgressStore {
  if (typeof window === "undefined") return emptyProgress;

  requestPersistence();

  const raw = readKey(PROGRESS_KEY);
  const current = isRecord(raw) && raw.version === CURRENT_VERSION;
  const records = current ? readRecords((raw as { cards?: unknown }).cards) : {};

  const older: Entries = { drafts: {}, grades: {} };
  let changed = false;

  if (!current && raw !== null) {
    fold(raw, cards, older);
    changed = true;
  }

  for (const key of legacyKeys()) {
    const { left, taken } = fold(readKey(key), cards, older);
    if (!left) {
      remove(key);
      changed = true;
    } else if (taken > 0) {
      write(key, left);
      changed = true;
    }
  }

  for (const [key, migrated] of Object.entries(toRecords(older, today))) {
    records[key] = mergeRecord(records[key], migrated);
  }

  const store: ProgressStore = { version: CURRENT_VERSION, cards: records };
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
 * holds every deck, so deleting an imported deck means removing the entries
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
    /* Every map the store has ever had is keyed the same way, so the prefix is
       dropped from whichever are present and the envelope is left alone. A deck
       can be deleted before any read has migrated the store, and that is not
       the moment to rewrite it into a shape this function has not checked. */
    const next: Record<string, unknown> = { ...raw };
    for (const map of ["cards", "drafts", "grades"]) {
      const value = next[map];
      if (!isRecord(value)) continue;
      next[map] = Object.fromEntries(
        Object.entries(value).filter(([key]) => !key.startsWith(prefix)),
      );
    }
    write(PROGRESS_KEY, next);
  }

  remove(`${LEGACY_PREFIX}${slug}`);
}
