/*
 * Run under a fixed zone — see the `test:schedule` script, which sets
 * `TZ=Europe/London`. Half of what this file checks is that day arithmetic
 * survives a clock change, and Node fixes the zone before any of this runs, so
 * it has to be set from outside. London puts the clocks forward on 30 March
 * 2025 and back on 26 October 2025, which is what the boundary cases straddle.
 */
import { INTERVALS, LAST_BOX, addDays, dayKey, dueOn, isDue, nextBox } from "./schedule";

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
    "a box off the ladder is pulled back onto it",
    () =>
      nextBox(0, "held") === 2 &&
      nextBox(99, "held") === LAST_BOX &&
      nextBox(Number.NaN, "held") === 2,
  ],

  [
    "the intervals are 1, 2, 4 and 7 days, and stop at a week",
    () => {
      const from = "2026-09-09";
      const got = [1, 2, 3, 4].map((box) => dueOn(box, from));
      return (
        JSON.stringify(got) ===
          JSON.stringify([
            "2026-09-10",
            "2026-09-11",
            "2026-09-13",
            "2026-09-16",
          ]) && JSON.stringify(INTERVALS) === JSON.stringify([1, 2, 4, 7])
      );
    },
  ],

  [
    "a box above the ladder is pulled back onto it rather than indexing off the end",
    () => dueOn(9, "2026-09-09") === "2026-09-16" && LAST_BOX === 4,
  ],

  [
    "a due date crosses a month, a year and a leap day",
    () =>
      addDays("2026-09-30", 1) === "2026-10-01" &&
      addDays("2026-12-31", 1) === "2027-01-01" &&
      addDays("2028-02-28", 1) === "2028-02-29" &&
      dueOn(4, "2026-12-28") === "2027-01-04",
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
      dueOn(3, "2025-10-24") === "2025-10-28",
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
