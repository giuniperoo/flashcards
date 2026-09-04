import Link from "next/link";
import CustomDeckList from "@/components/CustomDeckList";
import DeckIndex from "@/components/DeckIndex";
import { decks, totalCards } from "@/lib/loadDecks";

export default function Home() {
  return (
    <div>
      <DeckIndex builtInDecks={decks.length} builtInCards={totalCards}>
        <li className="sm:col-span-2">
          <DeckCard
            slug="all"
            name="Everything, shuffled"
            blurb={`All ${decks.length} decks interleaved — the honest test`}
            count={totalCards}
            tint="#e4e2da"
          />
        </li>
        {decks.map((deck) => (
          <li key={deck.slug}>
            <DeckCard
              slug={deck.slug}
              name={deck.name}
              blurb={deck.blurb}
              count={deck.cards.length}
              tint={deck.tint}
            />
          </li>
        ))}
      </DeckIndex>

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

function DeckCard({
  slug,
  name,
  blurb,
  count,
  tint,
}: {
  slug: string;
  name: string;
  blurb: string;
  count: number;
  tint: string;
}) {
  return (
    <div className="cut relative h-full overflow-hidden rounded-sm bg-card">
      <span
        aria-hidden
        className="absolute top-0 right-0 h-8 w-8"
        style={{ background: tint, clipPath: "polygon(100% 0,0 0,100% 100%)" }}
      />
      <Link
        href={`/study/${slug}`}
        className="block px-5 pt-4 pb-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="label text-muted">{count} cards</span>
        <span className="mt-1 block text-lg font-medium">{name}</span>
        <span className="mt-1 block text-sm text-muted">{blurb}</span>
      </Link>
      <div className="flex border-t border-rule">
        <Link
          href={`/study/${slug}`}
          className="label flex-1 px-5 py-3 text-muted hover:text-ink"
        >
          Study
        </Link>
        <Link
          href={`/print/${slug}`}
          className="label border-l border-rule px-5 py-3 text-muted hover:text-ink"
        >
          Print
        </Link>
      </div>
    </div>
  );
}
