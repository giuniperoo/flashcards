import Link from "next/link";
import Reviewer from "@/components/Reviewer";
import ShuffledSet from "@/components/ShuffledSet";
import CustomDeckView from "@/components/CustomDeckView";
import { decks, getDeck, studySet } from "@/lib/loadDecks";

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ deck: "all" }, ...decks.map((d) => ({ deck: d.slug }))];
}

export default async function StudyPage({
  params,
}: {
  params: Promise<{ deck: string }>;
}) {
  const { deck: slug } = await params;

  if (slug !== "all" && !getDeck(slug)) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <CustomDeckView slug={slug} mode="study" />
      </div>
    );
  }

  const cards = studySet(slug);
  const title = slug === "all" ? "Everything" : getDeck(slug)!.name;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <div className="flex items-baseline gap-4">
          <Link href={`/print/${slug}`} className="label text-muted hover:text-ink">
            Print
          </Link>
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
        <Reviewer cards={cards} />
      )}
    </div>
  );
}
