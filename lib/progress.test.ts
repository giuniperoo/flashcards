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

// The day every case is read on, so a due date can be asserted exactly.
const TODAY = "2026-09-09";
const TOMORROW = "2026-09-10";

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

function read(cards: StudyCard[]) {
  return loadProgress(cards, TODAY);
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
      const p = read(studyCards(deckOf("d", ["aaa", "bbb"])));
      return (
        p.version === 4 &&
        p.cards["d:aaa"].draft === "first" &&
        p.cards["d:bbb"].draft === "second" &&
        p.cards["d:bbb"].box === 1
      );
    },
  ],

  [
    "a v3 store becomes records: held to box 2 tomorrow, review to box 1 today",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({
          version: 3,
          drafts: { "d:aaa": "kept", "d:ccc": "written but never graded" },
          grades: { "d:aaa": "held", "d:bbb": "review" },
        }),
      );
      const p = read(studyCards(deckOf("d", ["aaa", "bbb", "ccc"])));

      const held = p.cards["d:aaa"];
      const review = p.cards["d:bbb"];
      const unseen = p.cards["d:ccc"];

      return (
        held.seen &&
        held.box === 2 &&
        held.due === TOMORROW &&
        held.draft === "kept" &&
        review.seen &&
        review.box === 1 &&
        review.due === TODAY &&
        !unseen.seen &&
        unseen.due === "" &&
        unseen.draft === "written but never graded"
      );
    },
  ],

  [
    "the migration invents no review date, because the old store never had one",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({ version: 3, drafts: {}, grades: { "d:aaa": "held" } }),
      );
      return read(studyCards(deckOf("d", ["aaa"]))).cards["d:aaa"].reviewed === "";
    },
  ],

  [
    "no card is lost on the way from v3 to v4",
    () => {
      store.clear();
      const ids = ["aaa", "bbb", "ccc", "ddd", "eee"];
      store.set(
        PROGRESS_KEY,
        JSON.stringify({
          version: 3,
          drafts: Object.fromEntries(ids.map((id) => [`d:${id}`, `draft ${id}`])),
          grades: { "d:aaa": "held", "d:ccc": "review", "d:eee": "held" },
        }),
      );
      const p = read(studyCards(deckOf("d", ids)));
      return (
        Object.keys(p.cards).length === ids.length &&
        ids.every((id) => p.cards[`d:${id}`].draft === `draft ${id}`)
      );
    },
  ],

  [
    "the migrated shape is written back, and the legacy key is gone",
    () => {
      store.clear();
      store.set("progress:d", JSON.stringify({ drafts: { "d:0": "x" }, grades: {} }));
      read(studyCards(deckOf("d", ["aaa"])));
      return (
        stored().version === 4 &&
        stored().cards["d:aaa"].draft === "x" &&
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
      const once = JSON.stringify(read(cards));
      const twice = JSON.stringify(read(cards));
      const thrice = JSON.stringify(read(cards));
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
      read(before);

      // Now insert a new card at position 1, as editing a deck file would.
      const after = studyCards(deckOf("d", ["aaa", "xxx", "bbb", "ccc"]));
      const p = read(after);

      return (
        p.cards["d:aaa"].box === 2 &&
        p.cards["d:bbb"].box === 1 &&
        p.cards["d:ccc"].box === 2 &&
        p.cards["d:xxx"] === undefined
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
      const p = read(studyCards(deckOf("d", ["aaa"])));
      return Object.keys(p.cards).length === 1 && p.cards["d:aaa"].box === 2;
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
      const p = read(studyCards(deckOf("d", ["aaa"])));
      return (
        p.cards["d:aaa"].draft === "on the deck" &&
        p.cards["d:aaa"].box === 2 &&
        !store.has("progress:d") &&
        !store.has("progress:all")
      );
    },
  ],

  [
    "review beats held when two stores disagree",
    () => {
      const boxAfter = (all: string, deck: string) => {
        store.clear();
        store.set(
          "progress:all",
          JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": all } }),
        );
        store.set(
          "progress:d",
          JSON.stringify({ version: 2, drafts: {}, grades: { "d:aaa": deck } }),
        );
        return read(studyCards(deckOf("d", ["aaa"]))).cards["d:aaa"].box;
      };
      // Either way round in storage order: the merge does not depend on which
      // key was read first, and review lands the card in box 1.
      return boxAfter("review", "held") === 1 && boxAfter("held", "review") === 1;
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
      return (
        read(studyCards(deckOf("d", ["aaa"]))).cards["d:aaa"].draft === "a fuller answer"
      );
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
      const first = read(studyCards(deckOf("one", ["a1"])));
      const parked = JSON.parse(store.get("progress:all")!);
      const parkedRight =
        first.cards["one:a1"].box === 2 &&
        first.cards["two:b1"] === undefined &&
        parked.grades["two:0"] === "review" &&
        parked.grades["one:0"] === undefined;

      // Later, on a route that can see both decks.
      const second = read([
        ...studyCards(deckOf("one", ["a1"])),
        ...studyCards(deckOf("two", ["b1"])),
      ]);
      return (
        parkedRight &&
        second.cards["one:a1"].box === 2 &&
        second.cards["two:b1"].box === 1 &&
        !store.has("progress:all")
      );
    },
  ],

  [
    "a scheduled record is not overwritten by the leftovers of a partial migration",
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
      read(one);

      // The reader studies the card again and works it up to box 4.
      const after = read(one);
      after.cards["one:a1"] = {
        draft: "",
        box: 4,
        due: "2026-09-17",
        reviewed: TODAY,
        seen: true,
      };
      store.set(PROGRESS_KEY, JSON.stringify(after));

      // Deck two's entry is still parked, so this read touches the legacy key
      // again. It must not drag deck one back to box 1.
      const p = read([...one, ...studyCards(deckOf("two", ["b1"]))]);
      return (
        p.cards["one:a1"].box === 4 &&
        p.cards["one:a1"].due === "2026-09-17" &&
        p.cards["two:b1"].box === 1
      );
    },
  ],

  [
    "an already-migrated store is returned untouched and not rewritten",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({
          version: 4,
          cards: {
            "d:aaa": {
              draft: "kept",
              box: 3,
              due: "2026-09-13",
              reviewed: "2026-09-09",
              seen: true,
            },
          },
        }),
      );
      const before = store.get(PROGRESS_KEY);
      const p = read(studyCards(deckOf("d", ["aaa"])));
      return (
        p.cards["d:aaa"].draft === "kept" &&
        p.cards["d:aaa"].box === 3 &&
        store.get(PROGRESS_KEY) === before
      );
    },
  ],

  [
    "a corrupt store starts fresh rather than throwing",
    () => {
      store.clear();
      store.set(PROGRESS_KEY, "{not json");
      const p = read(studyCards(deckOf("d", ["aaa"])));
      return Object.keys(p.cards).length === 0;
    },
  ],

  [
    "forgetting a deck drops a prefix, not a key",
    () => {
      store.clear();
      store.set(
        PROGRESS_KEY,
        JSON.stringify({
          version: 4,
          cards: {
            "mine:aaa": { draft: "gone", box: 2, due: TOMORROW, reviewed: "", seen: true },
            "yours:bbb": { draft: "kept", box: 1, due: TODAY, reviewed: "", seen: true },
          },
        }),
      );
      store.set("progress:mine", JSON.stringify({ drafts: { "mine:0": "x" }, grades: {} }));

      forgetDeck("mine");
      const left = stored();
      return (
        left.cards["mine:aaa"] === undefined &&
        left.cards["yours:bbb"].draft === "kept" &&
        !store.has("progress:mine")
      );
    },
  ],

  [
    "forgetting a deck before the store has been migrated keeps the other decks",
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
      forgetDeck("mine");
      const left = stored();
      return (
        left.version === 3 &&
        left.drafts["mine:aaa"] === undefined &&
        left.grades["mine:aaa"] === undefined &&
        left.drafts["yours:bbb"] === "kept" &&
        left.grades["yours:bbb"] === "review"
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
          version: 4,
          cards: {
            "react:aaa": { draft: "gone", box: 1, due: TODAY, reviewed: "", seen: true },
            "react-19:bbb": { draft: "kept", box: 1, due: TODAY, reviewed: "", seen: true },
          },
        }),
      );
      forgetDeck("react");
      const left = stored();
      return (
        left.cards["react:aaa"] === undefined &&
        left.cards["react-19:bbb"].draft === "kept"
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
