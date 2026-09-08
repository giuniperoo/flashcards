<img src="public/logo.svg" alt="Flashcards" width="265">
<h2><a href="https://f.lash.cards">f.lash.cards</a></h2>

A recall-first flashcard app. Twelve decks and 264 cards ship with it; four —
React 19, CAP theorem, ACID and SOLID — mirror decks that exist as printed
cards, and the rest were written for the same drill.

The index starts empty all the same, on the assumption that you are here for
your own material. One toggle at its foot brings the built-in decks in.

The one rule the app enforces: you cannot turn a card over until you have
written something. Recognising an answer feels like knowing it; producing one is
the part that survives an interview.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4. No database —
decks are markdown files read at build time, progress lives in `localStorage`.

## Run it

```bash
pnpm install
pnpm run dev
```

Open http://localhost:3000. The package manager is pnpm, pinned in
`package.json`; fonts come from Google Fonts through `next/font`, so a build
needs network access.

```bash
pnpm run build
pnpm run lint
pnpm run test   # deck parser, progress migrations, deck filtering
```

## Layout

```
app/
  layout.tsx             shell, fonts, chrome
  page.tsx               deck index
  new/page.tsx           import screen and format guide
  study/[deck]/page.tsx  reviewer, one route per deck plus /study/all
  print/[deck]/page.tsx  printable A4 sheets, same routes
  export/[deck]/route.ts a built-in deck as re-importable markdown
  globals.css            Tailwind v4 theme, palette lifted from the print spec
components/
  Reviewer.tsx           all study state
  DeckIndex.tsx          headline counts and the built-in deck grid
  DeckCard.tsx           one deck on the index; both lists render through it
  DeckVisibility.tsx     the show/hide controls, at the foot of the index
  DeckImporter.tsx       parses a paste or a file, previews it, saves it
  DeckGenerator.tsx      asks Claude for a deck, streams it into the importer
  ShuffledSet.tsx        narrows /study/all and /print/all in the browser
  PrintSheets.tsx        the sheets themselves, built-in and imported alike
lib/
  loadDecks.ts           reads content/*.md at build time — server only
  parseDeck.ts           one parser for files, pastes and generated text
  print.ts               sheet pagination and column mirroring
  progress.ts            drafts and grades, keyed by card id
  customDecks.ts         imported decks in localStorage
  prefs.ts               which built-in decks this reader wants to see
  tint.ts                a deck's colour, picked furthest from those in use
  generateDeck.ts        browser-direct call to Anthropic — client only
```

The client components are the interactive parts and nothing else: the reviewer,
the importer and generator, the print button, and the index components that read
`localStorage`. Deck cards render from summaries — names and counts, not 264
cards — so the index ships kilobytes rather than the content folder.
`generateStaticParams` prerenders every study and print route at build time,
thirteen slugs each.

## Keyboard

| Key              | Action                             |
| ---------------- | ---------------------------------- |
| Cmd/Ctrl + Enter | Turn the card over                 |
| Left / Right     | Previous / next card               |
| 1 or K           | Mark held (once turned over)       |
| 2 or R           | Mark for review (once turned over) |
| S                | Shuffle                            |

Arrow and letter shortcuts stand down while you are typing in the answer box.

## Printing

`/print/[deck]` lays the deck out as A4 sheets, eight cards per side in a 2×4
grid, with dashed cut lines and the deck's corner tint. Answer columns are
mirrored left to right so each answer prints on the back of its own question.

Print double-sided, flip on the **long edge**, at 100% scale with browser
margins set to none — the sheet carries its own 12.7mm margin. Decks that are
not a multiple of eight leave blank cells on the final sheet rather than
shifting the alignment.

## Adding your own decks

`/new` takes a pasted deck or an uploaded `.txt`, `.md`, `.csv`, `.tsv` or
`.rtf` file, parses it in the browser, shows you what it found, and saves it to
`localStorage`. Imported decks study and print exactly like the built-in ones.
Any deck can be exported back out as markdown — an imported one from the
browser, a built-in one through `/export/[deck]`.

The preferred format:

