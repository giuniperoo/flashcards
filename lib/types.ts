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

export type Deck = {
  slug: string;
  name: string;
  blurb: string;
  tint: string;
  ink: string;
  cards: Card[];
};

export type StudyCard = Card & { deck: Deck; index: number };
