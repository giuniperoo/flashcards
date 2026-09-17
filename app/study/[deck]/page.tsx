import type { Metadata } from "next";
import Link from "next/link";
import Reviewer from "@/components/Reviewer";
import ShuffledSet from "@/components/ShuffledSet";
import CustomDeckView from "@/components/CustomDeckView";
import { decks, getDeck, studySet } from "@/lib/loadDecks";

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ deck: "all" }, ...decks.map((d) => ({ deck: d.slug }))];
}

// An imported deck's name is only in the browser; `CustomDeckView` sets its
// title there, and the server's frame has the app's name.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ deck: string }>;
}): Promise<Metadata> {
  const { deck: slug } = await params;
  if (slug === "all") return { title: "Everything" };
  const deck = getDeck(slug);
  return deck ? { title: deck.name } : {};
}

export default async function StudyPage({
  params,
}: {
  params: Promise<{ deck: string }>;
}) {
  const { deck: slug } = await params;

  if (slug !== "all" && !getDeck(slug)) {
    return (
      <div className="fit mx-auto w-full max-w-3xl">
        <CustomDeckView slug={slug} mode="study" />
      </div>
    );
  }

  const cards = studySet(slug);
  const title = slug === "all" ? "Everything" : getDeck(slug)!.name;

  return (
    <div className="fit mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {/* Where a scheduled session puts its queue bar, if the bar fits. See
            `components/QueueBar.tsx`. Empty otherwise, and takes no room. The
            row centers its items rather than lining up baselines: the bar has
            no baseline to share, and on the big title's baseline the small
            links sat visibly lower than the bar beside them. */}
        <div data-queue-slot className="flex min-w-0 flex-1 justify-center" />
        <div className="flex items-baseline gap-4">
          <Link href={`/print/${slug}`} className="label text-muted hover:text-ink">
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
      {slug === "all" ? (
        <ShuffledSet
          cards={cards}
          slugs={decks.map((d) => d.slug)}
          mode="study"
          title={title}
        />
      ) : (
        <Reviewer cards={cards} schedulable />
      )}
    </div>
  );
}
