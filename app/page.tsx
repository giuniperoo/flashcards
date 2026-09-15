import Link from "next/link";
import CustomDeckList from "@/components/CustomDeckList";
import DeckIndex from "@/components/DeckIndex";
import DeckVisibility, { StudyMode } from "@/components/DeckVisibility";
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
          ink: deck.ink,
          count: deck.cards.length,
        }))}
        shuffled={{
          slug: "all",
          name: "Everything, shuffled",
          blurb: `All ${decks.length} decks interleaved — the honest test`,
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

      {/* Two sides that stay two sides: what the page holds on the left —
          adding a deck, and which of the built-in ones it shows — and what the
          app is on the right. Neither ever wraps under the other. When the row
          runs out of room each side stacks within itself instead, the right
          first (mode above its interval), then the left (the button above
          "Show built-in decks"); see the shrink weights on each.

          From 1024px up the left side does not stack at all: it neither shrinks
          nor wraps, so the right side gives up both its lines before the button
          gives up any. Flex shares a shortfall between both sides however
          lopsided the weights, and a few pixels off the left side is enough to
          break "Show built-in decks" onto a line of its own while half the row
          is still empty. Below 640px there are no two sides to keep: the groups
          sit one above the other. */}
      <div className="mt-10 flex flex-col gap-y-2 sm:mt-25 sm:flex-row sm:items-start sm:justify-between sm:gap-x-6">
        <span className="flex min-w-0 shrink flex-wrap items-center gap-x-6 gap-y-2 lg:shrink-0 lg:flex-nowrap">
          <Link
            href="/new"
            className="label inline-flex min-h-11 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink"
          >
            Add your own deck
          </Link>
          <DeckVisibility slugs={decks.map((deck) => deck.slug)} />
        </span>
        <StudyMode />
      </div>
    </div>
  );
}
