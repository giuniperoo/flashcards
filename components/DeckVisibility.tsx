"use client";

import { useEffect, useId, useState } from "react";
import {
  FIRST_INTERVALS,
  DEFAULT_FIRST_INTERVAL,
  intervalWords,
} from "@/lib/schedule";
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
    /* Two lines, not one wrapping row: the switches, then the interval under
       them. All of it together is wider than the 3xl column the index sits in,
       and a row that wraps on its own put a separating bullet at the start of a
       line, separating nothing and reading as a list. The bullets stay for what
       does share a line, the same separator as "Print · All decks" on a study
       page. Right-aligned, like the row it sits in. */
    <span className="flex flex-col items-end gap-y-1">
      <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
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
          onClick={() =>
            update({ ...prefs, showBuiltIns: !prefs.showBuiltIns })
          }
          className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
        >
          {prefs.showBuiltIns ? "Hide built-in decks" : "Show built-in decks"}
        </button>
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
        <Separated>
          <button
            type="button"
            onClick={() => update({ ...prefs, scheduled: !prefs.scheduled })}
            aria-label={
              prefs.scheduled
                ? "Switch to free study"
                : "Switch to spaced repetition"
            }
            className="label inline-flex min-h-11 items-center text-muted hover:text-ink"
          >
            <span className="grid">
              <ModeLabel text="Free study" shown={prefs.scheduled} />
              <ModeLabel text="Spaced repetition" shown={!prefs.scheduled} />
            </span>
          </button>
        </Separated>
      </span>
      {/* Under the mode it belongs to, and only on a schedule: in free study
          nothing comes back at all, so the setting would govern nothing and has
          no business on the page. */}
      {prefs.scheduled && <FirstInterval />}
    </span>
  );
}

/**
 * How soon a card answered wrong comes back: 1, 2, 4 or 8 hours, or a day.
 *
 * A bar of five segments, drawn like the queue bar on a study page, with the
 * current one filled. Every choice is on show, so there is nothing to open to
 * find out what the others are. Underneath it is a radio group: Tab reaches it
 * once, the arrow keys move between the choices, and a screen reader hears
 * "1 hour", "2 hours" and so on rather than the short labels.
 *
 * Each segment is as tall as the queue bar, 22px, and a box behind it stretches
 * what it answers to a press to 44px. Starts at the default, which is what the
 * server renders, and reads the stored value after mount.
 */
function FirstInterval() {
  const name = useId();
  const [hours, setHours] = useState(DEFAULT_FIRST_INTERVAL);
  useEffect(() => {
    setHours(loadReviewerPrefs().firstInterval);
  }, []);

  return (
    <span
      role="radiogroup"
      aria-labelledby={`${name}-label`}
      className="inline-flex min-h-11 items-center gap-2"
    >
      <span id={`${name}-label`} className="label text-muted">
        Retry misses in
      </span>
      <span className="interval-bar">
        {FIRST_INTERVALS.map((value) => (
          <label key={value} className={value === hours ? "chosen" : undefined}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={value === hours}
              onChange={() => {
                setHours(value);
                saveReviewerPrefs({ firstInterval: value });
              }}
              aria-label={intervalWords(value)}
              className="sr-only"
            />
            <span aria-hidden>{value >= 24 ? "1 day" : `${value}h`}</span>
          </label>
        ))}
      </span>
    </span>
  );
}

/**
 * A control behind its separator. The two never part: a bullet left at the end
 * of a line when the row wraps is a bullet separating nothing.
 */
function Separated({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-x-4">
      {/* Gone at phone width, where the two switches stack: a bullet at the
          start of a line separates nothing. */}
      <span aria-hidden className="label hidden text-muted sm:inline">
        ·
      </span>
      {children}
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
