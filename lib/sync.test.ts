/*
 * What two devices settle on. The merge has to be the same whichever device
 * runs it and however many times, or two devices would keep sending each other
 * their own copy; and it has to keep the right half of each record, or a free
 * study answer on one device would carry an old box over a newer one.
 */
import type { Deck } from "./types";
import { applyGrade, unseenCard, withDraft, type CardProgress } from "./progress";
import { canonical, mergePayloads, mergeRecord, readPayload, type SyncPayload } from "./syncMerge";
import { decrypt, deriveKeys, encrypt, normalizeKey, suggestKey } from "./syncCrypto";

const DAY = "2026-09-19";
const AT = (hour: number) => Date.parse(`${DAY}T${String(hour).padStart(2, "0")}:00:00Z`);

function deck(slug: string, ids: string[], added?: string): Deck {
  return {
    slug,
    name: slug,
    blurb: "",
    tint: "#000000",
    ink: "#000000",
    cards: ids.map((id) => ({ id, q: `q-${id}`, a: `a-${id}` })),
    ...(added ? { added } : {}),
  };
}

function payload(parts: Partial<SyncPayload>): SyncPayload {
  return { version: 1, progress: {}, decks: [], deleted: {}, ...parts };
}

const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);

const cases: Array<[string, () => boolean | Promise<boolean>]> = [
  [
    "a scheduled answer stamps both times, a free one only the words",
    () => {
      const scheduled = applyGrade(unseenCard, "held", DAY, true, 24, AT(9));
      const free = applyGrade(scheduled, "review", DAY, false, 24, AT(10));
      return (
        scheduled.updatedAt === new Date(AT(9)).toISOString() &&
        scheduled.scheduledAt === scheduled.updatedAt &&
        free.updatedAt === new Date(AT(10)).toISOString() &&
        free.scheduledAt === scheduled.scheduledAt &&
        free.box === scheduled.box
      );
    },
  ],
  [
    "a draft left as it was is not stamped",
    () => {
      const record = withDraft(unseenCard, "one", AT(9));
      return withDraft(record, "one", AT(11)) === record && record.updatedAt === new Date(AT(9)).toISOString();
    },
  ],
  [
    "free study on one device and a schedule on another both survive",
    () => {
      // The laptop answers on a schedule at 9; the phone, still holding the
      // record from before, answers in free study at 10.
      const laptop = applyGrade(unseenCard, "held", DAY, true, 24, AT(9));
      const phone = withDraft(applyGrade(unseenCard, "review", DAY, false, 24, AT(10)), "phone", AT(10));
      const merged = mergeRecord(laptop, phone);
      return merged.box === laptop.box && merged.seen && merged.grade === "review" && merged.draft === "phone";
    },
  ],
  [
    "the later scheduled answer wins the schedule",
    () => {
      const early = applyGrade(unseenCard, "held", DAY, true, 24, AT(9));
      const late = applyGrade(early, "review", DAY, true, 24, AT(12));
      return mergeRecord(early, late).box === late.box && mergeRecord(late, early).box === late.box;
    },
  ],
  [
    "records from before the times fall back on the old rules, in either order",
    () => {
      const a: CardProgress = { ...unseenCard, draft: "short", grade: "held", box: 2, seen: true, due: DAY, reviewed: DAY };
      const b: CardProgress = { ...unseenCard, draft: "the longer one", grade: "review", box: 1, seen: true, due: DAY, reviewed: DAY };
      const ab = mergeRecord(a, b);
      return same(ab, mergeRecord(b, a)) && ab.draft === "the longer one" && ab.grade === "review" && ab.box === 1;
    },
  ],
  [
    "merging is idempotent and commutative",
    () => {
      const a = payload({
        progress: { "x:1": applyGrade(unseenCard, "held", DAY, true, 24, AT(9)) },
        decks: [deck("x", ["1"], "2026-09-01T00:00:00.000Z")],
      });
      const b = payload({
        progress: { "x:1": withDraft(unseenCard, "b", AT(11)), "y:2": withDraft(unseenCard, "y", AT(8)) },
        decks: [deck("x", ["1"], "2026-09-01T00:00:00.000Z"), deck("y", ["2"])],
      });
      const ab = mergePayloads(a, b);
      return same(ab, mergePayloads(b, a)) && same(ab, mergePayloads(ab, b)) && same(ab, mergePayloads(ab, ab));
    },
  ],
  [
    "a deleted deck goes from every device, with its progress",
    () => {
      const gone = "2026-09-19T12:00:00.000Z";
      const here = payload({
        decks: [deck("kafka", ["1"], "2026-09-01T00:00:00.000Z")],
        progress: { "kafka:1": withDraft(unseenCard, "old", AT(9)), "acid:1": withDraft(unseenCard, "kept", AT(9)) },
      });
      const there = payload({ deleted: { kafka: gone } });
      const merged = mergePayloads(here, there);
      return merged.decks.length === 0 && !merged.progress["kafka:1"] && !!merged.progress["acid:1"];
    },
  ],
  [
    "a deck imported again after its deletion comes back",
    () => {
      const merged = mergePayloads(
        payload({ decks: [deck("kafka", ["1"], "2026-09-19T13:00:00.000Z")] }),
        payload({ deleted: { kafka: "2026-09-19T12:00:00.000Z" } }),
      );
      return merged.decks.length === 1;
    },
  ],
  [
    "two different decks on one slug: the earlier keeps it, the other moves with its progress",
    () => {
      const mine = payload({
        decks: [deck("react", ["m1"], "2026-09-10T00:00:00.000Z")],
        progress: { "react:m1": withDraft(unseenCard, "mine", AT(9)) },
      });
      const theirs = payload({
        decks: [deck("react", ["t1"], "2026-09-05T00:00:00.000Z")],
        progress: { "react:t1": withDraft(unseenCard, "theirs", AT(9)) },
      });
      const here = mergePayloads(mine, theirs, ["react-2"]);
      const there = mergePayloads(theirs, mine, ["react-2"]);
      const moved = here.decks.find((d) => d.cards[0].id === "m1");
      return (
        same(here, there) &&
        here.decks.find((d) => d.slug === "react")?.cards[0].id === "t1" &&
        moved?.slug === "react-3" &&
        here.progress["react-3:m1"]?.draft === "mine" &&
        !here.progress["react:m1"]
      );
    },
  ],
  [
    "a payload from another device is read defensively",
    () => {
      const read = readPayload({
        version: 1,
        progress: { "x:1": { draft: 5, box: 2, seen: true } },
        decks: [{ slug: "../etc", name: "x" }, deck("ok", ["1"])],
        deleted: { a: "not a time" },
      });
      return read.decks.length === 1 && read.progress["x:1"].draft === "" && Object.keys(read.deleted).length === 0;
    },
  ],
  [
    "a key derives the same id and secret every time, and a different key does not",
    async () => {
      const one = await deriveKeys("  maple orbit ");
      const again = await deriveKeys("maple orbit");
      const other = await deriveKeys("Maple orbit");
      return one.id === again.id && one.secret === again.secret && one.id !== other.id && /^[0-9a-f]{64}$/.test(one.id);
    },
  ],
  [
    "what one key seals, only that key opens",
    async () => {
      const { secret } = await deriveKeys("maple orbit");
      const { secret: wrong } = await deriveKeys("maple orbits");
      const sealed = await encrypt("progress", secret);
      const opened = await decrypt(sealed, secret);
      const refused = await decrypt(sealed, wrong).then(
        () => false,
        () => true,
      );
      return opened === "progress" && refused && sealed !== (await encrypt("progress", secret));
    },
  ],
  [
    "a suggested key is an adjective, a noun and a verb, and long enough",
    () => {
      const keys = Array.from({ length: 200 }, suggestKey);
      return (
        keys.every((key) => /^[a-z]+ [a-z]+ [a-z]+ing$/.test(key) && normalizeKey(key).length >= 8) &&
        new Set(keys).size > 190
      );
    },
  ],
];

async function main() {
  let failed = 0;
  for (const [name, run] of cases) {
    let ok = false;
    try {
      ok = await run();
    } catch (error) {
      console.error(error);
    }
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  }
  if (failed) {
    console.error(`\n${failed} of ${cases.length} failed`);
    process.exit(1);
  }
  console.log(`\nall ${cases.length} passed`);
}

void main();
