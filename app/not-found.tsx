import Link from "next/link";
import { Say } from "@/components/Voice";
import VoiceTitle from "@/components/VoiceTitle";

export const metadata = { title: "Page not found" };

/* Any address the routes do not answer. A deck slug never lands here: an
   unknown one is handed to `CustomDeckView`, which says so in its own words,
   since the deck may live in another browser. */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="cut rounded-sm bg-card px-5 py-6 sm:px-8">
        <VoiceTitle k="notFound.title" />
        <h1 className="text-lg font-medium">
          <Say k="notFound.heading" />
        </h1>
        <p className="mt-2 max-w-[46ch] text-sm text-muted">
          <Say k="notFound.body" />
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/"
            className="press label inline-flex min-h-11 pointer-fine:min-h-9 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Say k="nav.allDecks" />
          </Link>
          <Link
            href="/new"
            className="press label inline-flex min-h-11 pointer-fine:min-h-9 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Say k="nav.addDeck" />
          </Link>
        </div>
      </div>
    </div>
  );
}
