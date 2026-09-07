import { parseDeck } from "./parseDeck";
import { toDeckText } from "./customDecks";
import type { Deck } from "./types";
import { shadeForTint } from "./tint";

/** A deck as the app's export button writes it, used both ways below. */
const EXPORTED: Deck = {
  slug: "cap",
  name: "CAP theorem",
  blurb: "Partitions, trade-offs, and PACELC",
  tint: "#F7C7D6",
  ink: "#B84268",
  cards: [
    { id: "c2396dd8-28eb-48b2-9233-586f19161ee8", q: "What do the three letters stand for?", a: "Consistency, Availability, Partition tolerance." },
    { id: "0c6c496a-d778-46d4-95e5-dce77a704b06", q: "CAP theorem in one sentence?", a: "During a partition, choose consistency or availability." },
    { id: "413b6f35-7372-425c-ad31-7af99f7d14a4", q: "Define consistency.", a: "Every read receives the most recent write or an error." },
  ],
};

const cases: Array<[string, string, (r: ReturnType<typeof parseDeck>) => boolean]> = [
  ["Q/A with front matter and wrapped answer",
`# Kubernetes basics
tint: #D6E8F7
blurb: Pods and services

Q: What is a pod?
A: The smallest deployable unit
that shares a network namespace.

Q: What does a Service do?
A: Stable IP in front of pods.`,
   r => r.cards.length === 2 && r.title === "Kubernetes basics" && r.tint === "#D6E8F7"
        && r.cards[0].a.includes("namespace") && r.errors.length === 0],

  ["multi-line question",
`Q: What is the difference
between a Deployment and a StatefulSet?
A: Stable identity and ordered rollout.`,
   r => r.cards.length === 1 && r.cards[0].q.includes("Deployment and a StatefulSet")],

  ["markdown headings",
`# Deck title

## What is a pod?
The smallest deployable unit.

## What does a Service do?
A stable IP.`,
   r => r.cards.length === 2 && r.title === "Deck title"],

  ["pipe delimited",
`What is a pod? | Smallest deployable unit.
What is a Service? | A stable IP.`,
   r => r.cards.length === 2 && r.cards[1].a === "A stable IP."],

  ["tab delimited with header row",
`Question\tAnswer
What is a pod?\tSmallest unit.`,
   r => r.cards.length === 1],

  ["question with no answer is an error",
`Q: Dangling question?

Q: Real one?
A: Yes.`,
   r => r.cards.length === 1 && r.errors.length === 1 && r.errors[0].line === 1],

  ["answer with no question is an error",
`A: orphaned
Q: Fine?
A: Yes.`,
   r => r.errors.length === 1 && r.cards.length === 1],

  ["bad tint warns but still parses",
`# Deck
tint: not-a-colour
Q: One?
A: Two.`,
   r => r.cards.length === 1 && r.tint === null && r.warnings.length === 1],

  ["lowercase and alternate punctuation",
`q. First?
a. Second.`,
   r => r.cards.length === 1],

  ["empty input reports an error",
`   `,
   r => r.cards.length === 0 && r.errors.length === 1],

  ["no title falls back",
`Q: A?
A: B.`,
   r => r.title === "Untitled deck"],

  ["CRLF and BOM survive",
"\uFEFF# Deck\r\nQ: A?\r\nA: B.\r\n",
   r => r.cards.length === 1 && r.title === "Deck"],

  ["card ids are taken from id: lines",
`id: 11111111-2222-4333-8444-555555555555
Q: A?
A: B.

id: 66666666-7777-4888-8999-aaaaaaaaaaaa
Q: C?
A: D.`,
   r => r.cards.length === 2
        && r.cards[0].id === "11111111-2222-4333-8444-555555555555"
        && r.cards[1].id === "66666666-7777-4888-8999-aaaaaaaaaaaa"],

  ["a card with no id: line still gets one",
`Q: A?
A: B.`,
   r => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r.cards[0].id)],

  ["a malformed id warns and is replaced rather than used",
`id: not-a-uuid
Q: A?
A: B.`,
   r => r.cards.length === 1 && r.warnings.length === 1 && r.cards[0].id !== "not-a-uuid"],

  ["an answer line beginning id: stays part of the answer",
`Q: A?
A: B.
id: this is prose, not a card id`,
   r => r.cards.length === 1 && r.cards[0].a.includes("this is prose")],

  // Eight of the decks in content/ are written without blank lines between
  // cards. Every id but the first then arrived while the answer above it was
  // still open, was swallowed into that answer, and the card it belonged to
  // was given a fresh one — so those cards were rekeyed on every parse, and
  // progress is kept by card id.
  ["ids are read with no blank line between the cards",
`id: 11111111-2222-4333-8444-555555555555
Q: A?
A: B.
id: 66666666-7777-4888-8999-aaaaaaaaaaaa
Q: C?
A: D.`,
   r => r.cards.length === 2
        && r.cards[0].id === "11111111-2222-4333-8444-555555555555"
        && r.cards[1].id === "66666666-7777-4888-8999-aaaaaaaaaaaa"
        && r.cards[0].a === "B."],

  // The export button and this parser are two ends of one round trip: a deck
  // exported from the app is what gets kept in `content/` and read back. When
  // the exporter separated its cards with a single newline, every id but the
  // first was read as part of the answer above it.
  ["a deck exported by the app parses back to the same cards",
toDeckText(EXPORTED),
   r => r.cards.length === 3
        && r.title === "CAP theorem"
        && r.tint === "#F7C7D6"
        && r.ink === "#B84268"
        && r.cards.map(c => c.id).join() ===
             "c2396dd8-28eb-48b2-9233-586f19161ee8,0c6c496a-d778-46d4-95e5-dce77a704b06,413b6f35-7372-425c-ad31-7af99f7d14a4"
        && r.cards[0].a === "Consistency, Availability, Partition tolerance."
        && r.cards.every(c => !/\bid:/.test(c.a))
        && r.errors.length === 0 && r.warnings.length === 0],

  ["ink and order front matter are read",
`# Deck
tint: #CBDDF2
ink: #5E86AE
order: 3

Q: A?
A: B.`,
   r => r.tint === "#CBDDF2" && r.ink === "#5E86AE" && r.order === 3],

  ["ink and order are null when absent",
`Q: A?
A: B.`,
   r => r.ink === null && r.order === null],
];

