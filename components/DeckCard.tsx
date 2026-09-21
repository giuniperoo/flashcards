import Link from "next/link";
import type { ReactNode } from "react";
import { Say } from "@/components/Voice";

/** Everything a card shows. Deliberately not a `Deck`: the index renders a
    dozen of these and has no use for the cards themselves, which are the bulk
    of a deck and would otherwise be serialized into the page for nothing. */
export type DeckSummary = {
  slug: string;
  name: string;
  blurb: string;
  tint: string;
  /** The darker shade of the tint, for text. What a due count is written in. */
  ink: string;
  count: number;
};

/**
 * One deck on the index. Study and print are always there; `actions` is where
 * the two lists differ — a built-in deck can be exported and hidden, an
 * imported one exported and deleted.
 */
export default function DeckCard({
  deck,
  due = 0,
  actions,
  studyHref,
  printHref,
}: {
  deck: DeckSummary;
  /** Cards this deck owes today. Only passed on a schedule; nothing due, or
      free study, shows the card count alone. See `lib/useDueCounts.ts`. */
  due?: number;
  actions?: ReactNode;
  /** Defaults to the deck's own routes. The shuffled card overrides them to
      carry `?deck=`, so the link contains the set it is offering. */
  studyHref?: string;
  printHref?: string;
}) {
  const study = studyHref ?? `/study/${deck.slug}`;
  const print = printHref ?? `/print/${deck.slug}`;
  return (
    <div className="cut relative flex h-full flex-col overflow-hidden rounded-sm bg-card">
      <span
        aria-hidden
        className="absolute top-0 right-0 h-8 w-8"
        style={{
          background: deck.tint,
          clipPath: "polygon(100% 0,0 0,100% 100%)",
        }}
      />
      <Link
        href={study}
        className="deck-open block flex-1 px-5 pt-4 pb-3 focus-visible:outline-none"
      >
        <span className="label text-muted">
          {deck.count} card{deck.count === 1 ? "" : "s"}
          {/* In the label the deck already has, rather than a badge: this app
              has no pills, and one shape for one number costs more than it
              says. No "0 due" — a deck with nothing owed says so by saying
              nothing. */}
          {due > 0 && (
            <>
              {" · "}
              <span className="font-medium" style={{ color: deck.ink }}>
                <Say k="deck.due" args={[due]} />
              </span>
            </>
          )}
        </span>
        <span className="mt-1 block text-lg font-medium">{deck.name}</span>
        <span className="mt-1 block text-sm text-muted">{deck.blurb}</span>
      </Link>
      {/* The grid stretches every card in a row to the tallest one. Without
          this the actions would sit under the blurb with the slack below
          them, floating mid-card on anything with a short blurb. */}
      <div className="deck-actions">
        <Link href={study} className="label text-muted hover:text-ink">
          <Say k="deck.study" />
        </Link>
        <Link href={print} className="label text-muted hover:text-ink">
          <Say k="deck.print" />
        </Link>
        {actions}
      </div>
    </div>
  );
}
