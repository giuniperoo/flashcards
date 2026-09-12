import { buildQueue } from "./queue";
import type { CardProgress } from "./progress";
import type { Deck, StudyCard } from "./types";

const TODAY = "2026-09-10";

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

/** A deck of `n` cards named c0, c1, c2… */
function deckOfSize(n: number, slug = "d") {
  return studyCards(deckOf(slug, Array.from({ length: n }, (_, i) => `c${i}`)));
}

function seen(due: string, box = 2): CardProgress {
  return { draft: "", box, misses: 0, due, reviewed: "", seen: true };
}

const unseenWithDraft: CardProgress = {
  draft: "typed but never graded",
  box: 1,
  misses: 0,
  due: "",
  reviewed: "",
  seen: false,
};

/** Deterministic stand-in for the shuffle, so an exact order can be asserted. */
const reverse = <T,>(items: T[]) => [...items].reverse();

function ids(cards: StudyCard[]) {
  return cards.map((card) => card.id).join(",");
}

function inOrder(n: number) {
  return Array.from({ length: n }, (_, i) => `c${i}`).join(",");
}

const cases: Array<[string, () => boolean]> = [
  [
    "a backlog comes back oldest day first, with today last",
    () => {
      const queue = buildQueue(
        deckOfSize(4),
        {
          "d:c0": seen(TODAY),
          "d:c1": seen("2026-08-01"),
          "d:c2": seen("2026-09-09"),
          "d:c3": seen("2026-07-15"),
        },
        TODAY,
        reverse,
      );
      return ids(queue) === "c3,c1,c2,c0";
    },
  ],

  [
    "cards sharing a due day are shuffled among themselves, and only there",
    () => {
      const queue = buildQueue(
        deckOfSize(6),
        {
          "d:c0": seen("2026-09-08"),
          "d:c1": seen("2026-09-08"),
          "d:c2": seen("2026-09-08"),
          "d:c3": seen(TODAY),
          "d:c4": seen(TODAY),
          "d:c5": seen(TODAY),
        },
        TODAY,
        reverse,
      );
      // The older day still leads; the members within each day are reversed.
      return ids(queue) === "c2,c1,c0,c5,c4,c3";
    },
  ],

  [
    "a day with nothing due deals new cards alone",
    () => {
      const queue = buildQueue(
        deckOfSize(5),
        { "d:c0": seen("2026-09-20"), "d:c1": seen("2026-12-01") },
        TODAY,
        reverse,
      );
      return ids(queue) === "c2,c3,c4";
    },
  ],

  [
    "a day with nothing due and nothing new is an empty queue",
    () => {
      const queue = buildQueue(
        deckOfSize(2),
        { "d:c0": seen("2026-09-20"), "d:c1": seen("2026-12-01") },
        TODAY,
        reverse,
      );
      return queue.length === 0;
    },
  ],

  [
    "a deck where every card is unseen deals all of it, in deck order",
    () => {
      const queue = buildQueue(deckOfSize(40), {}, TODAY, reverse);
      return queue.length === 40 && ids(queue) === inOrder(40);
    },
  ],

  [
    "nothing is held back: a backlog and the new cards both come whole",
    () => {
      const records: Record<string, CardProgress> = {};
      // Forty cards owed across several past days, thirty never seen.
      for (let i = 0; i < 40; i++) {
        records[`d:c${i}`] = seen(`2026-08-${String((i % 28) + 1).padStart(2, "0")}`);
      }
      const queue = buildQueue(deckOfSize(70), records, TODAY, reverse);
      return queue.length === 70;
    },
  ],

  [
    "cards that are neither due nor new are absent",
    () => {
      const queue = buildQueue(
        deckOfSize(3),
        {
          "d:c0": seen("2026-09-01"),
          "d:c1": seen("2026-09-30"),
          "d:c2": seen("2026-10-15"),
        },
        TODAY,
        reverse,
      );
      return ids(queue) === "c0";
    },
  ],

  [
    "a draft with no grade is a new card, not a due one",
    () => {
      const queue = buildQueue(
        deckOfSize(2),
        { "d:c0": unseenWithDraft, "d:c1": seen("2026-09-01") },
        TODAY,
        reverse,
      );
      // The due card leads; the drafted card follows as a first meeting.
      return ids(queue) === "c1,c0";
    },
  ],

  [
    "a record for a card no longer in the deck is ignored",
    () => {
      const queue = buildQueue(
        deckOfSize(1),
        { "d:c0": seen("2026-09-01"), "d:gone": seen("2026-07-01") },
        TODAY,
        reverse,
      );
      return ids(queue) === "c0";
    },
  ],

  [
    "an empty deck is an empty queue",
    () => buildQueue([], {}, TODAY).length === 0,
  ],

  [
    "decks interleave rather than sorting by deck",
    () => {
      const cards = [...deckOfSize(2, "one"), ...deckOfSize(2, "two")];
      const queue = buildQueue(
        cards,
        {
          "one:c0": seen("2026-09-08"),
          "one:c1": seen(TODAY),
          "two:c0": seen("2026-09-08"),
          "two:c1": seen(TODAY),
        },
        TODAY,
        (items) => items,
      );
      return queue.map((card) => card.deck.slug).join(",") === "one,two,one,two";
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
console.log(failed === 0 ? "\nall queue cases pass" : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
