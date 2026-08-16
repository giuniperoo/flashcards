"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Deck } from "@/lib/decks";
import {
  deleteCustomDeck,
  loadCustomDecks,
  toDeckText,
} from "@/lib/customDecks";

export default function CustomDeckList() {
  const [decks, setDecks] = useState<Deck[] | null>(null);

  const refresh = useCallback(() => setDecks(loadCustomDecks()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("custom-decks-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("custom-decks-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

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
          <li
            key={deck.slug}
            className="cut relative h-full overflow-hidden rounded-sm bg-card"
          >
            <span
              aria-hidden
              className="absolute top-0 right-0 h-8 w-8"
              style={{
                background: deck.tint,
                clipPath: "polygon(100% 0,0 0,100% 100%)",
              }}
            />
            <Link
              href={`/study/${deck.slug}`}
              className="block px-5 pt-4 pb-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="label text-muted">{deck.cards.length} cards</span>
              <span className="mt-1 block text-lg font-medium">{deck.name}</span>
              <span className="mt-1 block text-sm text-muted">{deck.blurb}</span>
            </Link>
            <div className="flex border-t border-rule">
              <Link
                href={`/study/${deck.slug}`}
                className="label flex-1 px-5 py-3 text-muted hover:text-ink"
              >
                Study
              </Link>
              <Link
                href={`/print/${deck.slug}`}
                className="label border-l border-rule px-4 py-3 text-muted hover:text-ink"
              >
                Print
              </Link>
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
