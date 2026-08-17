import type { Card, Deck, StudyCard } from "./decks";
import { decks as builtIn } from "./decks";
import { newCardId } from "./cardId";

export const CUSTOM_KEY = "decks:custom";
export const CUSTOM_VERSION = 1;

/** Version 1 wraps what used to be a bare `Deck[]`, and guarantees card ids. */
type CustomDeckStore = { version: 1; decks: Deck[] };

/** Pastels not already used by a built-in deck, paired with a readable ink. */
const PALETTE: Array<[string, string]> = [
  ["#D6E8F7", "#3E7AA6"],
  ["#E8DFC8", "#8A7434"],
  ["#DCEBD0", "#5B7F3E"],
  ["#F3D9DE", "#A9536A"],
  ["#DDD8E8", "#6B5F8C"],
  ["#F7E3C8", "#A8763A"],
];

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

export function uniqueSlug(title: string, existing: Deck[]) {
  const taken = new Set([
    ...builtIn.map((d) => d.slug),
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
}): Deck {
  const existing = loadCustomDecks();
  const [fallbackTint, fallbackInk] = PALETTE[existing.length % PALETTE.length];

  const deck: Deck = {
    slug: uniqueSlug(input.title, existing),
    name: input.title,
    blurb: input.blurb || `${input.cards.length} imported cards`,
    tint: input.tint ?? fallbackTint,
    ink: input.tint ? shadeForTint(input.tint) : fallbackInk,
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
  const head = [`# ${deck.name}`, `tint: ${deck.tint}`, `blurb: ${deck.blurb}`];
  const body = deck.cards.map((c) => `Q: ${c.q}\nA: ${c.a}`);
  return [...head, "", ...body].join("\n") + "\n";
}

/** Darken a pastel enough to read as the progress-bar and pill colour. */
function shadeForTint(tint: string) {
  const n = parseInt(tint.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.55);
  const g = Math.round(((n >> 8) & 255) * 0.55);
  const b = Math.round((n & 255) * 0.55);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
