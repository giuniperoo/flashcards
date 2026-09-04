"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PREFS_EVENT, loadShowBuiltIns, saveShowBuiltIns } from "@/lib/prefs";
import { useCustomDecks } from "@/lib/useCustomDecks";

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The headline and the built-in deck grid.
 *
 * A client component for two reasons that are really one: the imported decks
 * and the show/hide preference both live in `localStorage`, and the headline
 * counts every card the reader can actually study. The deck cards themselves
 * are rendered on the server and arrive as `children`, so none of that markup
 * is shipped as JavaScript — only the counting and the toggle are.
 */
export default function DeckIndex({
  builtInDecks,
  builtInCards,
  children,
}: {
  builtInDecks: number;
  builtInCards: number;
  children: ReactNode;
}) {
  // Starts where the server left it so hydration matches. The stored
  // preference arrives in the effect below, and if it says hidden the script in
  // `app/layout.tsx` has already hidden the grid before paint.
  const [showBuiltIns, setShowBuiltIns] = useState(true);
  const custom = useCustomDecks();

  useEffect(() => {
    const read = () => setShowBuiltIns(loadShowBuiltIns());
    read();
    window.addEventListener(PREFS_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(PREFS_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const toggle = () => {
    const next = !showBuiltIns;
    setShowBuiltIns(next);
    saveShowBuiltIns(next);
  };

  // `custom` is null until the first read, which is why it counts as nothing
  // rather than as zero decks: the server said the same, so nothing moves.
  const decks = (showBuiltIns ? builtInDecks : 0) + (custom?.length ?? 0);
  const cards =
    (showBuiltIns ? builtInCards : 0) +
    (custom ?? []).reduce((n, deck) => n + deck.cards.length, 0);

  return (
    <div>
      <h1 className="max-w-xl text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
        {decks === 0
          ? "No decks yet. One rule when you add one: write the answer before you turn the card over."
          : `${count(decks, "deck")}, ${count(cards, "card")}, one rule: write the answer before you turn the card over.`}
      </h1>
      <p className="mt-4 max-w-lg text-muted">
        Recognising an answer feels like knowing it. Producing one is the part
        that holds up under questioning.
      </p>

      <div className="mt-6 flex justify-end sm:mt-8">
        <button
          type="button"
          onClick={toggle}
          className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
        >
          {showBuiltIns ? "Hide the built-in decks" : "Show the built-in decks"}
        </button>
      </div>

      {showBuiltIns && (
        <ul className="built-ins grid gap-3 sm:grid-cols-2">{children}</ul>
      )}
    </div>
  );
}
