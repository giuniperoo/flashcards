"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StudyCard } from "@/lib/types";
import type { CardProgress, ProgressStore } from "@/lib/progress";
import {
  applyGrade,
  cardKey,
  emptyProgress,
  loadProgress,
  saveProgress,
  unseenCard,
  withDraft,
} from "@/lib/progress";
import {
  DEFAULT_FIRST_INTERVAL,
  clampBox,
  dayKey,
  daysBetween,
  type Grade,
} from "@/lib/schedule";
import { breakdown, buildDueQueue, buildQueue } from "@/lib/queue";
import QueueBar from "@/components/QueueBar";
import ColorKey from "@/components/ColorKey";
import { loadReviewerPrefs, saveReviewerPrefs } from "@/lib/reviewerPrefs";
import { shuffled } from "@/lib/shuffle";
import { wantsSchedule, withoutSchedule } from "@/lib/studyMode";
import { Say } from "@/components/Voice";
import { useSay } from "@/lib/useSay";

/* The progress strip's geometry: how many dashes go in a row.
 *
 * The cap is dynamic. MAX_PER_ROW is the most a row may hold so a dash stays
 * wide enough to read, and MIN_DASH stops a narrow screen from packing that
 * many in anyway — whichever binds gives the capacity.
 *
 * Then the rows are chosen before the columns, and chosen to fill the last
 * one. `count / rows` rounded up is the column count for a given number of
 * rows, so walking the row count upward from the fewest that fit and
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
  /* Not measured yet, which is every server render and the first client one.
     The widest row is the best guess: it is the right answer on a desktop, and
     close on a phone. Measuring 0px used to give a capacity of one, so the first
     frame was a column of dashes, one per row, a dozen rows tall for a small
     deck, before it snapped into place. */
  const fits =
    width > 0 ? Math.floor((width + COL_GAP) / (MIN_DASH + COL_GAP)) : MAX_PER_ROW;
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
  return record?.grade || undefined;
}

/**
 * The four colors a scheduled session paints with, box 1 to box 4. Written
 * out rather than built from the number, so the names appear in the source.
 */
const BOX_COLORS = [
  "var(--color-box-1)",
  "var(--color-box-2)",
  "var(--color-box-3)",
  "var(--color-box-4)",
];

/**
 * A dash's color.
 *
 * Outside a scheduled session it is the last answer: green for a card last
 * answered right, red for one last answered wrong. It reads `grade` rather than
 * the box, because free study no longer moves the box.
 *
 * Inside one it is the box, so the color is how far up the ladder a card has
 * climbed: red in box 1, then orange, yellow, and green at the top. A new card
 * answered right goes orange, not green, because green means three right in a
 * row, spread over three returns.
 *
 * For a while it reported misses instead, and one right answer turned any card
 * green. That let a whole deck go green after a single pass, which is the
 * feeling of knowing standing in for knowing — what this app is built against.
 * The miss count is still written; see `CardProgress`.
 */
function dashColor(record: CardProgress | undefined, scheduled: boolean) {
  if (!scheduled) {
    if (record?.grade === "held") return "var(--color-held)";
    if (record?.grade === "review") return "var(--color-review)";
    return "var(--color-rule)";
  }
  if (!record?.seen) return "var(--color-rule)";
  return BOX_COLORS[clampBox(record.box) - 1];
}

/** When a card comes back: its day, and a time if it has one. */
type Return = { due: string; dueAt?: string };

/** A return as a moment, for comparing: its time, or the start of its day. */
function momentOf({ due, dueAt }: Return) {
  const at = dueAt ? Date.parse(dueAt) : Number.NaN;
  if (Number.isFinite(at)) return at;
  const [year, month, date] = due.split("-").map(Number);
  return new Date(year, month - 1, date).getTime();
}

/** The soonest any card in this deck comes back, or null if none is scheduled.
    A deck can hold cards with a time and cards with only a day — the second
    graded while the interval was a day — and one due at four this afternoon
    comes before one due tomorrow, which is why this compares moments and not
    days. */
