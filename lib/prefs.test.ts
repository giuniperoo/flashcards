/*
 * What a stored `prefs:index` reads back as. The part worth testing is the
 * version 4 rule for `scheduled`: the default flipped to on, and a version 3
 * store's `false` cannot be trusted as a choice because saving any preference
 * wrote it.
 */
import { DEFAULT_PREFS, PREFS_KEY, loadPrefs, savePrefs } from "./prefs";

const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  dispatchEvent: () => true,
};

function stored(value: unknown) {
  store.clear();
  store.set(PREFS_KEY, JSON.stringify(value));
  return loadPrefs();
}

const cases: Array<[string, () => boolean]> = [
  [
    "a first visit is on a schedule",
    () => {
      store.clear();
      return loadPrefs().scheduled === true && DEFAULT_PREFS.scheduled === true;
    },
  ],

  [
    "a version 3 false is not a choice, so it takes the new default",
    () => stored({ version: 3, showBuiltIns: true, hiddenDecks: [], scheduled: false }).scheduled === true,
  ],

  [
    "a version 3 true stays on",
    () => stored({ version: 3, showBuiltIns: true, hiddenDecks: [], scheduled: true }).scheduled === true,
  ],

  [
    "versions 1 and 2 never had the field, and read as on",
    () =>
      stored({ showBuiltIns: true }).scheduled === true &&
      stored({ version: 2, showBuiltIns: true, hiddenDecks: ["kafka"] }).scheduled === true,
  ],

  [
    "a version 4 false is a choice, and free study is kept",
    () => stored({ version: 4, showBuiltIns: false, hiddenDecks: [], scheduled: false }).scheduled === false,
  ],

  [
    "a mangled value in version 4 falls back to the default",
    () =>
      stored({ version: 4, scheduled: "no" }).scheduled === true &&
      stored({ version: 4 }).scheduled === true,
  ],

  [
    "choosing free study survives a save and a read",
    () => {
      store.clear();
      savePrefs({ ...DEFAULT_PREFS, scheduled: false });
      const again = loadPrefs();
      return again.scheduled === false && JSON.parse(store.get(PREFS_KEY)!).version === 4;
    },
  ],

  [
    "the other preferences read as before",
    () => {
      const p = stored({ version: 3, showBuiltIns: true, hiddenDecks: ["kafka", 3], scheduled: false });
      return p.showBuiltIns === true && p.hiddenDecks.length === 1 && p.hiddenDecks[0] === "kafka";
    },
  ],

  [
    "unreadable storage is a first visit",
    () => {
      store.clear();
      store.set(PREFS_KEY, "{not json");
      const p = loadPrefs();
      return p.scheduled === true && p.showBuiltIns === false;
    },
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
console.log(failed === 0 ? "\nall prefs cases pass" : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
