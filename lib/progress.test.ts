import type { Deck, StudyCard } from "./types";
import { PROGRESS_KEY, cardKey, forgetDeck, loadProgress } from "./progress";

// progress.ts reads window.localStorage lazily, so a stub set up here is enough.
// It needs `length` and `key()` as well as the accessors: one store now, so a
// read has to find the old per-route keys rather than being told where to look.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  },
};

function deckOf(slug: string, ids: string[]): Deck {
  return {
    slug,
    name: slug,
    blurb: "",
    tint: "#000000",
    ink: "#000000",
    cards: ids.map((id) => ({ id, q: `q-${id}`, a: `a-${id}` })),
  };
}

function studyCards(deck: Deck): StudyCard[] {
  return deck.cards.map((card, index) => ({ ...card, deck, index }));
}

function stored() {
  return JSON.parse(store.get(PROGRESS_KEY) ?? "null");
}

const cases: Array<[string, () => boolean]> = [
  [
    "v1 index keys migrate onto card ids",
    () => {
      store.clear();
      store.set(
        "progress:d",
        JSON.stringify({
          drafts: { "d:0": "first", "d:1": "second" },
          grades: { "d:0": "held", "d:1": "review" },
        }),
      );
      const cards = studyCards(deckOf("d", ["aaa", "bbb"]));
      const p = loadProgress(cards);
      return (
        p.version === 3 &&
        p.drafts["d:aaa"] === "first" &&
        p.grades["d:bbb"] === "review"
      );
    },
  ],

  [
    "the migrated shape is written back, and the legacy key is gone",
    () => {
      store.clear();
      store.set("progress:d", JSON.stringify({ drafts: { "d:0": "x" }, grades: {} }));
      loadProgress(studyCards(deckOf("d", ["aaa"])));
      return (
        stored().version === 3 &&
        stored().drafts["d:aaa"] === "x" &&
        !store.has("progress:d")
      );
    },
  ],

  [
    "migration is idempotent",
    () => {
      store.clear();
      store.set("progress:d", JSON.stringify({ drafts: { "d:0": "x" }, grades: {} }));
      const cards = studyCards(deckOf("d", ["aaa"]));
      const once = JSON.stringify(loadProgress(cards));
      const twice = JSON.stringify(loadProgress(cards));
      const thrice = JSON.stringify(loadProgress(cards));
      return once === twice && twice === thrice;
    },
  ],

  [
    "a card inserted mid-deck leaves later grades intact",
    () => {
      store.clear();
      // Study a three-card deck under the old index keys, then migrate.
      store.set(
        "progress:d",
        JSON.stringify({
          drafts: {},
          grades: { "d:0": "held", "d:1": "review", "d:2": "held" },
        }),
      );
      const before = studyCards(deckOf("d", ["aaa", "bbb", "ccc"]));
      loadProgress(before);

      // Now insert a new card at position 1, as editing a deck file would.
      const after = studyCards(deckOf("d", ["aaa", "xxx", "bbb", "ccc"]));
      const p = loadProgress(after);

      return (
        p.grades["d:aaa"] === "held" &&
        p.grades["d:bbb"] === "review" &&
        p.grades["d:ccc"] === "held" &&
        p.grades["d:xxx"] === undefined
      );
    },
  ],

  [
    "v1 keys that no longer match a card of a deck we hold are dropped",
    () => {
      store.clear();
      store.set(
        "progress:d",
        JSON.stringify({ drafts: {}, grades: { "d:0": "held", "d:9": "review" } }),
      );
      const p = loadProgress(studyCards(deckOf("d", ["aaa"])));
      return Object.keys(p.grades).length === 1 && p.grades["d:aaa"] === "held";
    },
  ],

  [
    "the two stores for one card become one record",
    () => {
      store.clear();
      // The same card, studied on /study/d and again on /study/all.
      store.set(
        "progress:d",
        JSON.stringify({ version: 2, drafts: { "d:aaa": "on the deck" }, grades: {} }),
      );
      store.set(
        "progress:all",
        JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": "held" } }),
      );
      const p = loadProgress(studyCards(deckOf("d", ["aaa"])));
      return (
        p.drafts["d:aaa"] === "on the deck" &&
        p.grades["d:aaa"] === "held" &&
        !store.has("progress:d") &&
        !store.has("progress:all")
      );
    },
  ],

  [
    "review beats held when two stores disagree",
    () => {
      store.clear();
      store.set(
        "progress:all",
        JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": "review" } }),
      );
      store.set(
        "progress:d",
        JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": "held" } }),
      );
      const held = loadProgress(studyCards(deckOf("d", ["aaa"]))).grades["d:aaa"];

      // The other way round in storage order, to show the merge does not
      // depend on which key was read first.
      store.clear();
      store.set(
        "progress:all",
        JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": "held" } }),
      );
      store.set(
        "progress:d",
        JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": "review" } }),
      );
      const review = loadProgress(studyCards(deckOf("d", ["aaa"]))).grades["d:aaa"];

      return held === "review" && review === "review";
    },
  ],

  [
    "the longer draft wins, whichever store it was in",
    () => {
      store.clear();
      store.set(
        "progress:all",
        JSON.stringify({ version: 2, drafts: { "d:aaa": "a fuller answer" }, grades: {} }),
      );
      store.set(
        "progress:d",
        JSON.stringify({ version: 2, drafts: { "d:aaa": "short" }, grades: {} }),
      );
      return loadProgress(studyCards(deckOf("d", ["aaa"]))).drafts["d:aaa"] ===
        "a fuller answer";
    },
  ],

  [
    "v1 entries for a deck this route cannot see are left for a later one",
    () => {
      store.clear();
      store.set(
        "progress:all",
        JSON.stringify({
          drafts: {},
          grades: { "one:0": "held", "two:0": "review" },
        }),
      );

      // Studying only deck one. Its entry migrates; deck two's has no cards to
      // rewrite against and stays where it is rather than being thrown away.
      const first = loadProgress(studyCards(deckOf("one", ["a1"])));
      const parked = JSON.parse(store.get("progress:all")!);
      const parkedRight =
        first.grades["one:a1"] === "held" &&
        first.grades["two:b1"] === undefined &&
        parked.grades["two:0"] === "review" &&
        parked.grades["one:0"] === undefined;

      // Later, on a route that can see both decks.
      const second = loadProgress([
        ...studyCards(deckOf("one", ["a1"])),
        ...studyCards(deckOf("two", ["b1"])),
      ]);
      return (
        parkedRight &&
        second.grades["one:a1"] === "held" &&
        second.grades["two:b1"] === "review" &&
        !store.has("progress:all")
      );
    },
  ],

  [
    "a grade changed after a partial migration is not overwritten by the leftovers",
    () => {
      store.clear();
      store.set(
        "progress:all",
        JSON.stringify({
          drafts: {},
          grades: { "one:0": "review", "two:0": "review" },
        }),
      );
      const one = studyCards(deckOf("one", ["a1"]));
      loadProgress(one);

      // The reader studies the card again and now holds it.
      const after = loadProgress(one);
      after.grades["one:a1"] = "held";
      store.set(PROGRESS_KEY, JSON.stringify(after));

      // Deck two's entry is still parked, so this read touches the legacy key
      // again. It must not resurrect the old review grade for deck one.
      const p = loadProgress([...one, ...studyCards(deckOf("two", ["b1"]))]);
      return p.grades["one:a1"] === "held" && p.grades["two:b1"] === "review";
    },
  ],

  [
    "an already-migrated store is returned untouched and not rewritten",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({ version: 3, drafts: { "d:aaa": "kept" }, grades: {} }),
      );
      const before = store.get(PROGRESS_KEY);
      const p = loadProgress(studyCards(deckOf("d", ["aaa"])));
      return p.drafts["d:aaa"] === "kept" && store.get(PROGRESS_KEY) === before;
    },
  ],

  [
    "a corrupt store starts fresh rather than throwing",
    () => {
      store.clear();
      store.set(PROGRESS_KEY, "{not json");
      const p = loadProgress(studyCards(deckOf("d", ["aaa"])));
      return Object.keys(p.drafts).length === 0 && Object.keys(p.grades).length === 0;
    },
  ],

  [
    "forgetting a deck drops a prefix, not a key",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({
          version: 3,
          drafts: { "mine:aaa": "gone", "yours:bbb": "kept" },
          grades: { "mine:aaa": "held", "yours:bbb": "review" },
        }),
      );
      store.set("progress:mine", JSON.stringify({ drafts: { "mine:0": "x" }, grades: {} }));

      forgetDeck("mine");
      const left = stored();
      return (
        left.drafts["mine:aaa"] === undefined &&
        left.grades["mine:aaa"] === undefined &&
        left.drafts["yours:bbb"] === "kept" &&
        left.grades["yours:bbb"] === "review" &&
        !store.has("progress:mine")
      );
    },
  ],

  [
    "forgetting one deck does not touch a deck whose slug it prefixes",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({
          version: 3,
          drafts: { "react:aaa": "gone", "react-19:bbb": "kept" },
          grades: {},
        }),
      );
      forgetDeck("react");
      const left = stored();
      return (
        left.drafts["react:aaa"] === undefined && left.drafts["react-19:bbb"] === "kept"
      );
    },
  ],

  [
    "cardKey uses the id, not the position",
    () => {
      const [card] = studyCards(deckOf("d", ["aaa"]));
      return cardKey(card) === "d:aaa";
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
console.log(failed === 0 ? "\nall progress cases pass" : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
