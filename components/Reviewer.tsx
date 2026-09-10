"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudyCard } from "@/lib/types";
import type { CardProgress, ProgressStore } from "@/lib/progress";
import {
  cardKey,
  emptyProgress,
  loadProgress,
  saveProgress,
  unseenCard,
} from "@/lib/progress";
import { FIRST_BOX, dayKey, dueOn, nextBox, type Grade } from "@/lib/schedule";
import { shuffled } from "@/lib/shuffle";

/* The progress strip's geometry: how many dashes go in a row.
 *
 * The cap is dynamic. MAX_PER_ROW is the most a row may hold so a dash stays
 * wide enough to read, and MIN_DASH stops a narrow screen from packing that
 * many in anyway — whichever binds gives the capacity.
 *
 * Then the rows are chosen before the columns, and chosen to fill the last
 * one. `count / rows` rounded up is the column count for a given number of
 * rows, so walking the row count upwards from the fewest that fit and
 * keeping the fullest last row lands on a row count that divides the deck
 * where one exists nearby: 264 cards capped at 40 gives 7 rows of 38 with a
 * stub of 36, but 8 rows of 33 comes out exactly even, so 33 wins. On a
 * phone, where the cap falls to 31, it finds 11 rows of 24.
 *
 * It is best effort, not a guarantee — a prime card count has no even split
 * at all, so the search takes the fullest last row in the window and stops.
 * Searching further would buy a rounder strip at the cost of rows nobody
 * asked for.
 *
 * A deck smaller than the capacity is one row of `count`, which `1fr`
 * columns stretch across the full width. */
const MAX_PER_ROW = 40;
const MIN_DASH = 8;
const COL_GAP = 3;
const EXTRA_ROWS = 4;

function columnsFor(count: number, width: number) {
  if (count < 1) return 1;
  const fits = Math.floor((width + COL_GAP) / (MIN_DASH + COL_GAP));
  const capacity = Math.max(1, Math.min(MAX_PER_ROW, fits));
  const fewest = Math.ceil(count / capacity);

  let best = capacity;
  let bestFill = -1;
  for (let rows = fewest; rows <= fewest + EXTRA_ROWS; rows++) {
    const columns = Math.ceil(count / rows);
    const last = count - (rows - 1) * columns;
    /* Rounding up can make the rows before the last hold everything, which
       means this row count is not reachable. Skip it. */
    if (last < 1) continue;
    const fill = last / columns;
    if (fill > bestFill) {
      best = columns;
      bestFill = fill;
      /* Exactly even. Nothing further can beat it, and every later row
         count only adds rows. */
      if (fill === 1) break;
    }
  }
  return best;
}

/**
 * The verdict the strip and the tally have always shown, now derived rather
 * than stored: box 1 is where a card you got wrong lands, anything above it is
 * a card you have held. A freshly migrated store therefore looks exactly as it
 * did before, which is the point — task 2 changes no pixels. Task 4 replaces
 * this with the box ramp, and it is the only thing standing in the way.
 */
function verdictOf(record: CardProgress | undefined): Grade | undefined {
  if (!record?.seen) return undefined;
  return record.box === FIRST_BOX ? "review" : "held";
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT");
}

