"use client";

import DeckCard, { type DeckSummary } from "@/components/DeckCard";
import { visibleDecks } from "@/lib/prefs";
import { DECK_PARAM, deckParamFor } from "@/lib/deckFilter";
import { useCustomDecks } from "@/lib/useCustomDecks";
import { usePrefs } from "@/lib/usePrefs";

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
 *
 * The built-in decks are off until somebody asks for them, so the first render
 * — the server's, and the browser's before it has read `localStorage` — is an
 * index without them, and the grid below arrives with the preferences.
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
  const [prefs, update] = usePrefs();
  const custom = useCustomDecks();

  const hide = (slug: string) =>
    update({ ...prefs, hiddenDecks: [...prefs.hiddenDecks, slug] });

  const shown = visibleDecks(decks, prefs);
  const param = deckParamFor(
    shown.map((deck) => deck.slug),
    decks.map((deck) => deck.slug),
  );
  const query = param ? `?${DECK_PARAM}=${encodeURIComponent(param)}` : "";

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

      {prefs.showBuiltIns && shown.length > 0 && (
        <ul className="deck-grid mt-8 sm:mt-10">
          {/* The link carries the decks it is offering, so the card can
              count what it will actually deal rather than every deck in
              content/. Without a parameter the shuffle falls back to these
              same preferences, so a bookmark behaves the same way. */}
          <li className="col-span-full">
            <DeckCard
              deck={{
                ...shuffled,
                blurb: `All ${shown.length} decks interleaved — the honest test`,
                count: shown.reduce((n, deck) => n + deck.count, 0),
              }}
              studyHref={`/study/all${query}`}
              printHref={`/print/all${query}`}
            />
          </li>
          {shown.map((deck) => (
            <li key={deck.slug}>
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
