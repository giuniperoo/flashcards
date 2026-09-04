import Link from "next/link";
import type { ReactNode } from "react";

/** Everything a card shows. Deliberately not a `Deck`: the index renders a
    dozen of these and has no use for the cards themselves, which are the bulk
    of a deck and would otherwise be serialised into the page for nothing. */
export type DeckSummary = {
  slug: string;
  name: string;
  blurb: string;
  tint: string;
  count: number;
};

/**
 * One deck on the index. Study and print are always there; `actions` is where
 * the two lists differ — a built-in deck can be exported and hidden, an
 * imported one exported and deleted.
 */
export default function DeckCard({
  deck,
  actions,
}: {
  deck: DeckSummary;
  actions?: ReactNode;
}) {
  return (
    <div className="cut relative h-full overflow-hidden rounded-sm bg-card">
      <span
        aria-hidden
        className="absolute top-0 right-0 h-8 w-8"
        style={{
          background: deck.tint,
          clipPath: "polygon(100% 0,0 0,100% 100%)",
        }}
      />
      <Link
        href={`/study/${deck.slug}`}
        className="block px-5 pt-4 pb-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="label text-muted">{deck.count} cards</span>
        <span className="mt-1 block text-lg font-medium">{deck.name}</span>
        <span className="mt-1 block text-sm text-muted">{deck.blurb}</span>
      </Link>
      <div className="flex border-t border-rule">
        <Link
          href={`/study/${deck.slug}`}
          className="label flex-1 px-5 py-3 text-muted hover:text-ink"
        >
          Study
        </Link>
        <Link
          href={`/print/${deck.slug}`}
          className="label border-l border-rule px-4 py-3 text-muted hover:text-ink"
        >
          Print
        </Link>
        {actions}
      </div>
    </div>
  );
}
