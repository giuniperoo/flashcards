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
    <span className="flex flex-wrap items-center gap-x-5">
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => update({ ...prefs, hiddenDecks: [] })}
          className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
        >
          {`Bring back ${hidden} deck${hidden === 1 ? "" : "s"}`}
        </button>
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
      {/* Off by default, and only ever a decision. What it changes is which
          reviewer the links on this page open; a link that already exists
          keeps opening what it always did.

          No styling for the on state, and that is not an omission. The label
          names where the button takes you, so "Study whole decks" only appears
          while you are not studying whole decks — the same way "Hide built-in
          decks" tells you they are currently shown. Emphasis on those words
          says the opposite of what they mean. */}
      <button
        type="button"
        onClick={() => update({ ...prefs, scheduled: !prefs.scheduled })}
        className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
      >
        {prefs.scheduled ? "Study whole decks" : "Study on a schedule"}
      </button>
    </span>
  );
}