```
# Kubernetes basics
tint: #D6E8F7
blurb: Pods, services, and the scheduler

Q: What is a pod?
A: The smallest deployable unit - one or more
containers sharing a network namespace.

Q: What does a Service do?
A: Gives a stable IP and DNS name in front of
a changing set of pods.
```

Front matter is optional: `#` sets the title, `tint:` sets the corner colour,
`blurb:` sets the subtitle. Answers may wrap over several lines; a blank line
ends the card.

Two fallbacks are accepted for material you already have:

- **Markdown headings** — `## question` with the answer as the text beneath it
- **One card per line** — question and answer split on a tab or a pipe, which is
  what a spreadsheet export gives you

The parser reports problems with line numbers rather than failing silently: a
question with no answer, an answer with no question, or a tint that is not a
six-digit hex all surface in the preview before you save.

```bash
pnpm run test:parser
```

covers all three shapes plus the malformed cases.

### Writing one with Claude

The import screen can also ask Claude for a deck. Give it a topic and a card
count and it streams the same `Q:` / `A:` text into the textarea above, where you
read and edit it like any other paste. Saving stays a separate, deliberate
press: a generated card is a claim you are about to memorise, so reading it
first is the feature rather than a step to remove.

It runs in your browser against your own Anthropic key, which is held in
`localStorage` and sent nowhere but Anthropic. There is no server in this path
and no key of mine anywhere. Card counts are offered in multiples of eight,
because eight cards fill one printed sheet.

## The built-in decks

They start hidden. The twelve decks in `content/` are compiled into the app and
nobody but their author can delete them, and somebody running this for their own
material has no use for them — so the index opens empty and the controls at its
foot bring them in: the toggle beside "Add your own deck" for all of them,
**Hide** on a card to drop one again. The two are independent, so turning the
built-in decks back on restores whatever selection was there before.

Hiding is never deleting. The files stay, the routes still resolve, progress
against those cards is untouched, and imported decks are never affected. The
preference applies before the page paints, so a hidden grid does not flash up on
load.

The headline count follows what is actually on screen: hidden decks are not
counted, imported ones are.

## Storage

Everything the app remembers lives in `localStorage`, under four keys:
`decks:custom` for imported decks, `progress:*` for drafts and grades,
`prefs:index` for what the index shows, and `llm:key` for your Anthropic key if
you have set one. There is no account and nothing syncs, so a deck imported on
your laptop is not on your phone, and a `/study/your-deck` link will not open
for anyone else.

Browsers do clear this. WebKit deletes script-writable storage after seven days
without a visit — which covers Safari and, on macOS and iOS, every browser built
on it, DuckDuckGo included. Privacy browsers clear it on demand, and any browser
may under storage pressure. Imported decks can be exported back out before that
happens; progress cannot, and is the one thing here you can genuinely lose. The
built-in decks are compiled in and unaffected.

## Responsive

The deck grid goes one column, then two at 640px, and past 1300px the shell
takes 75% of the viewport and adds a column at 1300, 1800 and 2400px. The extra
width becomes more cards per row, never wider cards. Study and the import screen
keep a reading measure of their own at any window size. Tap targets are at least
44px, the grading buttons stack on narrow screens, the answer box uses 16px text
on mobile to stop iOS zooming on focus, and the sheet preview scrolls
horizontally rather than shrinking the cards. The card flip respects
`prefers-reduced-motion`.

## Card data

Decks live in `content/*.md`, one file per deck. The four that exist as printed
cards were converted from the PDFs rather than retyped, so the app and the paper
decks cannot drift. The filename is the slug: drop a new `.md` in and it becomes
a deck, with no code change. An unparseable file fails the build rather than
disappearing quietly.

Each card carries an `id:` — a uuid that progress is keyed by. Leave them alone.
Rewriting one makes the card read as new and drops its history.

Each deck carries the pastel tint used for the corner triangle on the printed
card, so a card looks the same on screen as it does in your hand.

## Licence

MIT — see [LICENSE](LICENSE). That covers the code and the card content alike:
the decks are original, and the four that exist as printed cards were written
for those cards.