function nextReturn(
  cards: StudyCard[],
  records: Record<string, CardProgress>,
): Return | null {
  let soonest: Return | null = null;
  for (const card of cards) {
    const record = records[cardKey(card)];
    if (!record?.seen || !record.due) continue;
    if (!soonest || momentOf(record) < momentOf(soonest)) soonest = record;
  }
  return soonest && { due: soonest.due, dueAt: soonest.dueAt };
}

/** Whether a return lands today, which is when "today" in a title is wrong. */
function laterToday(returns: Return | null, today: string) {
  return !!returns && daysBetween(today, returns.due) <= 0;
}

/** When a deck comes back, in the words somebody would use for it: a time when
    it is a card with one, which the day words cannot say. */
function returnsIn({ due: day, dueAt }: Return, today: string) {
  const days = daysBetween(today, day);
  if (dueAt && days <= 1) {
    const time = new Date(dueAt).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return days <= 0 ? `at ${time}` : `tomorrow at ${time}`;
  }
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
 *
 * `graded` is the cards answered so far, in the order they were answered, and
 * the strip draws them first and the rotation after. It used to draw `cards` as
 * dealt, which left answered cards scattered among the ones still to come: the
 * arrows skip an answered card, so a dash in the middle of the strip was a place
 * nothing could reach. Now everything left of the gray is done and everything
 * from the gray on is what the arrows move through, so the strip fills from the
 * left like the bar it is. In answer order rather than dealt order, so a card
 * answered after skipping ahead joins the end of the colored run instead of
 * reshuffling it.
 */
type Session = {
  cards: StudyCard[];
  graded: StudyCard[];
  /** Graded this session. Together they are every card graded, so they add up. */
  right: number;
  missed: number;
  /**
   * Every card in the deck was new when the session opened. The queue bar then
   * has nothing to say but "16 new", so it is not shown — and it stays hidden
   * for the whole session rather than appearing at the first grade, when it
   * would suddenly have "1 done" to show and push the card down mid-answer.
   */
  allNew: boolean;
};

export default function Reviewer({
  cards,
  schedulable = false,
  crossDeck = false,
}: {
  cards: StudyCard[];
  /** Whether this route may open a scheduled session at all. Every study route
      now may — a deck, an imported deck, and `/study/all` — and it is still
      `?scheduled` in the address that opens one. */
  schedulable?: boolean;
  /** `cards` spans several decks. A session then deals only what is due, with
      no new cards — see `buildDueQueue` — and the endings talk about every deck
      rather than naming the first card's. */
  crossDeck?: boolean;
}) {
  const say = useSay();
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
   * `scheduled` is read off the URL. While it is true, answers move the
   * schedule and the strip shows boxes. `session` is the queue being studied.
   * Stepping out of it — "Study anyway", "Study the whole deck" — turns
   * `scheduled` off and drops the parameter from the address, so what follows
   * is free study in every respect, including that it cannot touch the
   * schedule. `left` remembers that they stepped out, so the queue is not
   * rebuilt underneath them. */
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
  // The time, read once for the same reason: a card with a time comes due
  // only if that time had passed when the session was dealt, so a card answered
  // in this session never comes back into it. See `buildDueQueue`.
  const [openedAt] = useState(() => Date.now());
  useEffect(() => {
    setSaved(loadProgress(cardsRef.current, today));
    setReady(true);
  }, [today]);

  // The interval every box is counted in, set at the foot of the index.
  // Read after mount, since storage is not there on the server, and read once:
  // grading uses it, and nothing on screen before the first grade depends on it
  // except the color key's words, which follow it.
  const [firstInterval, setFirstInterval] = useState(DEFAULT_FIRST_INTERVAL);
  useEffect(() => {
    setFirstInterval(loadReviewerPrefs().firstInterval);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveProgress(saved);
  }, [saved, ready]);

  /* Tell the page which mode this is, so the header shows the matching mark:
     sage in free study, cream on a schedule. Read from the address as well as
     from state, because `scheduled` starts false until the effect below reads
     the parameter, and a scheduled session must not flash the sage mark. The
     layout sets the same attribute before paint on a full load; this keeps it
     right on client navigation and through "Study anyway". A layout effect, so
     it lands before paint there too: on a schedule the attribute is what keeps
     the prerendered free study reviewer out of sight (see `data-pending`), and
     a plain effect would let that frame through first. */
  useLayoutEffect(() => {
    const html = document.documentElement;
    const onSchedule =
      schedulable && !left && (scheduled || wantsSchedule(window.location.search));
    html.dataset.mode = onSchedule ? "schedule" : "free";
    return () => {
      delete html.dataset.mode;
    };
  }, [schedulable, scheduled, left]);

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
    const deal = crossDeck ? buildDueQueue : buildQueue;
    const queue = deal(cardsRef.current, saved.cards, today, undefined, openedAt);
    setSession({
      cards: queue,
      graded: [],
      right: 0,
      missed: 0,
      allNew: cardsRef.current.every((c) => !saved.cards[cardKey(c)]?.seen),
    });
    setOrder(queue);
    setPosition(0);
  }, [ready, scheduled, left, session, saved.cards, today, crossDeck, openedAt]);

  /* The color key beside the strip. It opens by itself once, the first time a
     scheduled session starts with cards in it, because that session is where
     the reader first meets an orange dash; after that only when asked. It is
     remembered as shown as soon as it opens, so it never opens unasked twice,
     even if the page is left right away. See `components/ColorKey.tsx`. */
  const [keyOpen, setKeyOpen] = useState(false);
  const keyOfferedRef = useRef(false);
  useEffect(() => {
    if (!session || session.cards.length === 0 || keyOfferedRef.current) return;
    keyOfferedRef.current = true;
    if (loadReviewerPrefs().colorKeyShown) return;
    setKeyOpen(true);
    saveReviewerPrefs({ colorKeyShown: true });
  }, [session]);

  // Read through a ref so committing a draft — which replaces saved.cards —
  // does not count as a card change and turn the card back over.
  const recordsRef = useRef(saved.cards);
  useEffect(() => {
    recordsRef.current = saved.cards;
  }, [saved.cards]);

  /* Cards typed into since this reviewer opened.

     On a schedule a card starts with an empty box, whatever you wrote last
     time. A card coming back with your old answer already in it hands you the
     answer to read, and recognizing an answer is exactly what this app is
     built to stop passing for knowing it. With the switch off, nothing here
     applies and the box opens with your draft as it always has.

     What survives is what you typed during this visit: half an answer, left
     for the next card and come back to, is still where you left it, and so is
     anything you wrote before stepping out of the queue into the whole deck.

     The old answer is not deleted to make the box empty. It stays in the store
     until you write a new one, which is why saving is skipped below for a card
     you have not typed into: moving past a blank box would otherwise write the
     blank over it. */
  const typedRef = useRef(new Set<string>());

  /* Where focus goes once the card on screen has changed under it. Turning a
     card or grading one from the keyboard hides whatever had focus, since the
     face it was on goes inert, and focus fell back to the body: Tab then
     started over from the header, and a screen reader said nothing about the
     answer that had just appeared. So a keyboard turn moves focus onto the
     answer, and a keyboard grade or turn back onto the next question's box.

     Keyboard only. A tap that focused the answer box would open the keyboard
     on a phone over the card the reader is about to look at. `backRef` is the
     answer face; the end of a session focuses its own panel. */
  const focusNext = useRef<"question" | "answer" | null>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [focusEnd, setFocusEnd] = useState(false);

  useEffect(() => {
    const stored = recordsRef.current[key]?.draft ?? "";
    setDraft(scheduled && !typedRef.current.has(key) ? "" : stored);
    setFlipped(false);
    setError(false);
    // The same textarea serves every card, and a scroll position left over from
    // the last card's answer would open this one part way through.
    if (inputRef.current) {
      inputRef.current.scrollLeft = 0;
      inputRef.current.scrollTop = 0;
    }
  }, [key, ready, scheduled]);

  const commitDraft = useCallback(
    (value: string) => {
      if (!key) return;
      if (scheduled && !typedRef.current.has(key)) return;
      setSaved((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [key]: withDraft(prev.cards[key] ?? unseenCard, value),
        },
      }));
    },
    [key, scheduled],
  );

  const move = useCallback(
    (step: number) => {
      if (order.length === 0) return;
      commitDraft(draft);
      setPosition((p) => (p + step + order.length) % order.length);
    },
    [commitDraft, draft, order.length],
  );

  /** Turns the card, and says whether it did: an empty answer box refuses. */
  const flip = useCallback(() => {
    if (flipped) {
      setFlipped(false);
      return true;
    }
    if (!draft.trim()) {
      setError(true);
      inputRef.current?.focus();
      return false;
    }
    commitDraft(draft);
    /* Let go of the answer box before the card turns. Cmd+Enter flips from
       inside it, and a box that keeps focus once it has turned away still
       counts as typing: 1 and 2 went into the hidden answer instead of grading
       the card, and the reader only found out on turning it back. The face is
       also made inert below, but that alone is not relied on to move focus. */
    inputRef.current?.blur();
    setKeyOpen(false);
    setFlipped(true);
    return true;
  }, [flipped, draft, commitDraft]);

  useEffect(() => {
    const target = focusNext.current;
    if (target === "answer" && flipped) backRef.current?.focus();
    // A grade renders the next card still turned for a moment, until the
    // effect above turns it back, so this waits for the question to show.
    else if (target === "question" && !flipped) inputRef.current?.focus();
    else return;
    focusNext.current = null;
    // `scheduled` for stepping out of a session into the whole deck, which can
    // open on the card the session ended on.
  }, [flipped, key, scheduled]);

  /** Leave the queue for free study of the whole deck. Nothing graded from here
      moves the schedule, which is the point: finishing the day's cards and
      carrying on must not change what tomorrow deals. The address loses its
      parameter too, so it says which reviewer this now is. */
  const studyEverything = useCallback((fromKeyboard: boolean) => {
    // The panel's button goes with the panel; the whole deck's first question
    // takes focus instead.
    if (fromKeyboard) focusNext.current = "question";
    window.history.replaceState(
      window.history.state,
      "",
      withoutSchedule(window.location.href),
    );
    setScheduled(false);
    setSession(null);
    setLeft(true);
    setOrder(cardsRef.current);
    setPosition(0);
  }, []);

  const grade = useCallback(
    (value: Grade, fromKeyboard: boolean) => {
      if (!card) return;
      if (fromKeyboard) {
        if (session && order.length === 1) setFocusEnd(true);
        else focusNext.current = "question";
      }
      // Free study records the answer only; see `applyGrade`.
      setSaved((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          // The moment of the answer, not when the page opened: "back in four
          // hours" counts from now.
          [key]: applyGrade(
            prev.cards[key] ?? unseenCard,
            value,
            today,
            scheduled,
            firstInterval,
            Date.now(),
          ),
        },
      }));

      if (!session) {
        move(1);
        return;
      }

      /* In a session the card leaves the queue rather than the cursor moving
         past it, so the next card falls into this position on its own and the
         session is over when there is nothing left to fall in. */
      setSession((s) =>
        s && {
          ...s,
          graded: [...s.graded, card],
          right: s.right + (value === "held" ? 1 : 0),
          missed: s.missed + (value === "review" ? 1 : 0),
        },
      );
      commitDraft(draft);
      const remaining = order.filter((_, i) => i !== position);
      setOrder(remaining);
      setPosition(remaining.length === 0 ? 0 : Math.min(position, remaining.length - 1));
    },
    [card, key, today, scheduled, firstInterval, session, move, commitDraft, draft, order, position],
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
        const to = flipped ? "question" : "answer";
        if (flip()) focusNext.current = to;
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
        grade("held", true);
      } else if (flipped && (event.key === "2" || event.key.toLowerCase() === "r")) {
        event.preventDefault();
        grade("review", true);
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
    return (
      <p data-pending className="label text-muted">
        <Say k="reviewer.dealing" />
      </p>
    );
  }

  if (session && session.cards.length === 0) {
    return (
      <NothingDue
        deck={crossDeck ? null : (cards[0]?.deck.name ?? "This deck")}
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
        deck={crossDeck ? null : (cards[0]?.deck.name ?? "This deck")}
        cards={cards}
        records={saved.cards}
        returns={nextReturn(cards, saved.cards)}
        today={today}
        onStudyDeck={studyEverything}
        focus={focusEnd}
      />
    );
  }

  if (!card) return null;

  const strip = session ? [...session.graded, ...order] : order;
  const done = session ? session.cards.length - order.length : 0;
  const counts = session ? breakdown(cards, session.cards, order, saved.cards, today) : null;

  return (
    // `data-pending` while no session is dealt: on a schedule this is the
    // prerendered free study reviewer, and it is kept out of sight until the
    // session replaces it. In free study the attribute does nothing.
    <div data-pending={session ? undefined : true} className="fit">
      {counts && !session?.allNew && <QueueBar counts={counts} />}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Flex-centered rather than `align-middle`, which centers on the
            lowercase x-height. This label is all capitals, so the swatch sat
            below the middle of the letters beside it. */}
        {/* The deck's name and swatch only where cards from several decks are
            mixed. On a single deck the page title above is the same name, and
            the card's corner is the same color. */}
        <span className="label inline-flex items-center text-muted">
          {crossDeck && (
            <>
              <span
                aria-hidden
                className="mr-2 inline-block h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: card.deck.ink }}
              />
              {card.deck.name} ·{" "}
            </>
          )}
          {/* The card's place in its own deck, not in today's queue: on
              `/study/all` it is still "card 3 of 12" of the deck it came from. */}
          {crossDeck ? "card" : "Card"} {card.index + 1} of {card.deck.cards.length}
        </span>
        <div className="flex items-center gap-3">
          {/* On a schedule the queue bar above carries this, so the count is
              free study's alone. */}
          {!session && (
            <span className="label text-muted" aria-live="polite">
              {position + 1}/{order.length}
              {tally.held + tally.review > 0 && (
                <Say k="reviewer.tally" args={[tally.held, tally.review]} />
              )}
            </span>
          )}
          {/* No shuffle in a session: you only ever see one card, so reordering
              the ones you have not reached is unobservable, and the button only
              looks like it does something because it resets to position 0. */}
          {!session && (
            <button
              type="button"
              onClick={shuffle}
              className="press label min-h-9 rounded-sm border border-rule px-3 text-muted hover:border-ink hover:text-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Say k="reviewer.shuffle" />
            </button>
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {session
          ? say("reviewer.srScheduled", done + 1, session.cards.length, card.deck.name)
          : say("reviewer.srFree", position + 1, order.length, card.deck.name)}
        {flipped ? say("reviewer.srAnswer") : say("reviewer.srQuestion")}
      </p>

      <div className="fit [perspective:1600px]">
        <div className="flip" data-face={flipped ? "back" : "front"}>
          <Face tint={card.deck.tint} className="flex flex-col" hidden={flipped}>
            <p className="label" style={{ color: "var(--color-question)" }}>
              <Say k="reviewer.question" />
            </p>
            <p className="mt-3 text-lg leading-snug font-medium sm:text-xl">
              {card.q}
            </p>
            <label htmlFor="recall" className="sr-only">
              <Say k="reviewer.answerLabel" />
            </label>
            <textarea
              id="recall"
              ref={inputRef}
              rows={4}
              value={draft}
              onChange={(event) => {
                typedRef.current.add(key);
                setDraft(event.target.value);
                if (error) setError(false);
              }}
              onBlur={() => commitDraft(draft)}
              aria-invalid={error}
              aria-describedby={error ? "recall-error" : undefined}
              placeholder={say("reviewer.placeholder")}
              // Grows into whatever the card's fixed height leaves over, and
              // stays draggable. `grow shrink-0` rather than `flex-1` because
              // flex-1 sets a 0% basis, which overrides the height the resize
              // handle writes; an auto basis lets a dragged height stick. The
              // card then grows with it, which is a shift the reader asked for.
              // `overflow-x-hidden` and `wrap-anywhere`: the box grows down,
              // never sideways. WebKit showed a horizontal scrollbar here, the
              // placeholder scrolled part way off to the left, which no answer
              // needs — a long unbroken token wraps instead.
              className="mt-5 w-full shrink-0 grow resize-y overflow-x-hidden rounded-sm border border-rule bg-transparent p-3 text-base leading-relaxed wrap-anywhere outline-none placeholder:text-muted focus:border-ink sm:text-[15px]"
            />
            {error && (
              <p id="recall-error" role="alert" className="mt-2 text-sm text-error">
                <Say k="reviewer.writeFirst" />
              </p>
            )}
          </Face>

          <Face
            ref={backRef}
            tint={card.deck.tint}
            className="face-back flex flex-col"
            hidden={!flipped}
          >
            <p className="label" style={{ color: "var(--color-answer)" }}>
              <Say k="reviewer.answer" />
            </p>
            <p className="mt-3 text-base leading-relaxed sm:text-[17px]">
              {card.a}
            </p>
            <div className="mt-5 border-t border-rule pt-4">
              <p className="label text-muted">
                <Say k="reviewer.youWrote" />
              </p>
              {/* As it was typed: the line breaks, blank lines and indents in
                  the answer box are the reader's own structure, and HTML would
                  otherwise fold them into one line. `wrap-anywhere` as on the
                  box, so a long unbroken token wraps rather than widening the
                  card. */}
              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap wrap-anywhere text-muted">
                {saved.cards[key]?.draft}
              </p>
            </div>
            {/* mt-auto pins the row to the bottom edge on every card, so the
                grading buttons sit in one place as you move through a deck.
                pt-5 keeps a gap when a long answer leaves no slack to absorb.

                Side by side at every width. They used to stack on a phone,
                which cost the back of the card 52px it does not have once the
                card is sized to fit the screen — on a short phone that was the
                whole of the scroll. Both labels fit in half a phone's width. */}
            <div className="mt-auto flex gap-2 pt-5">
              <button
                type="button"
                onClick={(event) => grade("held", event.detail === 0)}
                className="press min-h-11 pointer-fine:min-h-9 flex-1 rounded-sm border border-rule px-3 py-2 pointer-fine:py-1.5 text-sm hover:border-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Say k="grade.held" />
              </button>
              <button
                type="button"
                onClick={(event) => grade("review", event.detail === 0)}
                className="press min-h-11 pointer-fine:min-h-9 flex-1 rounded-sm border border-rule px-3 py-2 pointer-fine:py-1.5 text-sm hover:border-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Say k="grade.review" />
              </button>
            </div>
          </Face>
        </div>
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label={say("reviewer.previous")}
          className="press min-h-11 pointer-fine:min-h-9 w-14 rounded-sm border border-rule text-sm hover:border-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          ←
        </button>
        <button
          type="button"
          onClick={flip}
          className="press min-h-11 pointer-fine:min-h-9 flex-1 rounded-sm border border-ink px-3 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {flipped ? <Say k="reviewer.turnBack" /> : <Say k="reviewer.turnOver" />}
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label={say("reviewer.next")}
          className="press min-h-11 pointer-fine:min-h-9 w-14 rounded-sm border border-rule text-sm hover:border-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          →
        </button>
      </div>

      {/* The "?" ring sits 14px below the arrow above it, and its side gap
          matches: 2px here plus the 12px of press area left of the ring. At
          `gap-3` it was 24px, and the strip stopped short of the arrow. */}
      <div className="mt-5 flex items-center gap-0.5">
        <Strip
          className="min-w-0 flex-1"
          cards={strip}
          records={saved.cards}
          currentKey={key}
          scheduled={scheduled}
        />
        <ColorKey
          scheduled={scheduled}
          firstInterval={firstInterval}
          ink={card.deck.ink}
          open={keyOpen}
          onOpenChange={setKeyOpen}
        />
      </div>

      <p className="label mt-4 hidden text-muted sm:block">
        <Say k="reviewer.keys" />
        {!session && <Say k="reviewer.keysShuffle" />}
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
 * Rows are a fixed 7px with the dashes centered in them, so a row is not resized
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
     right at any size; `width` starts at 0, and `columnsFor` lays the strip
     out at the widest row until the first measurement lands, one frame later. */
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
  focus = false,
  children,
}: {
  title: React.ReactNode;
  /** Take focus when it appears: the last card was graded from the keyboard,
      and the button that graded it has gone. */
  focus?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="cut rounded-sm bg-card px-5 py-6 sm:px-8"
      aria-live="polite"
    >
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </div>
  );
}

