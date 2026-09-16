/**
 * Leitner boxes: the whole schedule, as pure functions over plain values.
 *
 * A card sits in a box. Answer it right and it moves up one; answer it wrong
 * and it drops to box 1 however far it had climbed. Each box has its own
 * interval, so the cards you keep failing come back constantly and the ones you
 * know recede. That is the entire algorithm, which is why it is Leitner here
 * rather than SM-2 or FSRS: it takes exactly the binary signal the reviewer
 * already collects, and a trained model has nothing to learn from 264 cards and
 * one reader.
 *
 * Dates are local `YYYY-MM-DD` strings rather than epoch milliseconds. A card
 * graded at eleven at night should come back in the morning, not at eleven the
 * following night, and a day is what the reader is actually thinking in. They
 * also compare correctly with `<`, so a due check needs no parsing.
 *
 * Nothing here reads storage or the clock unless asked: every function takes
 * `today` so a test can name the day.
 */

export type Grade = "held" | "review";

/**
 * Days before a card in each box comes back. Box n is `INTERVALS[n - 1]`.
 *
 * Four boxes of one, two, three and four days: even steps, and short.
 *
 * Most spaced repetition grows the gap every time, because a memory you have
 * recalled lasts a little longer before it fades. That is the right model for a
 * subject you mean to keep for years, and the wrong one for this app, whose
 * horizon is an interview in days or weeks. On doubling gaps a card missed late
 * in its climb falls back to the bottom and has to wait through the long gaps
 * again, and a few of those in one deck put the whole deck most of a month out.
 * Here a card answered right every time reaches the top box on day five, and a
 * miss costs six days to recover rather than a week or more.
 *
 * The ladder has been shortened twice: 1/2/4/8/16, then 1/2/4/7, then this.
 *
 * The cost is volume, and it is taken knowingly. A card's top box sets how often
 * it returns for as long as it is studied, so the steady load of a library is
 * its size over the longest gap: 264 cards at four days is about 66 a day. That
 * lands on the cross-deck queue. Studied one deck at a time it is six to eight.
 */
export const INTERVALS = [1, 2, 3, 4];

export const FIRST_BOX = 1;
export const LAST_BOX = INTERVALS.length;

/**
 * How soon a card in box 1 comes back, in hours: the one setting the schedule
 * has, and the unit the whole ladder is counted in. Box n waits `INTERVALS[n - 1]`
 * of it, so at 8 hours red comes back in 8, orange in 16, yellow in 24 and green
 * in 32. A choice rather than a slider, since the difference between five hours
 * and six is noise and a control with twenty-four positions invites tuning
 * something that does not repay it. 24 is the ordinary day, and the default,
 * which is the one, two, three and four days above.
 *
 * It moved box 1 alone at first, on the grounds that the rungs above were
 * already inside the horizon and the morning was the right time for all of
 * them. In use, a short interval on the bottom rung only was a card missed this
 * afternoon and back in an hour, then gone for two days the moment it was
 * answered right: the day before an interview, the whole deck wants the shorter
 * clock, not the one card. What that gives up is the morning — at hours, a card
 * answered at eleven at night comes back at an hour of the night too.
 */
export const FIRST_INTERVALS = [1, 2, 4, 8, 24];
export const DEFAULT_FIRST_INTERVAL = 24;

const HOUR = 3_600_000;

/** What `isDue` needs. `lib/progress.ts` records satisfy it structurally, which
    is what keeps the schedule from importing the store it schedules.

    `dueAt` is an ISO timestamp that only a box 1 card carries, and only when
    the first interval is shorter than a day. `due` is still the day it falls
    on, so everything that thinks in days — the queue's grouping by day, what
    counts as overdue, the words for when a deck comes back — keeps working. */
export type Scheduled = { seen: boolean; due: string; dueAt?: string };

/** Boxes outside the ladder are pulled back onto it rather than trusted: the
    store is hand-editable and a stray value should not index off the end.
    Exported because the strip indexes a color by box and needs the same
    guarantee the intervals get. */
export function clampBox(box: number) {
  if (!Number.isFinite(box)) return FIRST_BOX;
  return Math.min(Math.max(Math.trunc(box), FIRST_BOX), LAST_BOX);
}

