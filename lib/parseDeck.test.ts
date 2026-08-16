import { parseDeck } from "./parseDeck";

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
];

let failed = 0;
for (const [name, input, check] of cases) {
  const r = parseDeck(input);
  const ok = check(r);
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : ` -> ${JSON.stringify(r).slice(0,220)}`}`);
}
console.log(failed === 0 ? "\nall parser cases pass" : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
