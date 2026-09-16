/*
 * Run under a fixed zone — see the `test:schedule` script, which sets
 * `TZ=Europe/London`. Half of what this file checks is that day arithmetic
 * survives a clock change, and Node fixes the zone before any of this runs, so
 * it has to be set from outside. London puts the clocks forward on March 30,
 * 2025, and back on October 26, 2025, which is what the boundary cases straddle.
 */
import {
  DEFAULT_FIRST_INTERVAL,
  INTERVALS,
  clampFirstInterval,
  comesBack,
  intervalWords,
  LAST_BOX,
  addDays,
  dayKey,
  dueOn,
  isDue,
  nextBox,
  nextMisses,
} from "./schedule";

function scheduled(seen: boolean, due: string) {
  return { seen, due };
}

const cases: Array<[string, () => boolean]> = [
  [
    "held promotes one box",
    () => nextBox(1, "held") === 2 && nextBox(3, "held") === 4,
  ],

  [
    "the top box does not promote past itself",
    () => nextBox(LAST_BOX, "held") === LAST_BOX,
  ],

  [
    "review drops to box 1 from anywhere",
    () => nextBox(1, "review") === 1 && nextBox(LAST_BOX, "review") === 1,
  ],

  [
    "a right answer clears the misses and a wrong one adds one",
    () =>
      nextMisses(0, "review") === 1 &&
      nextMisses(2, "review") === 3 &&
      nextMisses(7, "held") === 0,
  ],

  [
    "a stray miss count is pulled back to a count rather than trusted",
    () => nextMisses(Number.NaN, "review") === 1 && nextMisses(-4, "review") === 1,
  ],

  [
    "a box off the ladder is pulled back onto it",
    () =>
      nextBox(0, "held") === 2 &&
      nextBox(99, "held") === LAST_BOX &&
      nextBox(Number.NaN, "held") === 2,
  ],

  [
    "the intervals are 1, 2, 3 and 4 days, in even steps",
    () => {
      const from = "2026-09-09";
      const got = [1, 2, 3, 4].map((box) => dueOn(box, from));
      return (
        JSON.stringify(got) ===
          JSON.stringify([
            "2026-09-10",
            "2026-09-11",
            "2026-09-12",
            "2026-09-13",
          ]) && JSON.stringify(INTERVALS) === JSON.stringify([1, 2, 3, 4])
      );
    },
  ],

  [
    "a box above the ladder is pulled back onto it rather than indexing off the end",
    () => dueOn(9, "2026-09-09") === "2026-09-13" && LAST_BOX === 4,
  ],

  [
    "a due date crosses a month, a year and a leap day",
    () =>
      addDays("2026-09-30", 1) === "2026-10-01" &&
      addDays("2026-12-31", 1) === "2027-01-01" &&
      addDays("2028-02-28", 1) === "2028-02-29" &&
      dueOn(4, "2026-12-28") === "2027-01-01",
  ],

  [
    "the clocks going forward does not skip a day",
    () =>
      addDays("2025-03-29", 1) === "2025-03-30" &&
      addDays("2025-03-30", 1) === "2025-03-31" &&
      dueOn(2, "2025-03-29") === "2025-03-31",
  ],

  [
    "the clocks going back does not repeat a day",
    () =>
      addDays("2025-10-25", 1) === "2025-10-26" &&
      addDays("2025-10-26", 1) === "2025-10-27" &&
      dueOn(3, "2025-10-24") === "2025-10-27",
  ],

  [
    "a card due today or earlier is due",
    () =>
      isDue(scheduled(true, "2026-09-09"), "2026-09-09") &&
      isDue(scheduled(true, "2026-08-01"), "2026-09-09"),
  ],

  [
    "a card due tomorrow is not",
    () => !isDue(scheduled(true, "2026-09-10"), "2026-09-09"),
  ],

  [
    "an unseen card is never due, whatever date it carries",
    () =>
      !isDue(scheduled(false, ""), "2026-09-09") &&
      !isDue(scheduled(false, "2026-01-01"), "2026-09-09"),
  ],

  [
    "a day key is local, not UTC",
    () => {
      // Half past eleven at night on New Year's Eve, London time. Read as UTC
      // this is still the 31st; read an hour later it would not be. The point
      // is that the key follows the calendar the reader is looking at.
      const late = new Date(2026, 11, 31, 23, 30);
      return dayKey(late) === "2026-12-31";
    },
  ],

  [
    "a malformed day falls back to counting from today rather than throwing",
    () => addDays("not-a-day", 1) === dayKey(new Date(Date.now() + 86400000)),
  ],

  [
    "a card answered wrong with the setting at four hours comes back four hours later",
    () => {
      // Two in the afternoon, London time.
      const answered = new Date(2026, 8, 15, 14, 0).getTime();
      const back = comesBack(1, "2026-09-15", answered, 4);
      const record = { seen: true, ...back };
      return (
        back.due === "2026-09-15" &&
        back.dueAt === new Date(2026, 8, 15, 18, 0).toISOString() &&
        !isDue(record, "2026-09-15", new Date(2026, 8, 15, 17, 59).getTime()) &&
        isDue(record, "2026-09-15", new Date(2026, 8, 15, 18, 0).getTime())
      );
    },
  ],

  [
    "a card answered right still comes back in the morning, with no time",
    () => {
      const answered = new Date(2026, 8, 15, 14, 0).getTime();
      const back = comesBack(2, "2026-09-15", answered, 4);
      return back.due === "2026-09-17" && back.dueAt === undefined;
    },
  ],

  [
    "a day for box 1 is the ordinary day, with no time",
    () => {
      const back = comesBack(1, "2026-09-15", new Date(2026, 8, 15, 14, 0).getTime(), 24);
      return back.due === "2026-09-16" && back.dueAt === undefined;
    },
  ],

  [
    "a time past midnight carries the day it falls on",
    () => {
      // Eleven at night with eight hours to wait: seven tomorrow morning.
      const back = comesBack(1, "2026-09-15", new Date(2026, 8, 15, 23, 0).getTime(), 8);
      return back.due === "2026-09-16" && back.dueAt === new Date(2026, 8, 16, 7, 0).toISOString();
    },
  ],

  [
    "hours are real hours across the clocks going forward",
    () => {
      // Half past midnight on March 30, 2025; the clocks jump from one to two.
      const answered = new Date(2025, 2, 30, 0, 30).getTime();
      const back = comesBack(1, "2025-03-30", answered, 4);
      return back.due === "2025-03-30" && Date.parse(back.dueAt!) - answered === 4 * 3_600_000;
    },
  ],

  [
    "a first interval off the list is pulled back to a day",
    () =>
      clampFirstInterval(5) === DEFAULT_FIRST_INTERVAL &&
      clampFirstInterval("4") === DEFAULT_FIRST_INTERVAL &&
      clampFirstInterval(8) === 8 &&
      comesBack(1, "2026-09-15", Date.now(), 3).dueAt === undefined,
  ],

  [
    "without a time to compare, a card with one is due by its day",
    () => {
      const record = { seen: true, due: "2026-09-15", dueAt: new Date(2026, 8, 15, 18, 0).toISOString() };
      return isDue(record, "2026-09-15") && !isDue(record, "2026-09-14");
    },
  ],

  [
    "the interval reads as hours or a day",
    () => intervalWords(1) === "1 hour" && intervalWords(4) === "4 hours" && intervalWords(24) === "1 day",
  ],
];

let failed = 0;
for (const [name, check] of cases) {
  let ok = false;
  try {
    ok = check();
  } catch (error) {
    ok = false;
    console.log(`       threw: ${String(error)}`);
  }
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
}
console.log(failed === 0 ? "\nall schedule cases pass" : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
