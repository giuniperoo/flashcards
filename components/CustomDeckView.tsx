"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Deck } from "@/lib/types";
import { customStudySet, getCustomDeck } from "@/lib/customDecks";
import { toSheets } from "@/lib/print";
import Reviewer from "@/components/Reviewer";
import PrintSheets from "@/components/PrintSheets";
import PrintIntro from "@/components/PrintIntro";

type State = { status: "loading" } | { status: "missing" } | { status: "found"; deck: Deck };

export default function CustomDeckView({
  slug,
  mode,
}: {
  slug: string;
  mode: "study" | "print";
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const deck = getCustomDeck(slug);
    setState(deck ? { status: "found", deck } : { status: "missing" });
  }, [slug]);

  if (state.status === "loading") {
    return <p className="label text-muted">Loading deck…</p>;
  }

  if (state.status === "missing") {
    return (
      <div className="cut rounded-sm bg-card px-5 py-6">
        <h1 className="text-lg font-medium">No deck called “{slug}” here</h1>
        <p className="mt-2 text-sm text-muted">
          Imported decks live in the browser that created them, so this link will
          not open on another device or in a private window.
        </p>
        <div className="mt-4 flex gap-4">
          <Link href="/new" className="label text-muted hover:text-ink">
            Add a deck
          </Link>
          <Link href="/" className="label text-muted hover:text-ink">
            All decks
          </Link>
        </div>
      </div>
    );
  }

  const { deck } = state;
  const cards = customStudySet(deck);

  if (mode === "print") {
    return (
      <>
        <PrintIntro
          title={deck.name}
          slug={deck.slug}
          cardCount={cards.length}
          sheetCount={toSheets(cards).length}
        />
        <PrintSheets cards={cards} title={deck.name} />
      </>
    );
  }

  return (
    <div className="fit">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-medium tracking-tight">{deck.name}</h1>
        {/* Where a scheduled session puts its queue bar, if the bar fits. See
            `components/QueueBar.tsx`. Empty otherwise, and takes no room. The
            row centers its items rather than lining up baselines: the bar has
            no baseline to share, and on the big title's baseline the small
            links sat visibly lower than the bar beside them. */}
        <div data-queue-slot className="flex min-w-0 flex-1 justify-center" />
        <div className="flex items-baseline gap-4">
          <Link href={`/print/${deck.slug}`} className="label text-muted hover:text-ink">
            Print
          </Link>
          <span aria-hidden className="label text-muted">
            ·
          </span>
          <Link href="/" className="label text-muted hover:text-ink">
            All decks
          </Link>
        </div>
      </div>
      <Reviewer cards={cards} schedulable />
    </div>
  );
}
