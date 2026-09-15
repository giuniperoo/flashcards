"use client";

import { useEffect, useId, useState } from "react";
import { FIRST_INTERVALS, DEFAULT_FIRST_INTERVAL, intervalWords } from "@/lib/schedule";
import { loadReviewerPrefs, saveReviewerPrefs } from "@/lib/reviewerPrefs";
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
    // A centered bullet between each control, the same separator as "Print · All
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
      {/* Only on a schedule: in free study nothing comes back at all, so the
          setting would govern nothing and has no business on the page. */}
      {prefs.scheduled && (
        <>
          <FirstInterval />
          <Bullet />
        </>
      )}
      {/* On by default: spaced repetition is the app, and free study is the
          choice. What it changes is which reviewer the links on this page
          open; a link that already exists keeps opening what it always did.
          The sun behind the page and the mark in the header show the mode.

          The label names the mode the button takes you to, with an arrow to
          say it is a destination: "Free study →" while you are on a schedule.
          A bare "Free study" could read as the mode you are already in, which
          is also why there is no styling for the on state — emphasis on the
          destination's name says the opposite of what it means. The arrow is
          hidden from screen readers, which hear "Switch to free study".

          Both labels sit in one grid cell and only one is visible, so the
          button is always as wide as the longer of them. This row is
          right-aligned: a button that changed width with its label pushed
          "Hide built-in decks" sideways every time the mode was switched. The
          visible label starts from the left, so the gap after the bullet
          holds too, and the reserved width follows the real text in whatever
          font renders it rather than a number. */}
      <button
        type="button"
        onClick={() => update({ ...prefs, scheduled: !prefs.scheduled })}
        aria-label={
          prefs.scheduled ? "Switch to free study" : "Switch to spaced repetition"
        }
        className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
      >
        <span className="grid">
          <ModeLabel text="Free study" shown={prefs.scheduled} />
          <ModeLabel text="Spaced repetition" shown={!prefs.scheduled} />
        </span>
      </button>
    </span>
  );
}

/**
 * How soon a card answered wrong comes back: 1, 2, 4 or 8 hours, or a day.
 *
 * A native select, styled as one of this row's labels. It names the current
 * value rather than a destination, unlike the mode switch beside it, because it
 * is a choice among five rather than a way out. Starts at the default, which is
 * what the server renders, and reads the stored value after mount.
 */
function FirstInterval() {
  const id = useId();
  const [hours, setHours] = useState(DEFAULT_FIRST_INTERVAL);
  useEffect(() => {
    setHours(loadReviewerPrefs().firstInterval);
  }, []);

  return (
    <label htmlFor={id} className="label inline-flex min-h-11 items-center gap-2 text-muted">
      Red cards back in
      <select
        id={id}
        value={hours}
        onChange={(event) => {
          const next = Number(event.target.value);
          setHours(next);
          saveReviewerPrefs({ firstInterval: next });
        }}
        className="label cursor-pointer appearance-none border-b border-dotted border-muted bg-transparent text-ink hover:border-ink"
      >
        {FIRST_INTERVALS.map((value) => (
          <option key={value} value={value}>
            {intervalWords(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Bullet() {
  return (
    <span aria-hidden className="label text-muted">
      ·
    </span>
  );
}

function ModeLabel({ text, shown }: { text: string; shown: boolean }) {
  return (
    <span
      aria-hidden
      className={`col-start-1 row-start-1 inline-flex gap-2 ${shown ? "" : "invisible"}`}
    >
      {text}
      <span>→</span>
    </span>
  );
}
