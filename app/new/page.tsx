import Link from "next/link";
import DeckImporter from "@/components/DeckImporter";
import { Say, Voiced } from "@/components/Voice";
import VoiceTitle from "@/components/VoiceTitle";
import { pick } from "@/lib/copy";
import { decks } from "@/lib/loadDecks";

export const metadata = { title: pick("nav.addDeck", "plain") };

export default function NewDeckPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <VoiceTitle k="nav.addDeck" />
        <h1 className="text-2xl font-medium tracking-tight">
          <Say k="nav.addDeck" />
        </h1>
        <Link href="/" className="label text-muted hover:text-ink">
          <Say k="nav.allDecks" />
        </Link>
      </div>

      <p className="mb-6 max-w-lg text-muted">
        <Say k="new.intro" />
      </p>

      <DeckImporter
        reservedSlugs={decks.map((d) => d.slug)}
        reservedTints={decks.map((d) => d.tint)}
      />

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="text-lg font-medium">
          <Say k="new.formatHeading" />
        </h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          <Voiced
            plain={
              <>
                One <code>Q:</code> line, one <code>A:</code> line, a blank line
                between cards. Answers can run over several lines. Everything
                above the first card is optional front matter.
              </>
            }
            swearengen={
              <>
                One <code>Q:</code> line, one <code>A:</code> line, and a blank
                line between cards, which ain&rsquo;t complicated. An answer can
                run over several lines. Everything above the first card is front
                matter, and you can leave it out if you&rsquo;ve nothing to say.
              </>
            }
          />
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

        <h3 className="mt-8 text-base font-medium">
          <Say k="new.otherShapes" />
        </h3>
        <p className="mt-2 max-w-lg text-sm text-muted">
          <Say k="new.headingsShape" />
        </p>
        <pre className="cut mt-3 overflow-x-auto rounded-sm bg-card p-4 font-mono text-[13px] leading-relaxed">{`# Deck title

## What is a pod?
The smallest deployable unit.

## What does a Service do?
A stable IP in front of changing pods.`}</pre>

        <p className="mt-4 max-w-lg text-sm text-muted">
          <Say k="new.lineShape" />
        </p>
        <pre className="cut mt-3 overflow-x-auto rounded-sm bg-card p-4 font-mono text-[13px] leading-relaxed">{`What is a pod? | The smallest deployable unit.
What does a Service do? | A stable IP in front of pods.`}</pre>

        <h3 className="mt-8 text-base font-medium">
          <Say k="new.rules" />
        </h3>
        <ul className="mt-3 max-w-lg space-y-2 text-sm text-muted">
          <li>
            <strong className="font-medium text-ink">Title</strong>{" "}
            <Voiced
              plain={
                <>
                  comes from the first <code>#</code> line. Without one the deck
                  is called &ldquo;Untitled deck&rdquo;.
                </>
              }
              swearengen={
                <>
                  comes off the first <code>#</code> line. Leave it off and the
                  deck goes by &ldquo;A deck with no name&rdquo;, which
                  you&rsquo;ve earned.
                </>
              }
            />
          </li>
          <li>
            <strong className="font-medium text-ink">tint</strong>{" "}
            <Say k="new.ruleTint" />
          </li>
          <li>
            <strong className="font-medium text-ink">Card count</strong>{" "}
            <Say k="new.ruleCount" />
          </li>
          <li>
            <strong className="font-medium text-ink">
              Keep answers to one or two sentences
            </strong>
            <Say k="new.ruleLength" />
          </li>
        </ul>
      </section>
    </div>
  );
}
