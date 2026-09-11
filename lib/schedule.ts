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

/** Days before a card in each box comes back. Box n is `INTERVALS[n - 1]`. */
export const INTERVALS = [1, 2, 4, 8, 16];

export const FIRST_BOX = 1;
export const LAST_BOX = INTERVALS.length;

/** What `isDue` needs. `lib/progress.ts` records satisfy it structurally, which
    is what keeps the schedule from importing the store it schedules. */
export type Scheduled = { seen: boolean; due: string };

/** Boxes outside the ladder are pulled back onto it rather than trusted: the
    store is hand-editable and a stray value should not index off the end.
    Exported because the strip indexes a colour by box and needs the same
    guarantee the intervals get. */
export function clampBox(box: number) {
  if (!Number.isFinite(box)) return FIRST_BOX;
  return Math.min(Math.max(Math.trunc(box), FIRST_BOX), LAST_BOX);
}

/** Right promotes one box and stops at the top; wrong goes all the way back. */
export function nextBox(box: number, grade: Grade) {
  return grade === "review" ? FIRST_BOX : Math.min(clampBox(box) + 1, LAST_BOX);
}

export function dueOn(box: number, today: string) {
  return addDays(today, INTERVALS[clampBox(box) - 1]);
}

/** A card is due when it has been graded and its day has come. Unseen cards are
    not due — they are the new pool, which the queue draws from separately and
    under a cap. */
export function isDue(record: Scheduled, today: string) {
  return record.seen && record.due !== "" && record.due <= today;
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
