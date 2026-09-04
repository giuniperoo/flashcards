import { getDeck } from "@/lib/loadDecks";
import { toDeckText } from "@/lib/customDecks";

/**
 * A built-in deck as the markdown you could re-import.
 *
 * Imported decks are exported in the browser, from a `Blob`, because that is
 * where they live. A built-in deck lives on the server, and serialising all of
 * its cards into the page just to feed a download button would put the whole
 * content folder into the payload of the index. A link to this route costs
 * nothing until it is clicked.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deck: string }> },
) {
  const { deck: slug } = await params;
  const deck = getDeck(slug);

  if (!deck) {
    return new Response(`No deck called "${slug}".`, {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(toDeckText(deck), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${deck.slug}.md"`,
    },
  });
}