function AllDecks() {
  return (
    <Link
      href="/"
      className="press label inline-flex min-h-11 pointer-fine:min-h-9 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Say k="nav.allDecks" />
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
  focus,
}: {
  session: Session;
  /** The deck's name, or null for a set of decks. */
  deck: string | null;
  cards: StudyCard[];
  records: Record<string, CardProgress>;
  returns: Return | null;
  today: string;
  onStudyDeck: (fromKeyboard: boolean) => void;
  focus: boolean;
}) {
  const say = useSay();
  const total = session.cards.length;
  /* Only the halves that happened: "0 need review" takes the same room as a
     real number while saying nothing. The words are the buttons' own, so the
     sentence reads back what the reader pressed. */
  const moves = [
    session.right > 0 && say("done.right", session.right),
    session.missed > 0 && say("done.missed", session.missed),
  ].filter(Boolean);
  return (
    // "For today" is wrong when a card is back this afternoon.
    <Panel
      title={laterToday(returns, today) ? <Say k="done.titleNow" /> : <Say k="done.titleToday" />}
      focus={focus}
    >
      <p className="mt-2 max-w-[46ch] text-sm text-muted">
        {total} card{total === 1 ? "" : "s"}.{moves.length > 0 && ` ${moves.join(", ")}.`}
        {returns &&
          (deck
            ? say("done.deckBack", deck, returnsIn(returns, today))
            : say("done.nextBack", returnsIn(returns, today)))}
      </p>
      <Strip
        className="mt-5"
        cards={cards}
        records={records}
        currentKey=""
        scheduled
      />
      <p className="label mt-4 text-muted">{deck ? "The whole deck" : "Every deck"}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {/* It deals every card, including the ones just done, so it says so.
            It used to read "the rest of the deck" and hide itself when the
            queue had been the whole deck, which was two ways of being wrong
            about the same button. */}
        <button
          type="button"
          onClick={(event) => onStudyDeck(event.detail === 0)}
          className="press label inline-flex min-h-11 pointer-fine:min-h-9 items-center rounded-sm border border-rule px-4 text-muted hover:border-ink hover:text-ink focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {deck ? <Say k="done.studyDeck" /> : <Say k="done.studyEvery" />}
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
  /** The deck's name, or null for a set of decks. */
  deck: string | null;
  returns: Return | null;
  today: string;
  onStudyAnyway: (fromKeyboard: boolean) => void;
}) {
  /* Across decks, "nothing scheduled" needs one more sentence than in a deck:
     this queue never deals new cards, so the way in is a deck of its own, and
     without saying so the reader has no way to find that out. */
  const say = useSay();
  const where = deck
    ? returns
      ? `${deck} comes back ${returnsIn(returns, today)}.`
      : say("nothing.notScheduledDeck", deck)
    : returns
      ? `The next cards come back ${returnsIn(returns, today)}.`
      : say("nothing.notScheduled");
  return (
    <Panel title={laterToday(returns, today) ? <Say k="nothing.titleNow" /> : <Say k="nothing.titleToday" />}>
      <p className="mt-2 max-w-[42ch] text-sm text-muted">
        {say("nothing.body", where, deck !== null)}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => onStudyAnyway(event.detail === 0)}
          className="press min-h-11 pointer-fine:min-h-9 rounded-sm border border-ink px-4 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Say k="nothing.studyAnyway" />
        </button>
        <AllDecks />
      </div>
    </Panel>
  );
}

function Face({
  ref,
  tint,
  className = "",
  hidden,
  children,
}: {
  ref?: React.Ref<HTMLDivElement>;
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
      ref={ref}
      // Focusable from script only, so a keyboard turn can land on the answer.
      tabIndex={ref ? -1 : undefined}
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