/** Right promotes one box and stops at the top; wrong goes all the way back. */
export function nextBox(box: number, grade: Grade) {
  return grade === "review" ? FIRST_BOX : Math.min(clampBox(box) + 1, LAST_BOX);
}

/**
 * Times running a card has been answered wrong. Right clears it, wrong adds one,
 * with no ceiling. Nothing reads it at the moment; see `CardProgress` for why it
 * is kept.
 */
export function nextMisses(misses: number, grade: Grade) {
  if (grade === "held") return 0;
  return (Number.isFinite(misses) ? Math.max(0, Math.trunc(misses)) : 0) + 1;
}

export function dueOn(box: number, today: string) {
  return addDays(today, INTERVALS[clampBox(box) - 1]);
}

/** "4 hours", "1 hour", or "1 day": the interval in words, for the setting at
    the foot of the index and the color key, so the two say it the same way. */
export function intervalWords(hours: number) {
  if (hours >= 24) return "1 day";
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** A first interval off the list is pulled back to the default rather than
    trusted: the preference is hand-editable. */
export function clampFirstInterval(hours: unknown) {
  return typeof hours === "number" && FIRST_INTERVALS.includes(hours)
    ? hours
    : DEFAULT_FIRST_INTERVAL;
}

/**
 * When a card placed in `box` comes back: a day key, and a time when the
 * interval is shorter than a day.
 *
 * With a sub-day interval the wait is the box's step times the interval,
 * counted from `now`, the moment of the answer, and `due` is the local day that
 * time falls on. So a card missed at eleven at night with eight hours to wait
 * carries tomorrow's day and a seven o'clock time, and the same card answered
 * right into box 2 waits sixteen. At a day it is the day key alone, counted in
 * calendar days from `today`, so the card comes back in the morning.
 */
export function comesBack(
  box: number,
  today: string,
  now: number,
  firstInterval: number = DEFAULT_FIRST_INTERVAL,
): { due: string; dueAt?: string } {
  const hours = clampFirstInterval(firstInterval);
  if (hours < 24) {
    const at = new Date(now + INTERVALS[clampBox(box) - 1] * hours * HOUR);
    return { due: dayKey(at), dueAt: at.toISOString() };
  }
  return { due: dueOn(box, today) };
}

/**
 * A card is due when it has been graded and its time has come. Unseen cards are
 * not due — they are the new pool, which the queue draws from separately.
 *
 * A card with a `dueAt` is due once `now` reaches it. Without `now` only the day
 * is known, and it is due once its day has come, like any other card; every
 * caller that builds a session or counts one passes `now`.
 */
export function isDue(record: Scheduled, today: string, now?: number) {
  if (!record.seen || record.due === "") return false;
  if (record.dueAt && now !== undefined) {
    const at = Date.parse(record.dueAt);
    if (Number.isFinite(at)) return now >= at;
  }
  return record.due <= today;
}

/** A `Date` as a local day key. */
export function dayKey(when: Date = new Date()) {
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${when.getFullYear()}-${month}-${day}`;
}

/**
 * Day arithmetic through `Date`'s own calendar fields, which is what makes it
 * survive a daylight saving boundary: adding one to the date lands on the next
 * calendar day at the same wall clock, whether or not that day is 23 or 25
 * hours long. Adding 86,400,000 milliseconds does not.
 */
export function addDays(day: string, days: number) {
  const from = parseDay(day);
  if (!from) {
    // A malformed day is not worth guessing at; count from today instead.
    const now = new Date();
    now.setDate(now.getDate() + days);
    return dayKey(now);
  }
  from.setDate(from.getDate() + days);
  return dayKey(from);
}

/** A day key as a local `Date` at midnight, or null if it is not one. */
function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(date)) {
    return null;
  }
  return new Date(year, month - 1, date);
}

/**
 * Whole days from one day key to the other, negative when `to` is the earlier.
 * Rounded rather than truncated, which is what carries it over a daylight
 * saving boundary: the 23- and 25-hour days either side of one still count as
 * a day each. Used to say when a deck comes back in words rather than a date.
 */
export function daysBetween(from: string, to: string) {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
