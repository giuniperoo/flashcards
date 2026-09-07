import type { Card, Deck, StudyCard } from "./types";
import { newCardId } from "./cardId";
import { nextTint, shadeForTint } from "./tint";

export const CUSTOM_KEY = "decks:custom";
export const CUSTOM_VERSION = 1;

/** Version 1 wraps what used to be a bare `Deck[]`, and guarantees card ids. */
type CustomDeckStore = { version: 1; decks: Deck[] };

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "deck";
}

/** Backfills ids onto decks that were saved before cards carried them. */
function withIds(decks: Deck[]) {
  let changed = false;
  const next = decks.map((deck) => ({
    ...deck,
    cards: deck.cards.map((card) => {
      if (typeof card.id === "string" && card.id) return card;
      changed = true;
      return { ...card, id: newCardId() };
    }),
  }));
  return { decks: next, changed };
}

export function loadCustomDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    // A bare array is the shape that predates versioning; an object is current.
    const legacy = Array.isArray(parsed);
    const stored: Deck[] = legacy
      ? (parsed as Deck[])
      : Array.isArray((parsed as CustomDeckStore)?.decks)
        ? (parsed as CustomDeckStore).decks
        : [];

    const { decks, changed } = withIds(stored);

    // Ids have to survive a reload, so a backfill is written straight back.
    // No change event: nothing the UI renders has moved.
    if (legacy || changed) write(decks);
    return decks;
  } catch {
    return [];
  }
}

function write(decks: Deck[]) {
  const store: CustomDeckStore = { version: CUSTOM_VERSION, decks };
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(store));
}

function persist(decks: Deck[]) {
  write(decks);
  window.dispatchEvent(new Event("custom-decks-changed"));
}

/**
 * `reserved` is the built-in deck slugs. They live in `content/` and are read
 * on the server, so they have to be handed in rather than imported: this module
 * runs in the browser.
 */
export function uniqueSlug(title: string, existing: Deck[], reserved: string[] = []) {
  const taken = new Set([
    ...reserved,
    ...existing.map((d) => d.slug),
    "all",
    "new",
  ]);
  const base = slugify(title);
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function saveCustomDeck(input: {
  title: string;
  blurb: string;
  tint: string | null;
  cards: Card[];
  reservedSlugs?: string[];
  /** Tints of the built-in decks. Passed in because this module runs in the
      browser and cannot read `content/` — the same reason as `reservedSlugs`.
      Without them a new deck can land on a colour a built-in already owns. */
  reservedTints?: string[];
}): Deck {
  const existing = loadCustomDecks();
  const picked = nextTint([
    ...(input.reservedTints ?? []),
    ...existing.map((d) => d.tint),
  ]);

  const deck: Deck = {
    slug: uniqueSlug(input.title, existing, input.reservedSlugs ?? []),
    name: input.title,
    blurb: input.blurb || `${input.cards.length} imported cards`,
    tint: input.tint ?? picked.tint,
    ink: input.tint ? shadeForTint(input.tint) : picked.ink,
    cards: input.cards,
  };

  persist([...existing, deck]);
  return deck;
}

export function deleteCustomDeck(slug: string) {
  persist(loadCustomDecks().filter((d) => d.slug !== slug));
  try {
    window.localStorage.removeItem(`progress:${slug}`);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function getCustomDeck(slug: string): Deck | undefined {
  return loadCustomDecks().find((d) => d.slug === slug);
}

export function customStudySet(deck: Deck): StudyCard[] {
  return deck.cards.map((card, index) => ({ ...card, deck, index }));
}

export function toDeckText(deck: Deck) {
  // `ink:` only when the tint would not give it, and in the order the decks in
  // `content/` carry it.
  //
  // An ink is derived from its tint's hue, so most decks need no line at all —
  // leaving it out is what keeps them tracking `shadeForTint`, rather than
  // freezing today's shade into a file. The decks that do carry one are the
  // built-ins, whose inks came from the print spec and sit up to 21 points of
  // saturation and 20 of lightness off the formula, in both directions. Those
  // cannot be derived, and dropping the line would recolour a printed deck.
  const head = [`# ${deck.name}`, `tint: ${deck.tint}`];
  if (deck.ink.toUpperCase() !== shadeForTint(deck.tint).toUpperCase()) {
    head.push(`ink: ${deck.ink}`);
  }
  head.push(`blurb: ${deck.blurb}`);
  const body = deck.cards.map((c) => `id: ${c.id}\nQ: ${c.q}\nA: ${c.a}`);
  // A blank line between the cards, not just after the front matter. Joined by
  // a single newline, a card's `id:` lands directly under the answer above it,
  // where the parser is still reading that answer and takes the id as more of
  // it — which costs the card below its id and rekeys it on every read. This
  // is what a deck exported and then kept in `content/` is parsed from, so the
  // two have to agree.
  return [head.join("\n"), ...body].join("\n\n") + "\n";
}
