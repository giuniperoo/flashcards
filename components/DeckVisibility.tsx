"use client";

import { usePrefs } from "@/lib/usePrefs";

/**
 * The controls for what the index shows.
 *
 * They live at the foot of the page, beside "Add your own deck", rather than
 * above the grid. Someone who has hidden the built-in decks because none of
 * them are theirs is never going to press "show" again, and a control they will
 * not use has no business sitting in the middle of the page.
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
    </span>
  );
}
