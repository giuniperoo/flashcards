"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FIRST_INTERVALS,
  DEFAULT_FIRST_INTERVAL,
  intervalWords,
} from "@/lib/schedule";
import { loadReviewerPrefs, saveReviewerPrefs } from "@/lib/reviewerPrefs";
import { usePrefs } from "@/lib/usePrefs";

/**
 * What the index shows: the built-in decks, and bringing hidden ones back.
 *
 * These live at the foot of the page, beside "Add your own deck", rather than
 * above the grid. Someone who has hidden the built-in decks because none of
 * them are theirs is never going to press "show" again, and a control they will
 * not use has no business sitting in the middle of the page. Both of these are
 * about the decks on the page, which is why they sit with the button that adds
 * one; what the app *is* — the mode, and the one setting it has — is `StudyMode`
 * at the other end of the row.
 */
/* The two plain controls on the left carry the button's own text inset — its
   1px border and 1rem of padding — so that when the group stacks, their labels
   start on the same line as "Add your own deck" rather than 17px to its left.
   Side by side from 768px up there is nothing to line up with, and the inset
   comes off so the gap between them is the gap the row sets — and so the two
   fit the line they have. */
const PLAIN =
  "label inline-flex min-h-11 items-center border border-transparent px-4 text-muted hover:text-ink focus-visible:outline-none md:border-0 md:px-0";

export default function DeckVisibility({ slugs }: { slugs: string[] }) {
  const [prefs, update] = usePrefs();

  // Counted against the decks that exist, not the stored list, so a slug left
  // over from a deck that has since been renamed cannot inflate the number.
  const hidden = prefs.showBuiltIns
    ? slugs.filter((slug) => prefs.hiddenDecks.includes(slug)).length
    : 0;

  return (
    <span className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => update({ ...prefs, hiddenDecks: [] })}
          className={PLAIN}
        >
          <span className="ring-words">
            {`Bring back ${hidden} deck${hidden === 1 ? "" : "s"}`}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={() => update({ ...prefs, showBuiltIns: !prefs.showBuiltIns })}
        className={PLAIN}
      >
        <span className="ring-words">
          {prefs.showBuiltIns ? "Hide built-in decks" : "Show built-in decks"}
        </span>
      </button>
    </span>
  );
}

/**
 * Which app this is, and the one setting that mode has.
 *
 * The far end of the same row: the mode, then the interval beside it, since the
 * interval is the mode's setting and nothing else's.
 */
export function StudyMode() {
  const [prefs, update] = usePrefs();

  return (
    <span
      /* Shrinks far sooner than the group on the left — 999 to its 1 — so the
         mode and its interval stack before "Add your own deck" gives up its
         line. Below its own content width the two sit one above the other,
         still against the right edge. */
      className="ml-auto flex min-w-0 shrink-[999] flex-wrap items-center justify-end gap-x-6 gap-y-2"
    >
      <Mode
        scheduled={prefs.scheduled}
        onChange={(scheduled) => update({ ...prefs, scheduled })}
      />
      {/* Beside the mode it belongs to, and only on a schedule: in free study
          nothing comes back at all, so the setting governs nothing. Its room is
          kept either way, so pressing the mode does not slide the bar you just
          pressed out from under the pointer. */}
      <span
        className={prefs.scheduled ? undefined : "invisible"}
        aria-hidden={!prefs.scheduled}
      >
        <FirstInterval disabled={!prefs.scheduled} />
      </span>
    </span>
  );
}

/**
 * Which app this is: spaced repetition, or free study.
 *
 * A bar of two, the way the interval beside it is a bar of five, with the
 * current mode filled in the color of the mark in the header — the mark's cream
 * on a schedule, the free study sage otherwise. Both modes on show is what lets
 * the labels name the modes themselves; the button this replaces had to name the
 * mode it moved *to*, with an arrow, since a bare "Free study" would have read
 * as the mode you were already in.
 *
 * Spaced repetition sits on the right, against the interval, because the
 * interval is its setting and nothing else's.
 *
 * What it changes is which reviewer the links on this page open; a link that
 * already exists keeps opening what it always did.
 */
function Mode({
  scheduled,
  onChange,
}: {
  scheduled: boolean;
  onChange: (scheduled: boolean) => void;
}) {
  const name = useId();
  return (
    <span
      role="radiogroup"
      aria-label="Study mode"
      className="inline-flex min-h-11 items-center"
    >
      <span className="segment-bar">
        <label className={scheduled ? undefined : "chosen mode-free"}>
          <input
            type="radio"
            name={name}
            checked={!scheduled}
            onChange={() => onChange(false)}
            aria-label="Free study"
            className="sr-only"
          />
          <span aria-hidden>Free study</span>
        </label>
        <label className={scheduled ? "chosen" : undefined}>
          <input
            type="radio"
            name={name}
            checked={scheduled}
            onChange={() => onChange(true)}
            aria-label="Spaced repetition"
            className="sr-only"
          />
          <span aria-hidden>Spaced repetition</span>
        </label>
      </span>
    </span>
  );
}

/**
 * The interval the schedule is counted in: 1, 2, 4 or 8 hours, or a day. A card
 * answered wrong comes back after one of it, and each rung above waits one more,
 * so at a day this is the ordinary one, two, three and four days.
 *
 * Labeled "Spaced by" rather than the "Retry misses in" it had while it moved
 * the bottom rung alone: it spaces every card now, not only the ones missed.
 *
 * A bar of five segments, drawn like the queue bar on a study page, with the
 * current one filled in the same cream as the mode beside it, since this bar
 * only ever shows on a schedule. Every choice is on show, so there
 * is nothing to open to find out what the others are. Underneath it is a radio
 * group: Tab reaches it once, the arrow keys move between the choices, and a
 * screen reader hears "1 hour", "2 hours" and so on rather than the short
 * labels.
 *
 * Each segment is as tall as the queue bar, 22px, and a box behind it stretches
 * what it answers to a press to 44px. Starts at the default, which is what the
 * server renders, and reads the stored value after mount.
 */
function FirstInterval({ disabled }: { disabled: boolean }) {
  const name = useId();
  const [hours, setHours] = useState(DEFAULT_FIRST_INTERVAL);
  useEffect(() => {
    setHours(loadReviewerPrefs().firstInterval);
  }, []);

  /* The color key in a study session links to `/#interval`. The browser jumps
     to the anchor on arrival, before the deck grid is drawn: the grid comes with
     the stored preferences and imported decks, both read in effects on mount,
     and it pushes this bar a screen or more further down. So the jump is made
     again a render later. Those reads and `arrived` below are set in the same
     round of mount effects, so they render together, and by the time this
     effect runs the grid is on the page. Tested before trusting it: without it
     the page sat at the top, 1,000px above the bar. */
  const [arrived, setArrived] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.location.hash === "#interval") setArrived(true);
  }, []);
  useEffect(() => {
    if (arrived) bar.current?.scrollIntoView({ block: "center" });
  }, [arrived]);

  return (
    <span
      ref={bar}
      id="interval"
      role="radiogroup"
      aria-labelledby={`${name}-label`}
      className="inline-flex min-h-11 items-center gap-2"
    >
      <span id={`${name}-label`} className="label whitespace-nowrap text-muted">
        Spaced by
      </span>
      <span className="segment-bar">
        {FIRST_INTERVALS.map((value) => (
          <label key={value} className={value === hours ? "chosen" : undefined}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={value === hours}
              // Held out of the tab order while the bar is only holding its
              // room open: there is nothing to set in free study.
              disabled={disabled}
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
