"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StudyCard } from "@/lib/types";
import type { CardProgress, ProgressStore } from "@/lib/progress";
import {
  cardKey,
  emptyProgress,
  loadProgress,
  saveProgress,
  unseenCard,
} from "@/lib/progress";
import {
  FIRST_BOX,
  clampBox,
  dayKey,
  daysBetween,
  dueOn,
  nextBox,
  type Grade,
} from "@/lib/schedule";
import { buildQueue } from "@/lib/queue";
import { shuffled } from "@/lib/shuffle";
import { wantsSchedule } from "@/lib/studyMode";

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
 * The verdict the strip and the tally show outside a scheduled session, derived
 * rather than stored: box 1 is where a card you got wrong lands, anything above
 * it is a card you have held. A freshly migrated store therefore looks exactly
 * as it did before the schedule arrived, which is the point — with the mode off
 * this is the reviewer it always was.
 */
function verdictOf(record: CardProgress | undefined): Grade | undefined {
  if (!record?.seen) return undefined;
  return record.box === FIRST_BOX ? "review" : "held";
}

/**
 * A dash's colour. Two outside a scheduled session, four inside one: red for a
 * card you just got wrong, green for one you have earned the longest gap on, and
 * orange and yellow for the rungs between. Inside a session the box is what the
 * reader is working against, and a verdict throws away three quarters of what
 * the store knows.
 */
function dashColor(record: CardProgress | undefined, scheduled: boolean) {
  if (!record?.seen) return "var(--color-rule)";
  if (!scheduled) {
    return record.box === FIRST_BOX ? "var(--color-review)" : "var(--color-held)";
  }
  return `var(--color-box-${clampBox(record.box)})`;
}

/** The soonest day any card in this deck comes back, or "" if none is scheduled. */
function nextReturn(
  cards: StudyCard[],
  records: Record<string, CardProgress>,
) {
  let soonest = "";
  for (const card of cards) {
    const record = records[cardKey(card)];
    if (!record?.seen || !record.due) continue;
    if (!soonest || record.due < soonest) soonest = record.due;
  }
  return soonest;
}

/** When a deck comes back, in the words somebody would use for it. */
function returnsIn(day: string, today: string) {
  const days = daysBetween(today, day);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  const [year, month, date] = day.split("-").map(Number);
  const when = new Date(year, month - 1, date);
  // Inside a week the weekday is enough to plan around; past it, it isn't.
  return days < 7
    ? `on ${when.toLocaleDateString(undefined, { weekday: "long" })}`
    : `on ${when.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}`;
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT");
}

/**
 * A scheduled session in progress.
 *
 * `cards` is the queue *as it was dealt*, and it does not shrink. Cards leave
 * the rotation as they are graded, but the strip keeps holding all of them, so
 * it fills as the session goes rather than eating itself — which is the whole
 * of what makes it a progress bar rather than a map.
 */
type Session = {
  cards: StudyCard[];
  /** How many of them had never been seen. Part of the total, not extra to it. */
  fresh: number;
  promoted: number;
  reset: number;
};

