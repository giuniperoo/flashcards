"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Deck } from "@/lib/types";
import { customStudySet, getCustomDeck } from "@/lib/customDecks";
import { toSheets } from "@/lib/print";
import Reviewer from "@/components/Reviewer";
import PrintSheets from "@/components/PrintSheets";
import PrintIntro from "@/components/PrintIntro";
import { useStoredMode } from "@/lib/useStoredMode";
import { Say } from "@/components/Voice";
import { useSay } from "@/lib/useSay";
import { useTabTitle } from "@/lib/useTabTitle";

type State = { status: "loading" } | { status: "missing" } | { status: "found"; deck: Deck };

export default function CustomDeckView({
  slug,
  mode,
}: {
  slug: string;
  mode: "study" | "print";
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const say = useSay();
  // An imported deck's print page, from its first frame: "Loading deck…" comes
  // before `PrintIntro`, which sets the same mode once the deck is found. The
  // study page leaves the mode to the reviewer, which reads `?scheduled`.
  useStoredMode(mode === "print");

  useEffect(() => {
    const deck = getCustomDeck(slug);
    setState(deck ? { status: "found", deck } : { status: "missing" });
  }, [slug]);

  const title =
    state.status === "missing"
      ? say("custom.noSuch")
      : state.status === "found"
        ? mode === "print"
          ? `Print ${state.deck.name}`
          : state.deck.name
        : null;
  useTabTitle(title && `${title} · Flashcards`);

  if (state.status === "loading") {
    return (
      <p data-loading className="label text-muted">
        <Say k="custom.loading" />
      </p>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="cut rounded-sm bg-card px-5 py-6">
        <h1 className="text-lg font-medium">
          <Say k="custom.missingHeading" args={[slug]} />
        </h1>
        <p className="mt-2 text-sm text-muted">
          <Say k="custom.missingBody" />
        </p>
        <div className="mt-4 flex gap-4">
          <Link href="/new" className="label text-muted hover:text-ink">
            <Say k="nav.addDeck" />
          </Link>
          <Link href="/" className="label text-muted hover:text-ink">
            <Say k="nav.allDecks" />
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
            <Say k="deck.print" />
          </Link>
          <span aria-hidden className="label text-muted">
            ·
          </span>
          <Link href="/" className="label text-muted hover:text-ink">
            <Say k="nav.allDecks" />
          </Link>
        </div>
      </div>
      <Reviewer cards={cards} schedulable />
    </div>
  );
}
