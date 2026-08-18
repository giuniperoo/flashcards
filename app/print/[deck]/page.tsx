import CustomDeckView from "@/components/CustomDeckView";
import PrintIntro from "@/components/PrintIntro";
import PrintSheets from "@/components/PrintSheets";
import { decks, getDeck, studySet } from "@/lib/loadDecks";
import { toSheets } from "@/lib/print";

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ deck: "all" }, ...decks.map((d) => ({ deck: d.slug }))];
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
  const title = slug === "all" ? "All decks" : getDeck(slug)!.name;

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