export default function Reviewer({
  cards,
  schedulable = false,
}: {
  cards: StudyCard[];
  /** Whether this route may open a scheduled session at all. Off everywhere
      except a single deck: `/study/all` is task 6, and it has a remount bug to
      settle before its queue can change size nightly. */
  schedulable?: boolean;
}) {
  const [order, setOrder] = useState(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<ProgressStore>(emptyProgress);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* The mode, and the session it opens.
   *
   * `scheduled` is read off the URL and governs how the strip reads. `session`
   * is the queue being studied, and is null once the reader steps out of it
   * into the whole deck — the box colours stay, because they asked for this
   * app, but the schedule has stopped choosing the cards. `left` remembers
   * that they did, so the queue is not rebuilt underneath them. */
  const [scheduled, setScheduled] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [left, setLeft] = useState(false);

  const card = order[position];
  const key = card ? cardKey(card) : "";

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

  /* Read after mount, like `?deck=` in `ShuffledSet` and for the same reason:
     `useSearchParams` on a prerendered route needs a Suspense boundary, and a
     boundary around a reviewer left the whole subtree unhydrated — the cards
     rendered and no button did anything. */
  useEffect(() => {
    if (!schedulable) return;
    setScheduled(wantsSchedule(window.location.search));
  }, [schedulable]);

  /* Deal the queue, once, when the progress it needs has arrived. Guarded on
     `session` rather than a ref: building it is what ends the condition. */
  useEffect(() => {
    if (!ready || !scheduled || left || session) return;
    const queue = buildQueue(cardsRef.current, saved.cards, today);
    setSession({
      cards: queue,
      fresh: queue.filter((c) => !saved.cards[cardKey(c)]?.seen).length,
      promoted: 0,
      reset: 0,
    });
    setOrder(queue);
    setPosition(0);
  }, [ready, scheduled, left, session, saved.cards, today]);

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
      if (!key) return;
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
      if (order.length === 0) return;
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
    /* Let go of the answer box before the card turns. Cmd+Enter flips from
       inside it, and a box that keeps focus once it has turned away still
       counts as typing: 1 and 2 went into the hidden answer instead of grading
       the card, and the reader only found out on turning it back. The face is
       also made inert below, but that alone is not relied on to move focus. */
    inputRef.current?.blur();
    setFlipped(true);
  }, [flipped, draft, commitDraft]);

  /** Leave the queue for the whole deck. The schedule stops choosing cards;
      grading them still writes one, which is what makes this not a mode. */
  const studyEverything = useCallback(() => {
    setSession(null);
    setLeft(true);
    setOrder(cardsRef.current);
    setPosition(0);
  }, []);

  const grade = useCallback(
    (value: Grade) => {
      if (!card) return;
      // An unseen card sits at box 1, so held promotes it to 2 and review
      // leaves it there. The two buttons still say the same two things.
      const before = saved.cards[key] ?? unseenCard;
      const box = nextBox(before.box, value);

      setSaved((prev) => {
        const record = prev.cards[key] ?? unseenCard;
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [key]: {
              ...record,
              box,
              due: dueOn(box, today),
              reviewed: today,
              seen: true,
            },
          },
        };
      });

      if (!session) {
        move(1);
        return;
      }

      /* In a session the card leaves the queue rather than the cursor moving
         past it, so the next card falls into this position on its own and the
         session is over when there is nothing left to fall in. A card already
         at the top box counts as held rather than promoted — it did not move. */
      setSession((s) =>
        s && {
          ...s,
          promoted: s.promoted + (box > before.box ? 1 : 0),
          reset: s.reset + (value === "review" ? 1 : 0),
        },
      );
      commitDraft(draft);
      const remaining = order.filter((_, i) => i !== position);
      setOrder(remaining);
      setPosition(remaining.length === 0 ? 0 : Math.min(position, remaining.length - 1));
    },
    [card, saved.cards, key, today, session, move, commitDraft, draft, order, position],
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
      } else if (!session && event.key.toLowerCase() === "s") {
        event.preventDefault();
        shuffle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, move, grade, shuffle, flipped, session]);

  const tally = useMemo(() => {
    const values = order.map((c) => verdictOf(saved.cards[cardKey(c)]));
    return {
      held: values.filter((v) => v === "held").length,
      review: values.filter((v) => v === "review").length,
    };
  }, [order, saved.cards]);

  /* Waiting on the queue. Only ever reached with the parameter in the URL, so
     the reviewer nobody asked to change never renders this. */
  if (scheduled && !session && !left) {
    return <p className="label text-muted">Dealing today’s cards…</p>;
  }

  if (session && session.cards.length === 0) {
    return (
      <NothingDue
        deck={cards[0]?.deck.name ?? "This deck"}
        returns={nextReturn(cards, saved.cards)}
        today={today}
        onStudyAnyway={studyEverything}
      />
    );
  }

  if (session && order.length === 0) {
    return (
      <SessionDone
        session={session}
        deck={cards[0]?.deck.name ?? "This deck"}
        cards={cards}
        records={saved.cards}
        returns={nextReturn(cards, saved.cards)}
        today={today}
        onStudyDeck={studyEverything}
      />
    );
  }

  if (!card) return null;

  const strip = session ? session.cards : order;
  const done = session ? session.cards.length - order.length : 0;

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
            {session ? (
              <>
                {done}/{session.cards.length} today
                {session.fresh > 0 && <> · {session.fresh} new</>}
              </>
            ) : (
              <>
                {position + 1}/{order.length}
                {tally.held + tally.review > 0 && (
                  <> · {tally.held} held · {tally.review} to revisit</>
                )}
              </>
            )}
          </span>
          {/* No shuffle in a session: you only ever see one card, so reordering
              the ones you have not reached is unobservable, and the button only
              looks like it does something because it resets to position 0. */}
          {!session && (
            <button
              type="button"
              onClick={shuffle}
              className="label min-h-9 rounded-sm border border-rule px-3 text-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Shuffle
            </button>
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {session
          ? `Card ${done + 1} of ${session.cards.length} due today, ${card.deck.name}. `
          : `Card ${position + 1} of ${order.length}, ${card.deck.name}. `}
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

      <Strip
        className="mt-5"
        cards={strip}
        records={saved.cards}
        currentKey={key}
        scheduled={scheduled}
      />

      <p className="label mt-4 hidden text-muted sm:block">
        ⌘/Ctrl + Enter turn over · ← → move · 1 held · 2 revisit
        {!session && <> · S shuffle</>}
      </p>
    </div>
  );
}

