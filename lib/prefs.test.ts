/*
 * What a stored `prefs:index` reads back as. The part worth testing is the
 * version 4 rule for `scheduled`: the default flipped to on, and a version 3
 * store's `false` cannot be trusted as a choice because saving any preference
 * wrote it.
 */
import { DEFAULT_PREFS, PREFS_KEY, loadPrefs, savePrefs } from "./prefs";
import { REVIEWER_PREFS_KEY, loadReviewerPrefs, saveReviewerPrefs } from "./reviewerPrefs";

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

  [
    "the color key has not been shown on a first visit",
    () => {
      store.clear();
      return loadReviewerPrefs().colorKeyShown === false;
    },
  ],

  [
    "once shown, the color key stays shown, in its own key",
    () => {
      store.clear();
      saveReviewerPrefs({ colorKeyShown: true });
      return loadReviewerPrefs().colorKeyShown === true && !store.has(PREFS_KEY);
    },
  ],

  [
    "only a stored true counts as the color key shown",
    () => {
      store.clear();
      store.set(REVIEWER_PREFS_KEY, JSON.stringify({ version: 1, colorKeyShown: "yes" }));
      const mangled = loadReviewerPrefs().colorKeyShown;
      store.set(REVIEWER_PREFS_KEY, "{not json");
      return mangled === false && loadReviewerPrefs().colorKeyShown === false;
    },
  ],

  [
    "the first interval is a day until it is set, and only a value on the list is kept",
    () => {
      store.clear();
      const first = loadReviewerPrefs().firstInterval;
      store.set(REVIEWER_PREFS_KEY, JSON.stringify({ version: 1, colorKeyShown: true, firstInterval: 5 }));
      const offList = loadReviewerPrefs().firstInterval;
      store.set(REVIEWER_PREFS_KEY, JSON.stringify({ version: 1, colorKeyShown: true, firstInterval: 4 }));
      return first === 24 && offList === 24 && loadReviewerPrefs().firstInterval === 4;
    },
  ],

  [
    "marking the color key shown keeps the interval, and setting the interval keeps the key",
    () => {
      store.clear();
      saveReviewerPrefs({ firstInterval: 2 });
      saveReviewerPrefs({ colorKeyShown: true });
      const both = loadReviewerPrefs();
      saveReviewerPrefs({ firstInterval: 8 });
      const after = loadReviewerPrefs();
      return both.firstInterval === 2 && both.colorKeyShown && after.firstInterval === 8 && after.colorKeyShown;
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
