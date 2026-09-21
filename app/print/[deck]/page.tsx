import type { Metadata } from "next";
import CustomDeckView from "@/components/CustomDeckView";
import ShuffledSet from "@/components/ShuffledSet";
import PrintIntro from "@/components/PrintIntro";
import PrintSheets from "@/components/PrintSheets";
import VoiceTitle from "@/components/VoiceTitle";
import { pick } from "@/lib/copy";
import { decks, getDeck, studySet } from "@/lib/loadDecks";
import { toSheets } from "@/lib/print";

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ deck: "all" }, ...decks.map((d) => ({ deck: d.slug }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deck: string }>;
}): Promise<Metadata> {
  const { deck: slug } = await params;
  if (slug === "all") return { title: pick("print.allTitle", "plain") };
  const deck = getDeck(slug);
  return deck ? { title: `Print ${deck.name}` } : {};
}

export default async function PrintPage({
  params,
}: {
  params: Promise<{ deck: string }>;
}) {
  const { deck: slug } = await params;

  if (slug !== "all" && !getDeck(slug)) {
    return <CustomDeckView slug={slug} mode="print" />;
  }

  const cards = studySet(slug);
  const title = slug === "all" ? pick("print.allHeading", "plain") : getDeck(slug)!.name;

  // The shuffle follows the same hidden decks the index does; a single deck
  // prints whatever the file says, hidden or not.
  if (slug === "all") {
    return (
      <div>
        <VoiceTitle k="print.allTitle" />
        <ShuffledSet
          cards={cards}
          slugs={decks.map((d) => d.slug)}
          mode="print"
          title={title}
        />
      </div>
    );
  }

  return (
    <div>
      <PrintIntro
        title={title}
        slug={slug}
        cardCount={cards.length}
        sheetCount={toSheets(cards).length}
      />
      <PrintSheets cards={cards} title={title} />
    </div>
  );
}