/**
 * One dash per card, on a grid rather than a wrapping flex row.
 *
 * Every column is `1fr` of the same track list, so every dash is the same
 * width. The old `flex-1` stretched whatever was left over onto the final row,
 * which is why a 46-card last row read as dashes three times wider than the
 * rows above it.
 *
 * `columnsFor` picks the count; see it for why rows come first.
 *
 * Rows are a fixed 7px with the dashes centred in them, so a row is not resized
 * by the taller current-card marker, and the row gap is wider than the column
 * gap — rows read as rows.
 */
function Strip({
  cards,
  records,
  currentKey,
  scheduled,
  className = "",
}: {
  cards: StudyCard[];
  records: Record<string, CardProgress>;
  /** "" when nothing is current, which is what the done state wants. */
  currentKey: string;
  scheduled: boolean;
  className?: string;
}) {
  /* The strip needs its own width to choose a column count, and the width
     depends on the viewport. Measured rather than guessed, so the count is
     right at any size; `columns` starts at 0 and the strip renders a single
     row until the first measurement lands, one frame later. */
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo(() => columnsFor(cards.length, width), [cards.length, width]);

  return (
    <div
      className={`grid items-center gap-x-[3px] gap-y-[5px] ${className}`}
      ref={ref}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: "7px",
      }}
      aria-hidden
    >
      {cards.map((c) => {
        const k = cardKey(c);
        /* The current card is full row height rather than a wider dash:
           at 8px there is no width to spare, and a taller mark stays
           findable in several hundred of them. */
        const current = k === currentKey;
        return (
          <span
            key={k}
            className={`rounded-full ${current ? "h-[7px]" : "h-[3px]"}`}
            style={{
              background: current ? c.deck.ink : dashColor(records[k], scheduled),
            }}
          />
        );
      })}
    </div>
  );
}

/** The panel both session endings are built from. */
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cut rounded-sm bg-card px-5 py-6 sm:px-8" aria-live="polite">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </div>
  );
}

function AllDecks() {
  return (
    <Link
      href="/"
      className="label inline-flex min-h-11 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      All decks
    </Link>
  );
}

/**
 * The end of a session, and the only place the deck-wide box map still lives:
 * the strip above has become a progress bar for today, so the picture of where
 * the whole deck stands needs somewhere to go, and the moment you have finished
 * with it is the moment worth showing it.
 */
function SessionDone({
  session,
  deck,
  cards,
  records,
  returns,
  today,
  onStudyDeck,
}: {
  session: Session;
  deck: string;
  cards: StudyCard[];
  records: Record<string, CardProgress>;
  returns: string;
  today: string;
  onStudyDeck: () => void;
}) {
  const total = session.cards.length;
  /* Only the halves that happened. A card graded at the top box moves neither
     way, so the two numbers need not add up to the total — and "0 back to box
     1" takes the same room as a real number while saying nothing. */
  const moves = [
    session.promoted > 0 && `${session.promoted} moved up a box`,
    session.reset > 0 && `${session.reset} back to box 1`,
  ].filter(Boolean);
  return (
    <Panel title="Done for today">
      <p className="mt-2 max-w-[46ch] text-sm text-muted">
        {total} card{total === 1 ? "" : "s"}.{moves.length > 0 && ` ${moves.join(", ")}.`}
        {returns && ` ${deck} comes back ${returnsIn(returns, today)}.`}
      </p>
      <Strip
        className="mt-5"
        cards={cards}
        records={records}
        currentKey=""
        scheduled
      />
      <p className="label mt-4 text-muted">The whole deck, by box</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {/* It deals every card, including the ones just done, so it says so.
            It used to read "the rest of the deck" and hide itself when the
            queue had been the whole deck, which was two ways of being wrong
            about the same button. */}
        <button
          type="button"
          onClick={onStudyDeck}
          className="label inline-flex min-h-11 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Study the whole deck
        </button>
        <AllDecks />
      </div>
    </Panel>
  );
}

function NothingDue({
  deck,
  returns,
  today,
  onStudyAnyway,
}: {
  deck: string;
  returns: string;
  today: string;
  onStudyAnyway: () => void;
}) {
  return (
    <Panel title="Nothing due today">
      <p className="mt-2 max-w-[42ch] text-sm text-muted">
        {returns
          ? `${deck} comes back ${returnsIn(returns, today)}.`
          : `Nothing in ${deck} is scheduled yet.`}{" "}
        You can go through the deck anyway — it still counts, and it still
        reschedules.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStudyAnyway}
          className="min-h-11 rounded-sm border border-ink px-4 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Study anyway
        </button>
        <AllDecks />
      </div>
    </Panel>
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
  /* `inert` rather than `aria-hidden` alone. aria-hidden hides a face from a
     screen reader but leaves everything on it focusable, so Tab reached the
     grading buttons on the back while the question was showing, and the
     answer box on the front kept taking keystrokes once it had turned away. */
  return (
    <div
      aria-hidden={hidden}
      inert={hidden}
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