/*
 * Cases on the exported text itself rather than on a parse of it.
 *
 * The parser now reads a uuid `id:` line even mid-answer, so a deck exported
 * with its cards joined by a single newline round-trips correctly all the
 * same — which means the round-trip case above would not notice the blank line
 * going away again. This is what holds the exporter to it.
 */
const textCases: Array<[string, () => boolean]> = [
  ["export leaves a blank line between the cards", () => {
    const text = toDeckText(EXPORTED);
    return /A: [^\n]*\n\nid: /.test(text) && !/A: [^\n]*\nid: /.test(text);
  }],

  ["export leaves ink out when the tint already gives it", () => {
    const derived = shadeForTint(EXPORTED.tint);
    const text = toDeckText({ ...EXPORTED, ink: derived });
    // No line to read, and the reader lands on the same colour anyway.
    return !/^ink:/m.test(text)
      && (parseDeck(text).ink ?? shadeForTint(parseDeck(text).tint!)) === derived;
  }],

  ["export keeps ink when it is not what the tint gives", () => {
    const text = toDeckText(EXPORTED);
    return EXPORTED.ink !== shadeForTint(EXPORTED.tint)
      && /^ink: #B84268$/m.test(text)
      && parseDeck(text).ink === EXPORTED.ink;
  }],

  ["export starts each card on an id: line under the front matter", () => {
    const text = toDeckText(EXPORTED);
    return text.startsWith("# CAP theorem\ntint: #F7C7D6\nink: #B84268\nblurb: Partitions, trade-offs, and PACELC\n\nid: ")
      && (text.match(/^id: /gm) ?? []).length === EXPORTED.cards.length;
  }],
];

let failed = 0;
for (const [name, input, check] of cases) {
  const r = parseDeck(input);
  const ok = check(r);
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : ` -> ${JSON.stringify(r).slice(0,220)}`}`);
}
for (const [name, check] of textCases) {
  const ok = check();
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : ` -> ${JSON.stringify(toDeckText(EXPORTED)).slice(0,220)}`}`);
}
console.log(failed === 0 ? "\nall parser cases pass" : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
