import Link from "next/link";
import DeckImporter from "@/components/DeckImporter";
import { decks } from "@/lib/loadDecks";

export const metadata = { title: "New deck" };

export default function NewDeckPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-medium tracking-tight">Add a deck</h1>
        <Link href="/" className="label text-muted hover:text-ink">
          All decks
        </Link>
      </div>

      <p className="mb-6 max-w-lg text-muted">
        Write one with Claude, paste one, or upload a file. Added decks study
        and print exactly like the built-in ones, and stay in this browser.
      </p>

      <DeckImporter
        reservedSlugs={decks.map((d) => d.slug)}
        reservedTints={decks.map((d) => d.tint)}
      />

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="text-lg font-medium">The format</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          One <code>Q:</code> line, one <code>A:</code> line, a blank line
          between cards. Answers can run over several lines. Everything above
          the first card is optional front matter.
        </p>

        <pre className="cut mt-4 overflow-x-auto rounded-sm bg-card p-4 font-mono text-[13px] leading-relaxed">{`# Kubernetes basics
tint: #D6E8F7
blurb: Pods, services, and the scheduler

Q: What is a pod?
A: The smallest deployable unit - one or more
containers sharing a network namespace.

Q: What does a Service do?
A: Gives a stable IP and DNS name in front of
a changing set of pods.`}</pre>

        <h3 className="mt-8 text-base font-medium">Two other shapes work too</h3>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Markdown headings, where the question is the heading and the answer is
          the text under it:
        </p>
        <pre className="cut mt-3 overflow-x-auto rounded-sm bg-card p-4 font-mono text-[13px] leading-relaxed">{`# Deck title

## What is a pod?
The smallest deployable unit.

## What does a Service do?
A stable IP in front of changing pods.`}</pre>

        <p className="mt-4 max-w-lg text-sm text-muted">
          Or one card per line, split on a tab or a pipe - which is what you get
          from a spreadsheet export:
        </p>
        <pre className="cut mt-3 overflow-x-auto rounded-sm bg-card p-4 font-mono text-[13px] leading-relaxed">{`What is a pod? | The smallest deployable unit.
What does a Service do? | A stable IP in front of pods.`}</pre>

        <h3 className="mt-8 text-base font-medium">Rules worth knowing</h3>
        <ul className="mt-3 max-w-lg space-y-2 text-sm text-muted">
          <li>
            <strong className="font-medium text-ink">Title</strong> comes from
            the first <code>#</code> line. Without one the deck is called
            &ldquo;Untitled deck&rdquo;.
          </li>
          <li>
            <strong className="font-medium text-ink">tint</strong> takes a
            six-digit hex colour for the corner triangle. Leave it out and one
            is assigned from the unused pastels.
          </li>
          <li>
            <strong className="font-medium text-ink">Card count</strong> can be
            anything, but a multiple of eight fills every printed sheet. Short
            decks leave blank cells on the last one.
          </li>
          <li>
            <strong className="font-medium text-ink">
              Keep answers to one or two sentences
            </strong>{" "}
            - long ones overflow a printed card.
          </li>
        </ul>
      </section>
    </div>
  );
}
