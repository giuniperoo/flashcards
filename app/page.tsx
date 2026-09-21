import Link from "next/link";
import CustomDeckList from "@/components/CustomDeckList";
import DeckIndex from "@/components/DeckIndex";
import DeckVisibility, { StudyMode } from "@/components/DeckVisibility";
import LogoSun from "@/components/LogoSun";
import SyncPanel from "@/components/SyncPanel";
import { Say } from "@/components/Voice";
import { pick } from "@/lib/copy";
import { decks, totalCards } from "@/lib/loadDecks";
export default function Home() {
  return (
    // `data-index`: hidden until the reader's preferences are read, on a
    // reload. See `data-index-pending` in `app/globals.css`.
    <div data-index>
      <LogoSun />

      <DeckIndex
        decks={decks.map((deck) => ({
          slug: deck.slug,
          name: deck.name,
          blurb: deck.blurb,
          tint: deck.tint,
          ink: deck.ink,
          count: deck.cards.length,
        }))}
        shuffled={{
          slug: "all",
          name: pick("index.everythingShuffled", "plain"),
          blurb: pick("index.blurbAll", "plain", decks.length),
          // The mark's own cream ground: the card that is every deck wears
          // the logo's color rather than a hue that would read as a deck.
          tint: "#e0d4bf",
          // Darker than `shadeForTint` gives this cream, which is 4.2:1 on the
          // card and too faint for the due count in small capitals. This is
          // the same tan at 4.9:1.
          ink: "#8f6723",
          count: totalCards,
        }}
      />

      <CustomDeckList />

      {/* Two columns from 768px up: what the page holds on the left —
          adding a deck, which built-in decks it shows, and whether this device
          syncs — and what the app is on the right, the mode above its
          interval. A grid rather than a row of flex items, so the left column
          is whatever the right one leaves and its controls wrap inside it:
          they can wrap, but they can never run into the mode. Below 768px it
          is one column, the controls and then the mode. "Sync across devices"
          opens a dialog over the page, so nothing in the row moves. */}
      <div className="mt-10 grid grid-cols-1 gap-y-4 sm:mt-25 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href="/new"
            className="press label mr-2 inline-flex min-h-11 pointer-fine:min-h-9 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink"
          >
            <Say k="index.addOwn" />
          </Link>
          <DeckVisibility slugs={decks.map((deck) => deck.slug)} />
          <SyncPanel />
        </div>
        <StudyMode />
      </div>
    </div>
  );
}
