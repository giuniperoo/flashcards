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
 * colors are neutral on purpose: the strip below already uses color for
 * boxes, and a second meaning for the same hues would muddle both.
 *
 * **Where it goes, and how it reads.** Three places, tried in order, each only
 * if the bar with its words fits there:
 *
 *   1. in the page's title row, between the deck's name and its links
 *   2. on its own line below the title row, still with words
 *   3. on its own line with numbers only, and a legend underneath naming them
 *
 * Whether it fits is measured, never guessed from the screen width: a hidden
 * copy with its words, at its natural width, against the gap in the title row
 * and against the row's full width. So "16 new" keeps its words on a phone,
 * and only a bar with too much to say for the line falls back to numbers. It
 * is measured again when the window or the counts change, before paint so the
 * bar never jumps. An earlier version switched to numbers below 640px
 * regardless, and turned a lone "16 new" into "16" over a legend.
 *
 * The title row is drawn by the server before any progress exists, so it holds
 * an empty `[data-queue-slot]` and the bar is portalled into it.
 *
 * **How wide.** At most `PER_SEGMENT` for each segment shown, then no wider
 * than where it sits. One segment is a short bar rather than a line across the
 * page, and five get room for their proportions.
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

type Placement = "title" | "below" | "numbers";

export default function QueueBar({ counts }: { counts: Breakdown }) {
  const shown = SEGMENTS.filter((segment) => counts[segment.key] > 0);
  const sentence = shown.map((s) => `${counts[s.key]} ${s.word}`).join(", ");
  const signature = shown.map((s) => `${s.key}:${counts[s.key]}`).join(",");

  const measure = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [placement, setPlacement] = useState<Placement>("below");

  useLayoutEffect(() => {
    const natural = measure.current;
    const target = document.querySelector<HTMLElement>("[data-queue-slot]");
    const row = target?.parentElement;
    setSlot(target);
    if (!natural || !target || !row) {
      setPlacement("below");
      return;
    }
    const check = () => {
      const width = natural.getBoundingClientRect().width;
      setPlacement(
        width <= target.clientWidth ? "title" : width <= row.clientWidth ? "below" : "numbers",
      );
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(target);
    observer.observe(row);
    return () => observer.disconnect();
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
      className={`queue-bar ${placement === "numbers" ? "numbers" : ""}`}
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
      {placement === "title" && slot ? (
        createPortal(bar, slot)
      ) : (
        <div className="mb-3">
          {bar}
          {placement === "numbers" && (
            <div className="queue-legend" aria-hidden>
              {shown.map((s) => (
                <span key={s.key}>
                  <i className={s.className} />
                  {s.word}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
