"use client";

import { usePrefs } from "@/lib/usePrefs";

/**
 * The controls for what the index shows, and which app it is.
 *
 * They live at the foot of the page, beside "Add your own deck", rather than
 * above the grid. Someone who has hidden the built-in decks because none of
 * them are theirs is never going to press "show" again, and a control they will
 * not use has no business sitting in the middle of the page. The schedule
 * switch is pressed about as often, and answers the same kind of question —
 * what this index is for — so it belongs in the same row.
 *
 * Each label names the mode it moves to rather than the state it is in, the way
 * "Hide built-in decks" already does.
 */
export default function DeckVisibility({ slugs }: { slugs: string[] }) {
  const [prefs, update] = usePrefs();

  // Counted against the decks that exist, not the stored list, so a slug left
  // over from a deck that has since been renamed cannot inflate the number.
  const hidden = prefs.showBuiltIns
    ? slugs.filter((slug) => prefs.hiddenDecks.includes(slug)).length
    : 0;

  return (
    // A centred bullet between each control, the same separator as "Print · All
    // decks" on a study page, with the same spacing.
    <span className="flex flex-wrap items-center gap-x-4">
      {hidden > 0 && (
        <>
          <button
            type="button"
            onClick={() => update({ ...prefs, hiddenDecks: [] })}
            className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
          >
            {`Bring back ${hidden} deck${hidden === 1 ? "" : "s"}`}
          </button>
          <Bullet />
        </>
      )}
      <button
        type="button"
        onClick={() => update({ ...prefs, showBuiltIns: !prefs.showBuiltIns })}
        className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
      >
        {prefs.showBuiltIns
          ? "Hide built-in decks"
          : "Show built-in decks"}
      </button>
      <Bullet />
      {/* On by default: spaced repetition is the app, and free study is the
          choice. What it changes is which reviewer the links on this page
          open; a link that already exists keeps opening what it always did.
          The sun behind the page and the mark in the header show the mode.

          The label names the mode the button takes you to, with an arrow to
          say it is a destination: "Free study →" while you are on a schedule.
          A bare "Free study" could read as the mode you are already in, which
          is also why there is no styling for the on state — emphasis on the
          destination's name says the opposite of what it means. The arrow is
          hidden from screen readers, which hear "Switch to free study". */}
      <button
        type="button"
        onClick={() => update({ ...prefs, scheduled: !prefs.scheduled })}
        aria-label={
          prefs.scheduled ? "Switch to free study" : "Switch to spaced repetition"
        }
        className="label inline-flex min-h-11 items-center gap-2 text-muted hover:text-ink"
      >
        {prefs.scheduled ? "Free study" : "Spaced repetition"}
        <span aria-hidden>→</span>
      </button>
    </span>
  );
}

function Bullet() {
  return (
    <span aria-hidden className="label text-muted">
      ·
    </span>
  );
}
