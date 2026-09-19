/**
 * Shared deck types. This module must stay free of `node:fs` and anything else
 * server-only: it is imported by client components, and `lib/loadDecks.ts`
 * (which does read the filesystem) imports its types from here.
 */

/**
 * `id` is a uuid assigned once, when a card is written into `content/` or
 * imported. It is deliberately not derived from the question text: progress is
 * keyed by it, and fixing a typo in a question is exactly when that progress
 * should survive.
 */
export type Card = { id: string; q: string; a: string };

/**
 * `added` is when an imported deck was saved, and is absent on the built-in
 * decks and on any deck imported before September 19, 2026. Sync reads it: a
 * deck deleted on one device stays deleted everywhere unless it was imported
 * again after the deletion, and two different decks that landed on the same
 * slug on two devices are told apart by it. See `lib/syncMerge.ts`.
 */
export type Deck = {
  slug: string;
  name: string;
  blurb: string;
  tint: string;
  ink: string;
  cards: Card[];
  added?: string;
};

export type StudyCard = Card & { deck: Deck; index: number };
