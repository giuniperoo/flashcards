"use client";

import type { Deck } from "@/lib/types";
import DeckCard from "@/components/DeckCard";
import { deleteCustomDeck, toDeckText } from "@/lib/customDecks";
import { useCustomDecks } from "@/lib/useCustomDecks";

export default function CustomDeckList() {
  const decks = useCustomDecks();

  // An imported deck only exists in this browser, so its export is built here
  // rather than fetched. The built-in decks go through `/export/[deck]`.
  const download = (deck: Deck) => {
    const blob = new Blob([toDeckText(deck)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = (deck: Deck) => {
    const ok = window.confirm(
      `Delete "${deck.name}" and its progress? This cannot be undone.`,
    );
    if (ok) deleteCustomDeck(deck.slug);
  };

  if (decks === null || decks.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="label mb-3 text-muted">Your decks</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {decks.map((deck) => (
          <li key={deck.slug}>
            <DeckCard
              deck={{
                slug: deck.slug,
                name: deck.name,
                blurb: deck.blurb,
                tint: deck.tint,
                count: deck.cards.length,
              }}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => download(deck)}
                    className="label border-l border-rule px-4 py-3 text-muted hover:text-ink"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(deck)}
                    className="label border-l border-rule px-4 py-3 text-muted hover:text-[#a32d2d]"
                  >
                    Delete
                  </button>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
