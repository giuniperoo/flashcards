# Interview flashcards

A recall-first flashcard app built from five printed decks: Gigs, React 19, CAP
theorem, ACID and SOLID. 80 cards.

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

Open http://localhost:3000.

## Layout

```
app/
  layout.tsx            shell, fonts, chrome
  page.tsx              deck index (server component)
  study/[deck]/page.tsx reviewer, one route per deck plus /study/all
  print/[deck]/page.tsx printable A4 sheets, same routes
  globals.css           Tailwind v4 theme, palette lifted from the print spec
components/
  Reviewer.tsx          the only stateful client component
  PrintButton.tsx       one-line client component for window.print()
lib/
  loadDecks.ts          reads content/*.md at build time
  print.ts              sheet pagination and column mirroring
```

Only `Reviewer.tsx` and `PrintButton.tsx` are client components, so the
JavaScript that ships is the reviewer and nothing else. `generateStaticParams`
prerenders all twelve study and print routes at build time.

## Keyboard

| Key | Action |
| --- | --- |
| Cmd/Ctrl + Enter | Turn the card over |
| Left / Right | Previous / next card |
| 1 or K | Mark held (once turned over) |
| 2 or R | Mark for review (once turned over) |
| S | Shuffle |

Arrow and letter shortcuts stand down while you are typing in the answer box.

## Printing

`/print/[deck]` lays the deck out as A4 sheets, eight cards per side in a 2x4
grid, with dashed cut lines and the deck's corner tint. Answer columns are
mirrored left to right so each answer prints on the back of its own question.

Print double-sided, flip on the **long edge**, at 100% scale with browser
margins set to none - the sheet carries its own 12.7mm margin. Decks that are
not a multiple of eight leave blank cells on the final sheet rather than
shifting the alignment.

## Adding your own decks

`/new` takes a pasted deck or an uploaded `.txt`, `.md`, `.csv`, `.tsv` or
`.rtf` file, parses it in the browser, shows you what it found, and saves it to
`localStorage`. Imported decks study and print exactly like the built-in ones,
and can be exported back out as markdown.

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

Imported decks live in one browser. They do not sync, they do not survive
clearing site data, and a `/study/your-deck` link will not open for anyone else
— hence the export button. Built-in decks are compiled in and unaffected.

## Responsive

Single column throughout, so the layouts differ by scale rather than structure.
Tap targets are at least 44px, the grading buttons stack on narrow screens, the
answer box uses 16px text on mobile to stop iOS zooming on focus, and the sheet
preview scrolls horizontally rather than shrinking the cards. The card flip
respects `prefers-reduced-motion`.

## Card data

Decks live in `content/*.md`, one file per deck, converted from the printed PDFs
rather than retyped so the app and the paper decks cannot drift. The filename is
the slug: drop a new `.md` in and it becomes a deck, with no code change. An
unparseable file fails the build rather than disappearing quietly.

Each card carries an `id:` — a uuid that progress is keyed by. Leave them alone.
Rewriting one makes the card read as new and drops its history.

Each deck carries the pastel tint used for the corner triangle on the printed
card, so a card looks the same on screen as it does in your hand.

## Push it to GitHub

The repo is not created yet — do this from your own machine so it lands under
your account:

```bash
cd flashcards
git init
git add .
git commit -m "Flashcard reviewer: five decks, recall-first"

# with the GitHub CLI
gh repo create interview-flashcards --private --source=. --push

# or, if you made the repo in the browser first
git remote add origin git@github.com:YOUR_USERNAME/interview-flashcards.git
git branch -M main
git push -u origin main
```

## Connect it to Vercel

Vercel detects Next.js automatically — no build settings, no environment
variables, no configuration needed.

1. Go to vercel.com/new
2. Import the repo you just pushed
3. Deploy

Or from the terminal:

```bash
npm i -g vercel
vercel          # preview deployment, links the project
vercel --prod   # production
```

After the first import, every push to `main` deploys to production and every
branch gets its own preview URL.

## Things worth doing next

- Spaced repetition: store a review date per card and surface what is due
- A `?deck=` filter on `/study/all` so shuffled sessions can exclude a deck
- Move progress out of `localStorage` if you ever want it across devices
