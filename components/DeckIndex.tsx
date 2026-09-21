"use client";

import { useLayoutEffect } from "react";
import { focusNeighborCard } from "@/lib/focus";
import DeckCard, { type DeckSummary } from "@/components/DeckCard";
import { visibleDecks } from "@/lib/prefs";
import { DECK_PARAM, deckParamFor } from "@/lib/deckFilter";
import { studyHref } from "@/lib/studyMode";
import { useCustomDecks } from "@/lib/useCustomDecks";
import { useDueCounts } from "@/lib/useDueCounts";
import { usePrefs } from "@/lib/usePrefs";
import { useSay } from "@/lib/useSay";
import { Say } from "@/components/Voice";

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
 * index without them, and the grid below arrives with the preferences. On a
 * reload that first frame is kept out of sight: see `data-index-pending`.
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
  const due = useDueCounts();
  const say = useSay();

  /* Reveal the index once what it depends on is read. `custom` stops being
     null in the same render as the preferences and due counts arrive, since
     all three read in layout effects on mount, so this runs with the reader's
     own index in hand and before it paints. */
  useLayoutEffect(() => {
    if (custom !== null) {
      document.documentElement.removeAttribute("data-index-pending");
    }
  }, [custom]);

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
  /* What the shuffled card deals. On a schedule that is the cards due across
     the decks it draws from, the same count and the same cards `buildDueQueue`
     deals; otherwise every card in them. */
  const shownCards = shown.reduce((n, deck) => n + deck.count, 0);
  const dueDecks = shown.filter((deck) => (due[deck.slug] ?? 0) > 0);
  const dueTotal = dueDecks.reduce((n, deck) => n + due[deck.slug], 0);
  const shuffledDeck: DeckSummary = prefs.scheduled
    ? {
        ...shuffled,
        name: say("index.everythingDue"),
        blurb:
          dueTotal === 0
            ? say("index.blurbNothingDue", count(shown.length, "deck"))
            : dueDecks.length === 1
              ? say("index.blurbOneDeck", count(dueTotal, "card"), dueDecks[0].name)
              : say("index.blurbManyDecks", count(dueTotal, "card"), dueDecks.length),
        count: shownCards,
      }
    : {
        ...shuffled,
        name: say("index.everythingShuffled"),
        blurb: say("index.blurbAll", shown.length),
        count: shownCards,
      };

  const deckTotal = shown.length + (custom?.length ?? 0);
  const cardTotal =
    shown.reduce((n, deck) => n + deck.count, 0) +
    (custom ?? []).reduce((n, deck) => n + deck.cards.length, 0);

  return (
    <div>
      <h1 className="max-w-[40rem] text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
        {deckTotal === 0 ? (
          <Say k="index.headlineEmpty" />
        ) : (
          <Say k="index.headline" args={[count(deckTotal, "deck"), count(cardTotal, "card")]} />
        )}
      </h1>
      <p className="mt-4 max-w-[33rem] text-muted">
        <Say k="index.subtitle" />
      </p>

      {prefs.showBuiltIns && shown.length > 0 && (
        <ul className="deck-grid mt-8 sm:mt-10">
          {/* The link carries the decks it is offering, so the card can
              count what it will actually deal rather than every deck in
              content/. Without a parameter the shuffle falls back to these
              same preferences, so a bookmark behaves the same way. */}
          <li className="col-span-full">
            <DeckCard
              deck={shuffledDeck}
              due={prefs.scheduled ? dueTotal : 0}
              studyHref={studyHref("all", prefs.scheduled, query)}
              // Print is not switched: a sheet of paper has no idea what day
              // it is, so it deals the whole set in either mode.
              printHref={`/print/all${query}`}
            />
          </li>
          {shown.map((deck) => (
            <li key={deck.slug}>
              <DeckCard
                deck={deck}
                due={prefs.scheduled ? due[deck.slug] : 0}
                studyHref={studyHref(deck.slug, prefs.scheduled)}
                actions={
                  <>
                    <a
                      href={`/export/${deck.slug}`}
                      download={`${deck.slug}.md`}
                      className="label text-muted hover:text-ink"
                    >
                      <Say k="deck.export" />
                    </a>
                    <button
                      type="button"
                      onClick={(event) => {
                        focusNeighborCard(event);
                        hide(deck.slug);
                      }}
                      className="label text-muted hover:text-ink"
                    >
                      <Say k="deck.hide" />
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
