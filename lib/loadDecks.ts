import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDeck } from "./parseDeck";
import { shadeForTint } from "./tint";
import type { Deck, StudyCard } from "./types";

/**
 * Reads `content/*.md` once, at build time. Server-only — it touches the
 * filesystem, so importing it from a client component will break the build.
 * Client code wants `lib/types.ts` instead.
 *
 * Anything unparseable throws rather than being skipped: a deck that silently
 * vanishes is worse than a build that stops, because a stopped build tells you.
 */
const CONTENT = join(process.cwd(), "content");

/** Only used if a deck file omits `tint:`; the built-in decks all set one. */
const FALLBACK_TINT = "#E4E2DA";

function load(): Deck[] {
  const files = readdirSync(CONTENT)
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No decks in ${CONTENT} — expected at least one .md file.`);
  }

  const loaded = files.map((file) => {
    const result = parseDeck(readFileSync(join(CONTENT, file), "utf8"));

    if (result.errors.length > 0) {
      const detail = result.errors
        .map((e) => `  line ${e.line}: ${e.message}`)
        .join("\n");
      throw new Error(`content/${file} could not be parsed:\n${detail}`);
    }

    const tint = result.tint ?? FALLBACK_TINT;
    return {
      order: result.order ?? Number.MAX_SAFE_INTEGER,
      deck: {
        // The filename is the slug, so adding a file adds a deck.
        slug: file.replace(/\.md$/, ""),
        name: result.title,
        blurb: result.blurb,
        tint,
        ink: result.ink ?? shadeForTint(tint),
        cards: result.cards,
      } satisfies Deck,
    };
  });

  // Declared `order:` first, then filename, so a new file appends rather than
  // shuffling the decks that are already there.
  loaded.sort((a, b) => a.order - b.order || a.deck.slug.localeCompare(b.deck.slug));
  const decks = loaded.map((entry) => entry.deck);

  // Progress is keyed by card id, so a collision would silently merge two
  // cards' history. Cheap to check here, impossible to debug later.
  const seen = new Map<string, string>();
  for (const deck of decks) {
    for (const card of deck.cards) {
      const owner = seen.get(card.id);
      if (owner) {
        throw new Error(
          `Duplicate card id ${card.id} in content/${deck.slug}.md — already used in content/${owner}.md`,
        );
      }
      seen.set(card.id, deck.slug);
    }
  }

  return decks;
}

export const decks = load();

export const totalCards = decks.reduce((n, d) => n + d.cards.length, 0);

export function getDeck(slug: string): Deck | undefined {
  return decks.find((d) => d.slug === slug);
}

export function studySet(slug: string): StudyCard[] {
  const source = slug === "all" ? decks : decks.filter((d) => d.slug === slug);
  return source.flatMap((deck) =>
    deck.cards.map((card, index) => ({ ...card, deck, index })),
  );
}
