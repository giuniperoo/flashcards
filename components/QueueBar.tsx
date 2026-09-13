import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Breakdown } from "@/lib/queue";

/*
 * What today's session holds, across the whole deck, in a slim bar. It replaces
 * the small "3/14 today · 3 new" count a scheduled session used to show: the
 * done segment carries that count's progress, and the rest say what is still
 * to come and what the schedule left out.
 *
 * Segments run in the order the queue deals — done, overdue, due today, new —
 * then the cards not due. Each takes a share of the width by its count, but
 * never less than its label, and a segment with nothing in it is left out. The
 * colours are neutral on purpose: the strip below already uses colour for
 * boxes, and a second meaning for the same hues would muddle both.
 *
 * **Where it goes.** In the page's title row, between the deck's name and its
 * links, when it fits there; below the title row when it does not. The title
 * row is drawn by the server before any progress exists, so it holds an empty
 * `[data-queue-slot]` and the bar is portalled into it. Whether it fits is
 * measured rather than guessed, from a hidden copy at its natural width against
 * the slot's width, and measured again when the window or the counts change.
 * So a long deck name, labels that need more room than the slot has, or a
 * narrow screen all send it below. Below 640px it always goes below, because
 * there the bar shows numbers only and needs its legend underneath.
 *
 * **How wide.** At most `PER_SEGMENT` for each segment shown, then no wider
 * than where it sits. One segment saying "16 new" gets a short bar rather than
 * a line across the page, and five get room for their proportions.
 *
 * Only ever rendered inside a scheduled session, which exists only in the
 * browser, so the layout effect never runs on the server.
 */

const SEGMENTS: Array<{ key: keyof Breakdown; word: string; className: string }> = [
  { key: "done", word: "done", className: "queue-done" },
  { key: "overdue", word: "overdue", className: "queue-overdue" },
  { key: "today", word: "due today", className: "queue-today" },
  { key: "fresh", word: "new", className: "queue-new" },
  { key: "notDue", word: "not due", className: "queue-later" },
];

const PER_SEGMENT = 9; // rem
const WIDE = "(min-width: 640px)";

export default function QueueBar({ counts }: { counts: Breakdown }) {
  const shown = SEGMENTS.filter((segment) => counts[segment.key] > 0);
  const sentence = shown.map((s) => `${counts[s.key]} ${s.word}`).join(", ");
  const signature = shown.map((s) => `${s.key}:${counts[s.key]}`).join(",");

  const measure = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [inTitle, setInTitle] = useState(false);

  // Before paint, so the bar never shows in one place and then jumps.
  useLayoutEffect(() => {
    const natural = measure.current;
    const target = document.querySelector<HTMLElement>("[data-queue-slot]");
    setSlot(target);
    if (!natural || !target) {
      setInTitle(false);
      return;
    }
    const wide = window.matchMedia(WIDE);
    const check = () =>
      setInTitle(wide.matches && natural.getBoundingClientRect().width <= target.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(target);
    wide.addEventListener("change", check);
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", check);
    };
  }, [signature]);

  const segments = () =>
    shown.map((s) => (
      <span key={s.key} className={s.className} style={{ flexGrow: counts[s.key] }}>
        {counts[s.key]}
        <span className="queue-word">{s.word}</span>
      </span>
    ));

  const bar = (
    <div
      className="queue-bar"
      aria-hidden
      style={{ maxWidth: `${shown.length * PER_SEGMENT}rem` }}
    >
      {segments()}
    </div>
  );

  return (
    <>
      <p className="sr-only">Today: {sentence}.</p>
      <div ref={measure} className="queue-bar queue-measure" aria-hidden>
        {segments()}
      </div>
      {inTitle && slot ? (
        createPortal(bar, slot)
      ) : (
        <div className="mb-3">
          {bar}
          <div className="queue-legend" aria-hidden>
            {shown.map((s) => (
              <span key={s.key}>
                <i className={s.className} />
                {s.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
