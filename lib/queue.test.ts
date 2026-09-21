import { afterAnswer, breakdown, buildDueQueue, buildQueue, dueByDeck } from "./queue";
import { cardKey, type CardProgress } from "./progress";
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
  return { draft: "", grade: "held", box, misses: 0, due, reviewed: "", seen: true };
}

const unseenWithDraft: CardProgress = {
  draft: "typed but never graded",
  grade: "",
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
    "the breakdown of a deck just opened adds up to the deck",
    () => {
      const cards = deckOfSize(8);
      const records = {
        "d:c0": seen("2026-09-08"),
        "d:c1": seen("2026-09-09"),
        "d:c2": seen(TODAY),
        "d:c3": seen("2026-09-12"),
        "d:c4": seen("2026-09-14"),
      };
      const dealt = buildQueue(cards, records, TODAY, (items) => items);
      const b = breakdown(cards, dealt, dealt, records, TODAY);
      return (
        b.done === 0 &&
        b.overdue === 2 &&
        b.today === 1 &&
        b.fresh === 3 &&
        b.notDue === 2 &&
        b.again === 0 &&
        b.done + b.overdue + b.today + b.fresh + b.again + b.notDue === cards.length
      );
    },
  ],

  [
    "graded cards move into done, and nothing else shifts",
    () => {
      const cards = deckOfSize(6);
      const records = {
        "d:c0": seen("2026-09-08"),
        "d:c1": seen(TODAY),
        "d:c5": seen("2026-09-20"),
      };
      const dealt = buildQueue(cards, records, TODAY, (items) => items);
      // Grade the first two dealt: the overdue card and the one due today.
      const remaining = dealt.slice(2);
      const b = breakdown(cards, dealt, remaining, records, TODAY);
      return b.done === 2 && b.overdue === 0 && b.today === 0 && b.fresh === 3 && b.notDue === 1;
    },
  ],

  [
    "a finished session is all done and not due",
    () => {
      const cards = deckOfSize(4);
      const records = { "d:c0": seen(TODAY), "d:c1": seen("2026-09-30") };
      const dealt = buildQueue(cards, records, TODAY, (items) => items);
      const b = breakdown(cards, dealt, [], records, TODAY);
      return b.done === 3 && b.overdue + b.today + b.fresh === 0 && b.notDue === 1;
    },
  ],

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
  [
    "each deck's due count is the due part of the queue it opens with",
    () => {
      const one = deckOfSize(5, "one");
      const two = deckOfSize(4, "two");
      const records: Record<string, CardProgress> = {
        "one:c0": seen("2026-09-01"),
        "one:c1": seen(TODAY),
        "one:c2": seen("2026-09-11"),
        "one:c3": unseenWithDraft,
        "two:c0": seen("2026-09-09"),
        "two:c1": seen("2026-09-12"),
      };
      const due = dueByDeck(records, TODAY);
      // The queue deals due cards and then new ones; the due ones are those seen.
      const owed = (cards: StudyCard[]) =>
        buildQueue(cards, records, TODAY).filter((card) => records[cardKey(card)]?.seen).length;
      return due.one === owed(one) && due.one === 2 && due.two === owed(two) && due.two === 1;
    },
  ],
  [
    "the cross-deck queue deals the due cards interleaved, and no new ones",
    () => {
      const cards = [...deckOfSize(3, "one"), ...deckOfSize(3, "two")];
      const records: Record<string, CardProgress> = {
        "one:c0": seen("2026-09-08"),
        "one:c1": seen(TODAY),
        "two:c0": seen("2026-09-08"),
        "two:c1": seen(TODAY),
        "two:c2": unseenWithDraft,
        // one:c2 has no record at all: new too.
      };
      const queue = buildDueQueue(cards, records, TODAY, (items) => items);
      return (
        ids(queue) === "c0,c0,c1,c1" &&
        queue.map((card) => card.deck.slug).join(",") === "one,two,one,two" &&
        queue.length === Object.values(dueByDeck(records, TODAY)).reduce((a, b) => a + b, 0)
      );
    },
  ],
  [
    "the cross-deck queue is empty when every card is new",
    () => buildDueQueue(deckOfSize(4), { "d:c0": unseenWithDraft }, TODAY).length === 0,
  ],
  [
    "the deck queue is the cross-deck queue followed by the new cards",
    () => {
      const cards = deckOfSize(4);
      const records = { "d:c3": seen("2026-09-01"), "d:c1": seen(TODAY) };
      const keep = <T,>(items: T[]) => items;
      return (
        ids(buildQueue(cards, records, TODAY, keep)) ===
        ids([...buildDueQueue(cards, records, TODAY, keep), cards[0], cards[2]])
      );
    },
  ],
  [
    "new cards are not counted as due, so a deck nobody has started has no count",
    () => {
      const due = dueByDeck({ "d:c0": unseenWithDraft }, TODAY);
      return due.d === undefined && Object.keys(due).length === 0;
    },
  ],
  [
    "a deck with nothing due today has no count, not a zero",
    () => {
      const due = dueByDeck({ "d:c0": seen("2026-09-11"), "d:c1": seen("2026-09-14") }, TODAY);
      return !("d" in due);
    },
  ],

  [
    "a card with a time is dealt only once its time has passed when the session opens",
    () => {
      const cards = deckOfSize(2);
      const records: Record<string, CardProgress> = {
        "d:c0": { ...seen(TODAY, 1), dueAt: new Date(2026, 8, 10, 18, 0).toISOString() },
        "d:c1": seen(TODAY),
      };
      const early = buildDueQueue(cards, records, TODAY, (items) => items, new Date(2026, 8, 10, 17, 0).getTime());
      const late = buildDueQueue(cards, records, TODAY, (items) => items, new Date(2026, 8, 10, 18, 30).getTime());
      return ids(early) === "c1" && ids(late) === "c0,c1";
    },
  ],

  [
    "cards with times still group by their day, so the shuffle runs across them",
    () => {
      const cards = deckOfSize(3);
      const records: Record<string, CardProgress> = {
        "d:c0": { ...seen(TODAY, 1), dueAt: new Date(2026, 8, 10, 9, 0).toISOString() },
        "d:c1": { ...seen(TODAY, 1), dueAt: new Date(2026, 8, 10, 11, 0).toISOString() },
        "d:c2": seen(TODAY),
      };
      const groups: string[][] = [];
      buildDueQueue(cards, records, TODAY, <T,>(items: T[]) => { groups.push((items as StudyCard[]).map((c) => c.id)); return items; }, new Date(2026, 8, 10, 12, 0).getTime());
      return groups.length === 1 && groups[0].join(",") === "c0,c1,c2";
    },
  ],

  [
    "a due count leaves out a card whose time has not come",
    () => {
      const records: Record<string, CardProgress> = {
        "d:c0": { ...seen(TODAY, 1), dueAt: new Date(2026, 8, 10, 18, 0).toISOString() },
        "d:c1": seen(TODAY),
      };
      return (
        dueByDeck(records, TODAY, new Date(2026, 8, 10, 17, 0).getTime()).d === 1 &&
        dueByDeck(records, TODAY, new Date(2026, 8, 10, 18, 0).getTime()).d === 2
      );
    },
  ],
  [
    "a card answered wrong counts as again, not by its new due day",
    () => {
      const cards = deckOfSize(4);
      const dealt = buildQueue(cards, {}, TODAY, (items) => items);
      // c0 answered right, c1 answered wrong: box 1, due tomorrow, and still here.
      const records = { "d:c0": seen("2026-09-12", 2), "d:c1": seen("2026-09-11", 1) };
      const remaining = [dealt[2], dealt[3], dealt[1]];
      const b = breakdown(cards, dealt, remaining, records, TODAY, new Set(["d:c1"]));
      return (
        b.done === 1 && b.again === 1 && b.fresh === 2 && b.today === 0 && b.notDue === 0 &&
        b.done + b.overdue + b.today + b.fresh + b.again + b.notDue === cards.length
      );
    },
  ],

  [
    "a right answer takes the card out, and the next one falls into its place",
    () => {
      const next = afterAnswer(["a", "b", "c"], 1, "held");
      return next.order.join(",") === "a,c" && next.position === 1;
    },
  ],

  [
    "a wrong answer sends the card behind every card still to come",
    () => {
      const next = afterAnswer(["a", "b", "c"], 0, "review");
      return next.order.join(",") === "b,c,a" && next.order[next.position] === "b";
    },
  ],

  [
    "a wrong answer on the last card in line does not deal it straight back",
    () => {
      const next = afterAnswer(["a", "b", "c"], 2, "review");
      return next.order.join(",") === "a,b,c" && next.order[next.position] === "b";
    },
  ],

  [
    "a wrong answer with nothing else left deals the card straight back",
    () => {
      const next = afterAnswer(["a"], 0, "review");
      return next.order.join(",") === "a" && next.position === 0;
    },
  ],

  [
    "a session ends once every card has been answered right once",
    () => {
      // c1 is missed twice before it is had; everything else is right first time.
      const misses: Record<string, number> = { b: 2 };
      let order = ["a", "b", "c"];
      let position = 0;
      const answered: string[] = [];
      for (let turn = 0; order.length > 0 && turn < 20; turn++) {
        const card = order[position];
        answered.push(card);
        const wrong = (misses[card] ?? 0) > 0;
        if (wrong) misses[card]--;
        ({ order, position } = afterAnswer(order, position, wrong ? "review" : "held"));
      }
      return order.length === 0 && answered.join(",") === "a,b,c,b,b";
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