export default function Reviewer({ cards }: { cards: StudyCard[] }) {
  const [order, setOrder] = useState(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<ProgressStore>(emptyProgress);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const card = order[position];
  const key = cardKey(card);

  // The migration needs the cards, but they must not retrigger the read — the
  // page above hands down a fresh array each time it renders.
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // One store for every deck, so there is no key to take as a prop and no
  // second record of this card to disagree with. The day is read once, here:
  // a session that runs past midnight should keep the date it opened with
  // rather than move a card's due date under the reader mid-deck.
  const [today] = useState(dayKey);
  useEffect(() => {
    setSaved(loadProgress(cardsRef.current, today));
    setReady(true);
  }, [today]);

  useEffect(() => {
    if (!ready) return;
    saveProgress(saved);
  }, [saved, ready]);

  // Read through a ref so committing a draft — which replaces saved.cards —
  // does not count as a card change and turn the card back over.
  const recordsRef = useRef(saved.cards);
  useEffect(() => {
    recordsRef.current = saved.cards;
  }, [saved.cards]);

  useEffect(() => {
    setDraft(recordsRef.current[key]?.draft ?? "");
    setFlipped(false);
    setError(false);
  }, [key, ready]);

  const commitDraft = useCallback(
    (value: string) => {
      setSaved((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [key]: { ...(prev.cards[key] ?? unseenCard), draft: value },
        },
      }));
    },
    [key],
  );

  const move = useCallback(
    (step: number) => {
      commitDraft(draft);
      setPosition((p) => (p + step + order.length) % order.length);
    },
    [commitDraft, draft, order.length],
  );

  const flip = useCallback(() => {
    if (flipped) {
      setFlipped(false);
      return;
    }
    if (!draft.trim()) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    commitDraft(draft);
    setFlipped(true);
  }, [flipped, draft, commitDraft]);

  const grade = useCallback(
    (value: Grade) => {
      setSaved((prev) => {
        const before = prev.cards[key] ?? unseenCard;
        // An unseen card sits at box 1, so held promotes it to 2 and review
        // leaves it there. The two buttons still say the same two things.
        const box = nextBox(before.box, value);
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [key]: {
              ...before,
              box,
              due: dueOn(box, today),
              reviewed: today,
              seen: true,
            },
          },
        };
      });
      move(1);
    },
    [key, move, today],
  );

  const shuffle = useCallback(() => {
    commitDraft(draft);
    setOrder((current) => shuffled(current));
    setPosition(0);
  }, [commitDraft, draft]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        flip();
        return;
      }
      if (isTyping(event.target) || event.metaKey || event.ctrlKey) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (flipped && (event.key === "1" || event.key.toLowerCase() === "k")) {
        event.preventDefault();
        grade("held");
      } else if (flipped && (event.key === "2" || event.key.toLowerCase() === "r")) {
        event.preventDefault();
        grade("review");
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        shuffle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, move, grade, shuffle, flipped]);

  /* The strip needs its own width to choose a column count, and the width
     depends on the viewport. Measured rather than guessed, so the count is
     right at any size; `columns` starts at 0 and the strip renders a single
     row until the first measurement lands, one frame later. */
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripWidth, setStripWidth] = useState(0);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setStripWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo(
    () => columnsFor(order.length, stripWidth),
    [order.length, stripWidth],
  );

  const tally = useMemo(() => {
    const values = order.map((c) => verdictOf(saved.cards[cardKey(c)]));
    return {
      held: values.filter((v) => v === "held").length,
      review: values.filter((v) => v === "review").length,
    };
  }, [order, saved.cards]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="label text-muted">
          <span
            aria-hidden
            className="mr-2 inline-block h-2 w-2 rounded-[2px] align-middle"
            style={{ background: card.deck.ink }}
          />
          {card.deck.name} · card {card.index + 1}
        </span>
        <div className="flex items-center gap-3">
          <span className="label text-muted" aria-live="polite">
            {position + 1}/{order.length}
            {tally.held + tally.review > 0 && (
              <> · {tally.held} held · {tally.review} to revisit</>
            )}
          </span>
          <button
            type="button"
            onClick={shuffle}
            className="label min-h-9 rounded-sm border border-rule px-3 text-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Shuffle
          </button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Card {position + 1} of {order.length}, {card.deck.name}.{" "}
        {flipped ? "Showing the answer." : "Showing the question."}
      </p>

      <div className="[perspective:1600px]">
        <div className="flip" data-face={flipped ? "back" : "front"}>
          <Face tint={card.deck.tint} className="flex flex-col" hidden={flipped}>
            <p className="label" style={{ color: "var(--color-question)" }}>
              Question
            </p>
            <p className="mt-3 text-lg leading-snug font-medium sm:text-xl">
              {card.q}
            </p>
            <label htmlFor="recall" className="sr-only">
              Write your answer before turning the card over
            </label>
            <textarea
              id="recall"
              ref={inputRef}
              rows={4}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError(false);
              }}
              onBlur={() => commitDraft(draft)}
              aria-invalid={error}
              aria-describedby={error ? "recall-error" : undefined}
              placeholder="Write it from memory. A half answer still counts."
              // Grows into whatever the card's fixed height leaves over, and
              // stays draggable. `grow shrink-0` rather than `flex-1` because
              // flex-1 sets a 0% basis, which overrides the height the resize
              // handle writes; an auto basis lets a dragged height stick. The
              // card then grows with it, which is a shift the reader asked for.
              className="mt-5 w-full shrink-0 grow resize-y rounded-sm border border-rule bg-transparent p-3 text-base leading-relaxed outline-none placeholder:text-muted focus:border-ink sm:text-[15px]"
            />
            {error && (
              <p id="recall-error" role="alert" className="mt-2 text-sm text-error">
                Write something first — the guess is the part that works.
              </p>
            )}
          </Face>

          <Face
            tint={card.deck.tint}
            className="face-back flex flex-col"
            hidden={!flipped}
          >
            <p className="label" style={{ color: "var(--color-answer)" }}>
              Answer
            </p>
            <p className="mt-3 text-base leading-relaxed sm:text-[17px]">
              {card.a}
            </p>
            <div className="mt-5 border-t border-rule pt-4">
              <p className="label text-muted">You wrote</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {saved.cards[key]?.draft}
              </p>
            </div>
            {/* mt-auto pins the row to the bottom edge on every card, so the
                grading buttons sit in one place as you move through a deck.
                pt-5 keeps a gap when a long answer leaves no slack to absorb. */}
            <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() => grade("held")}
                className="min-h-11 flex-1 rounded-sm border border-rule px-3 py-2 text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                I had it
              </button>
              <button
                type="button"
                onClick={() => grade("review")}
                className="min-h-11 flex-1 rounded-sm border border-rule px-3 py-2 text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Needs review
              </button>
            </div>
          </Face>
        </div>
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous card"
          className="min-h-11 w-14 rounded-sm border border-rule text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ←
        </button>
        <button
          type="button"
          onClick={flip}
          className="min-h-11 flex-1 rounded-sm border border-ink px-3 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {flipped ? "Turn back" : "Turn card over"}
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next card"
          className="min-h-11 w-14 rounded-sm border border-rule text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          →
        </button>
      </div>

      {/* One dash per card, on a grid rather than a wrapping flex row.
       *
       * Every column is `1fr` of the same track list, so every dash is the
       * same width. The old `flex-1` stretched whatever was left over onto
       * the final row, which is why a 46-card last row read as dashes three
       * times wider than the rows above it.
       *
       * `columnsFor` picks the count; see it for why rows come first.
       *
       * Rows are a fixed 7px with the dashes centred in them, so a row is
       * not resized by the taller current-card marker, and the row gap is
       * wider than the column gap — rows read as rows. */}
      <div
        className="mt-5 grid items-center gap-x-[3px] gap-y-[5px]"
        ref={stripRef}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridAutoRows: "7px",
        }}
        aria-hidden
      >
        {order.map((c, i) => {
          const g = verdictOf(saved.cards[cardKey(c)]);
          /* The current card is full row height rather than a wider dash:
             at 8px there is no width to spare, and a taller mark stays
             findable in several hundred of them. */
          const current = i === position;
          return (
            <span
              key={cardKey(c)}
              className={`rounded-full ${current ? "h-[7px]" : "h-[3px]"}`}
              style={{
                background: current
                  ? c.deck.ink
                  : g === "held"
                    ? "var(--color-held)"
                    : g === "review"
                      ? "var(--color-review)"
                      : "var(--color-rule)",
              }}
            />
          );
        })}
      </div>

      <p className="label mt-4 hidden text-muted sm:block">
        ⌘/Ctrl + Enter turn over · ← → move · 1 held · 2 revisit · S shuffle
      </p>
    </div>
  );
}

function Face({
  tint,
  className = "",
  hidden,
  children,
}: {
  tint: string;
  className?: string;
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={hidden}
      className={`face cut relative overflow-hidden rounded-sm bg-card px-4 py-5 sm:px-8 sm:py-6 ${className}`}
    >
      <span
        aria-hidden
        className="absolute top-0 right-0 h-8 w-8 sm:h-9 sm:w-9"
        style={{ background: tint, clipPath: "polygon(100% 0,0 0,100% 100%)" }}
      />
      {children}
    </div>
  );
}
