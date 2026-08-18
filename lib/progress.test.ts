import type { Deck, StudyCard } from "./types";
import { cardKey, loadProgress } from "./progress";

// progress.ts reads window.localStorage lazily, so a stub set up here is enough.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
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
      const p = loadProgress("progress:d", cards);
      return (
        p.version === 2 &&
        p.drafts["d:aaa"] === "first" &&
        p.grades["d:bbb"] === "review"
      );
    },
  ],

  [
    "the migrated shape is written back",
    () => {
      store.clear();
      store.set("progress:d", JSON.stringify({ drafts: { "d:0": "x" }, grades: {} }));
      const cards = studyCards(deckOf("d", ["aaa"]));
      loadProgress("progress:d", cards);
      const raw = JSON.parse(store.get("progress:d")!);
      return raw.version === 2 && raw.drafts["d:aaa"] === "x";
    },
  ],

  [
    "migration is idempotent",
    () => {
      store.clear();
      store.set("progress:d", JSON.stringify({ drafts: { "d:0": "x" }, grades: {} }));
      const cards = studyCards(deckOf("d", ["aaa"]));
      const once = JSON.stringify(loadProgress("progress:d", cards));
      const twice = JSON.stringify(loadProgress("progress:d", cards));
      const thrice = JSON.stringify(loadProgress("progress:d", cards));
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
      loadProgress("progress:d", before);

      // Now insert a new card at position 1, as editing a deck file would.
      const after = studyCards(deckOf("d", ["aaa", "xxx", "bbb", "ccc"]));
      const p = loadProgress("progress:d", after);

      return (
        p.grades["d:aaa"] === "held" &&
        p.grades["d:bbb"] === "review" &&
        p.grades["d:ccc"] === "held" &&
        p.grades["d:xxx"] === undefined
      );
    },
  ],

  [
    "keys that no longer match a card are dropped",
    () => {
      store.clear();
      store.set(
        "progress:d",
        JSON.stringify({ drafts: {}, grades: { "d:0": "held", "d:9": "review" } }),
      );
      const cards = studyCards(deckOf("d", ["aaa"]));
      const p = loadProgress("progress:d", cards);
      return Object.keys(p.grades).length === 1 && p.grades["d:aaa"] === "held";
    },
  ],

  [
    "keys stay per-deck when studying everything",
    () => {
      store.clear();
      store.set(
        "progress:all",
        JSON.stringify({ drafts: {}, grades: { "one:0": "held", "two:0": "review" } }),
      );
      const cards = [
        ...studyCards(deckOf("one", ["a1"])),
        ...studyCards(deckOf("two", ["b1"])),
      ];
      const p = loadProgress("progress:all", cards);
      return p.grades["one:a1"] === "held" && p.grades["two:b1"] === "review";
    },
  ],

  [
    "an already-migrated store is returned untouched",
    () => {
      store.clear();
      store.set(
        "progress:d",
        JSON.stringify({ version: 2, drafts: { "d:aaa": "kept" }, grades: {} }),
      );
      const cards = studyCards(deckOf("d", ["aaa"]));
      const p = loadProgress("progress:d", cards);
      return p.drafts["d:aaa"] === "kept";
    },
  ],

  [
    "a corrupt store starts fresh rather than throwing",
    () => {
      store.clear();
      store.set("progress:d", "{not json");
      const cards = studyCards(deckOf("d", ["aaa"]));
      const p = loadProgress("progress:d", cards);
      return Object.keys(p.drafts).length === 0 && Object.keys(p.grades).length === 0;
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
