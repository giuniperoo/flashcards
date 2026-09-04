import Link from "next/link";
import CustomDeckList from "@/components/CustomDeckList";
import DeckIndex from "@/components/DeckIndex";
import { decks, totalCards } from "@/lib/loadDecks";

export default function Home() {
  return (
    <div>
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
          tint: "#e4e2da",
          count: totalCards,
        }}
      />

      <CustomDeckList />

      <p className="mt-10">
        <Link
          href="/new"
          className="label inline-flex min-h-11 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink"
        >
          Add your own deck
        </Link>
      </p>
    </div>
  );
}
