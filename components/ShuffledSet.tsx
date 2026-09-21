"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StudyCard } from "@/lib/types";
import { DECK_PARAM, parseDeckParam, slugsToStudy } from "@/lib/deckFilter";
import { usePrefs } from "@/lib/usePrefs";
import { toSheets } from "@/lib/print";
import Reviewer from "@/components/Reviewer";
import PrintIntro from "@/components/PrintIntro";
import PrintSheets from "@/components/PrintSheets";
import { Say } from "@/components/Voice";

/**
 * `/study/all` and `/print/all`, narrowed to the decks that belong in them.
 *
 * The set is built on the server from every deck in `content/`, which is right
 * — that is what the files say — but the server cannot know which decks this
 * reader has hidden. So the narrowing happens here, from `?deck=` if the link
 * carries one and from the preferences otherwise.
 */
export default function ShuffledSet({
  cards,
  slugs,
  mode,
  title,
}: {
  cards: StudyCard[];
  /** Every built-in slug, in deck order. */
  slugs: string[];
  mode: "study" | "print";
  title: string;
}) {
  const [prefs] = usePrefs();
  // `null` until mounted. The query is read straight off `window.location`
  // rather than with `useSearchParams`, which on a prerendered route needs a
  // Suspense boundary — and a boundary here left the whole reviewer
  // unhydrated: the cards rendered, and no button did anything.
  const [requested, setRequested] = useState<string[] | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).getAll(DECK_PARAM);
    setRequested(parseDeckParam(asked.length > 0 ? asked : null));
  }, []);

  // Until then the server's answer stands — every deck — so hydration matches.
  // When nothing is hidden and no parameter is given, the narrowed set is that
  // same set and nothing below re-renders.
  const keep =
    requested === undefined
      ? null
      : new Set(slugsToStudy(slugs, requested, prefs));
  const visible = keep ? cards.filter((card) => keep.has(card.deck.slug)) : cards;

  if (visible.length === 0) {
    return (
      <div className="cut rounded-sm bg-card px-5 py-6">
        <h2 className="text-lg font-medium">
          <Say k="shuffled.nothing" />
        </h2>
        <p className="mt-2 text-sm text-muted">
          {requested ? <Say k="shuffled.unknown" /> : <Say k="shuffled.allHidden" />}
        </p>
        <p className="mt-4">
          <Link href="/" className="label text-muted hover:text-ink">
            <Say k="nav.allDecks" />
          </Link>
        </p>
      </div>
    );
  }

  if (mode === "print") {
    return (
      <>
        <PrintIntro
          title={title}
          slug="all"
          cardCount={visible.length}
          sheetCount={toSheets(visible).length}
        />
        <PrintSheets cards={visible} title={title} />
      </>
    );
  }

  // Reviewer takes its order from `cards` once, on mount, so a narrowed set
  // has to arrive as a new Reviewer rather than as a new prop. The key is the
  // decks in the set, which is what the set is. It used to be the card count,
  // which only worked because a different set of decks happened to mean a
  // different number of cards; two sets of the same size would not remount.
  // The due queue is not in the key and does not need to be: the reviewer
  // builds it from these cards, once, after mount.
  const key = keep ? slugs.filter((slug) => keep.has(slug)).join(",") : slugs.join(",");
  return <Reviewer key={key} cards={visible} schedulable crossDeck />;
}
