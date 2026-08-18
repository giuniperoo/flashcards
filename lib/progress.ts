import type { StudyCard } from "./types";

export type Grade = "held" | "review";

/**
 * Version 1 was an unversioned `{ drafts, grades }` keyed by `{deckSlug}:{index}`,
 * which reassigned every later card's history whenever a card was inserted.
 * Version 2 keys by `{deckSlug}:{cardId}` instead.
 */
export type ProgressStore = {
  version: 2;
  drafts: Record<string, string>;
  grades: Record<string, Grade>;
};

export const CURRENT_VERSION = 2;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Rewrites v1 index keys onto card ids. Entries whose index no longer matches a
 * card are dropped rather than carried forward: they are unreachable either way,
 * and inventing an id for them would only accumulate junk.
 */
function migrate(raw: Record<string, unknown>, cards: StudyCard[]): ProgressStore {
  const byLegacy = new Map(cards.map((c) => [legacyKey(c), cardKey(c)]));

  const drafts: Record<string, string> = {};
  const grades: Record<string, Grade> = {};

  const oldDrafts = isRecord(raw.drafts) ? raw.drafts : {};
  for (const [key, value] of Object.entries(oldDrafts)) {
    const next = byLegacy.get(key);
    if (next && typeof value === "string") drafts[next] = value;
  }

  const oldGrades = isRecord(raw.grades) ? raw.grades : {};
  for (const [key, value] of Object.entries(oldGrades)) {
    const next = byLegacy.get(key);
    if (next && (value === "held" || value === "review")) grades[next] = value;
  }

  return { version: CURRENT_VERSION, drafts, grades };
}

/**
 * Reads progress, migrating a v1 store on the way through and persisting the
 * result immediately so the rewrite happens once. Idempotent: a store already at
 * version 2 is returned untouched.
 */
export function loadProgress(storageKey: string, cards: StudyCard[]): ProgressStore {
  if (typeof window === "undefined") return emptyProgress;

  let raw: unknown;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return emptyProgress;
    raw = JSON.parse(stored);
  } catch {
    // A corrupt or unavailable store just means starting fresh.
    return emptyProgress;
  }

  if (!isRecord(raw)) return emptyProgress;

  if (raw.version === CURRENT_VERSION) {
    return {
      version: CURRENT_VERSION,
      drafts: isRecord(raw.drafts) ? (raw.drafts as Record<string, string>) : {},
      grades: isRecord(raw.grades) ? (raw.grades as Record<string, Grade>) : {},
    };
  }

  const migrated = migrate(raw, cards);
  saveProgress(storageKey, migrated);
  return migrated;
}

export function saveProgress(storageKey: string, store: ProgressStore) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // Private mode or a full quota — progress simply will not persist.
  }
}
