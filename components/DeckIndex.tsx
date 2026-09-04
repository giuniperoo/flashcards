"use client";

import { useEffect, useState } from "react";
import DeckCard, { type DeckSummary } from "@/components/DeckCard";
import {
  DEFAULT_PREFS,
  PREFS_EVENT,
  loadPrefs,
  savePrefs,
  visibleDecks,
  type IndexPrefs,
} from "@/lib/prefs";
import { useCustomDecks } from "@/lib/useCustomDecks";

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The headline and the built-in deck grid.
 *
 * A client component because the numbers in the headline depend on two things
 * the server cannot see: the imported decks, and which built-in decks this
 * reader has hidden. It takes deck summaries rather than whole decks — a dozen
 * names and counts, not two hundred and sixty-four cards.
 */
export default function DeckIndex({
  decks,
  shuffled,
}: {
  decks: DeckSummary[];
  /** The "everything" card. Goes with the master switch, since it is the
      whole built-in set, but individual hiding does not touch it. */
  shuffled: DeckSummary;
}) {
  // Starts where the server left it so hydration matches. The stored
  // preferences arrive in the effect below, and until they do the style tag
  // written by the script in `app/layout.tsx` is what hides anything hidden.
  const [prefs, setPrefs] = useState<IndexPrefs>(DEFAULT_PREFS);
  const custom = useCustomDecks();

  useEffect(() => {
    const read = () => {
      setPrefs(loadPrefs());
      // React renders the truth from here on, so the pre-paint rules have to
      // go: they would otherwise keep hiding a deck the reader un-hides.
      document.getElementById("deck-prefs")?.remove();
    };
    read();
    window.addEventListener(PREFS_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(PREFS_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const update = (next: IndexPrefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  const hide = (slug: string) =>
    update({ ...prefs, hiddenDecks: [...prefs.hiddenDecks, slug] });

  const shown = visibleDecks(decks, prefs);
  const hiddenCount = prefs.showBuiltIns ? decks.length - shown.length : 0;

  // `custom` is null until the first read, which counts as nothing rather than
  // as zero decks: the server said the same, so no number moves on hydration.
  const deckTotal = shown.length + (custom?.length ?? 0);
  const cardTotal =
    shown.reduce((n, deck) => n + deck.count, 0) +
    (custom ?? []).reduce((n, deck) => n + deck.cards.length, 0);

  return (
    <div>
      <h1 className="max-w-xl text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
        {deckTotal === 0
          ? "No decks yet. One rule when you add one: write the answer before you turn the card over."
          : `${count(deckTotal, "deck")}, ${count(cardTotal, "card")}, one rule: write the answer before you turn the card over.`}
      </h1>
      <p className="mt-4 max-w-lg text-muted">
        Recognising an answer feels like knowing it. Producing one is the part
        that holds up under questioning.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-x-5 sm:mt-8">
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => update({ ...prefs, hiddenDecks: [] })}
            className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
          >
            {`Bring back ${count(hiddenCount, "deck")}`}
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            update({ ...prefs, showBuiltIns: !prefs.showBuiltIns })
          }
          className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
        >
          {prefs.showBuiltIns
            ? "Hide the built-in decks"
            : "Show the built-in decks"}
        </button>
      </div>

      {prefs.showBuiltIns && shown.length > 0 && (
        <ul className="built-ins grid gap-3 sm:grid-cols-2">
          {/* Counts every built-in deck, hidden ones included, because that
              is what /study/all does: the set is assembled on the server,
              which cannot see what this reader has hidden. Saying "all 11"
              and then dealing 12 would be the worse of the two. */}
          <li className="sm:col-span-2">
            <DeckCard deck={shuffled} />
          </li>
          {shown.map((deck) => (
            <li key={deck.slug} data-deck={deck.slug}>
              <DeckCard
                deck={deck}
                actions={
                  <>
                    <a
                      href={`/export/${deck.slug}`}
                      download={`${deck.slug}.md`}
                      className="label border-l border-rule px-4 py-3 text-muted hover:text-ink"
                    >
                      Export
                    </a>
                    <button
                      type="button"
                      onClick={() => hide(deck.slug)}
                      className="label border-l border-rule px-4 py-3 text-muted hover:text-ink"
                    >
                      Hide
                    </button>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
