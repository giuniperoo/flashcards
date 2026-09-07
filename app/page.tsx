import Link from "next/link";
import CustomDeckList from "@/components/CustomDeckList";
import DeckIndex from "@/components/DeckIndex";
import DeckVisibility from "@/components/DeckVisibility";
import LogoSun from "@/components/LogoSun";
import { decks, totalCards } from "@/lib/loadDecks";

export default function Home() {
  return (
    <div>
      <LogoSun />

      <DeckIndex
        decks={decks.map((deck) => ({
          slug: deck.slug,
          name: deck.name,
          blurb: deck.blurb,
          tint: deck.tint,
          count: deck.cards.length,
        }))}
        shuffled={{
          slug: "all",
          name: "Everything, shuffled",
          blurb: `All ${decks.length} decks interleaved — the honest test`,
          // The mark's own cream ground: the card that is every deck wears
          // the logo's colour rather than a hue that would read as a deck.
          tint: "#e0d4bf",
          count: totalCards,
        }}
      />

      <CustomDeckList />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:mt-25">
        <Link
          href="/new"
          className="label inline-flex min-h-11 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink"
        >
          Add your own deck
        </Link>
        <DeckVisibility slugs={decks.map((deck) => deck.slug)} />
      </div>
    </div>
  );
}
