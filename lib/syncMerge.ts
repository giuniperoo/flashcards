import type { Deck } from "./types";
import { deckOfKey, readRecords, type CardProgress } from "./progress";

/**
 * What one device sends to the server, encrypted, and what it gets back: the
 * progress store's records, the imported decks, and when each deleted deck
 * went. The built-in decks are not in it — every device already has them —
 * and neither are the preferences, which belong to the device.
 */
export type SyncPayload = {
  version: 1;
  progress: Record<string, CardProgress>;
  decks: Deck[];
  deleted: Record<string, string>;
};

export const emptyPayload: SyncPayload = { version: 1, progress: {}, decks: [], deleted: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/**
 * A payload decrypted from the server, read as defensively as `localStorage`
 * is: another device, or another version of this app, wrote it.
 */
export function readPayload(value: unknown): SyncPayload {
  if (!isRecord(value) || value.version !== 1) return emptyPayload;
  const decks = Array.isArray(value.decks)
    ? value.decks.filter(
        (deck): deck is Deck =>
          isRecord(deck) &&
          typeof deck.slug === "string" &&
          /^[a-z0-9-]+$/.test(deck.slug) &&
          typeof deck.name === "string" &&
          typeof deck.blurb === "string" &&
          typeof deck.tint === "string" &&
          typeof deck.ink === "string" &&
          Array.isArray(deck.cards) &&
          deck.cards.every(
            (card) =>
              isRecord(card) &&
              typeof card.id === "string" &&
              typeof card.q === "string" &&
              typeof card.a === "string",
          ),
      )
    : [];
  const deleted = isRecord(value.deleted)
    ? Object.fromEntries(
        Object.entries(value.deleted).filter((entry): entry is [string, string] => isTime(entry[1])),
      )
    : {};
  return { version: 1, progress: readRecords(value.progress), decks, deleted };
}

/** Later of two times; either may be missing, which is earliest of all. */
function later(a: string | undefined, b: string | undefined) {
  return (a ?? "") >= (b ?? "") ? a : b;
}

/** A total order on strings, so every tie below breaks the same way on every device. */
function pick<T>(a: T, b: T, keyOf: (value: T) => string) {
  return keyOf(a) >= keyOf(b) ? a : b;
}

/**
 * One card held on two devices.
 *
 * The record splits in two, the way `applyGrade` writes it. The draft and the
 * grade come from whichever side changed them last, by `updatedAt`; the
 * schedule — box, misses, due, time, review day, seen — from whichever was
 * answered on a schedule last, by `scheduledAt`. So a free study answer on a
 * phone and a scheduled one on a laptop both survive: the phone's words and
 * grade, the laptop's box.
 *
 * Records from before the times existed tie at "nothing", and fall back on the
 * rules the old store migrations use, for the same reason: the fuller draft is
 * the better guess, and "Needs review" beats "I had it", because being wrong
 * that way costs one extra review. The schedule prefers a card that has been
 * seen, then the later review day, then the lower box.
 *
 * Commutative, associative and idempotent — merging in any order, any number
 * of times, gives the same record — which is what lets two devices merge
 * against each other and settle on one answer.
 */
export function mergeRecord(a: CardProgress, b: CardProgress): CardProgress {
  const au = a.updatedAt ?? "";
  const bu = b.updatedAt ?? "";
  const words =
    au !== bu
      ? au > bu
        ? a
        : b
      : {
          draft:
            a.draft.length !== b.draft.length
              ? a.draft.length > b.draft.length
                ? a.draft
                : b.draft
              : a.draft >= b.draft
                ? a.draft
                : b.draft,
          grade:
            a.grade === "review" || b.grade === "review"
              ? ("review" as const)
              : a.grade === "held" || b.grade === "held"
                ? ("held" as const)
                : ("" as const),
        };

  const as = a.scheduledAt ?? "";
  const bs = b.scheduledAt ?? "";
  const plan =
    as !== bs
      ? as > bs
        ? a
        : b
      : pick(a, b, (r) =>
          [
            r.seen ? "1" : "0",
            r.reviewed.padEnd(10, " "),
            String(9 - Math.min(9, r.box)),
            r.due.padEnd(10, " "),
            r.dueAt ?? "",
            String(r.misses).padStart(6, "0"),
          ].join("|"),
        );

  const updatedAt = later(a.updatedAt, b.updatedAt);
  const scheduledAt = later(a.scheduledAt, b.scheduledAt);
  return {
    draft: words.draft,
    grade: words.grade,
    box: plan.box,
    misses: plan.misses,
    due: plan.due,
    reviewed: plan.reviewed,
    seen: plan.seen,
    ...(plan.dueAt ? { dueAt: plan.dueAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(scheduledAt ? { scheduledAt } : {}),
  };
}

/** The last time anything on a record changed, or "" if it never said. */
function touched(record: CardProgress) {
  return later(record.updatedAt, record.scheduledAt) ?? "";
}

/** The same deck on two devices shares its card ids; a different deck on the same slug does not. */
function sameDeck(a: Deck, b: Deck) {
  const ids = new Set(a.cards.map((card) => card.id));
  return b.cards.some((card) => ids.has(card.id));
}

/** Deterministic, so both devices put the same deck first. */
function deckOrder(deck: Deck) {
  return `${deck.added ?? ""}|${deck.cards[0]?.id ?? ""}|${deck.name}`;
}

function freeSlug(base: string, taken: Set<string>) {
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Two devices' payloads, merged.
 *
 * - **Deletions** are kept by slug, the later time winning. A deck deleted on
 *   one device goes from every device, unless it was imported again after the
 *   deletion, which its `added` says. Its progress goes too, apart from any
 *   record changed after the deletion.
 * - **Decks** are matched by slug. The same deck on both sides shares card ids
 *   and is kept once. Two different decks can land on one slug when each device
 *   imported its own before syncing; the earlier import keeps the slug, the
 *   other moves to the next free one, and its progress moves with it. Both
 *   devices order them the same way, so both make the same move.
 * - **Progress** is merged card by card; see `mergeRecord`.
 *
 * `reserved` is the built-in slugs and the routes' own, which a moved deck must
 * not take.
 */
export function mergePayloads(
  local: SyncPayload,
  remote: SyncPayload,
  reserved: string[] = [],
): SyncPayload {
  const deleted: Record<string, string> = { ...local.deleted };
  for (const [slug, at] of Object.entries(remote.deleted)) {
    if (!deleted[slug] || at > deleted[slug]) deleted[slug] = at;
  }

  const alive = (deck: Deck) => !deleted[deck.slug] || (deck.added ?? "") > deleted[deck.slug];

  // Every deck from both sides, one per distinct deck, grouped by slug.
  const bySlug = new Map<string, Deck[]>();
  for (const deck of [...local.decks, ...remote.decks]) {
    if (!alive(deck)) continue;
    const group = bySlug.get(deck.slug) ?? [];
    const twin = group.findIndex((other) => sameDeck(other, deck));
    if (twin === -1) group.push(deck);
    // The same deck twice: keep one, the same one on both devices.
    else group[twin] = pick(group[twin], deck, canonical);
    bySlug.set(deck.slug, group);
  }

  const progress: Record<string, CardProgress> = {};
  for (const source of [local.progress, remote.progress]) {
    for (const [key, record] of Object.entries(source)) {
      const gone = deleted[deckOfKey(key)];
      if (gone && touched(record) <= gone) continue;
      progress[key] = progress[key] ? mergeRecord(progress[key], record) : record;
    }
  }

  const taken = new Set([...reserved, "all", "new", ...bySlug.keys()]);
  const decks: Deck[] = [];
  for (const [slug, group] of bySlug) {
    group.sort((a, b) => (deckOrder(a) < deckOrder(b) ? -1 : 1));
    decks.push(group[0]);
    for (const moved of group.slice(1)) {
      const next = freeSlug(slug, taken);
      taken.add(next);
      decks.push({ ...moved, slug: next });
      for (const card of moved.cards) {
        const from = `${slug}:${card.id}`;
        if (!progress[from]) continue;
        progress[`${next}:${card.id}`] = progress[from];
        delete progress[from];
      }
    }
  }

  // In the order they were imported, and by slug among the decks from before
  // `added` was recorded: an order both devices arrive at, or each would keep
  // sending the other its own.
  const order = (deck: Deck) => `${deck.added ?? ""}|${deck.slug}`;
  decks.sort((a, b) => (order(a) < order(b) ? -1 : 1));

  return { version: 1, progress, decks, deleted };
}

/**
 * JSON with its keys sorted, so two payloads holding the same things compare
 * equal whichever order their fields were written in. What decides whether a
 * merge changed anything worth writing or sending.
 */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
