# CLAUDE.md

Context for working in this repo. Read before making changes.

## What this is

A flashcard app for interview preparation. Five built-in decks (Gigs, React 19,
CAP theorem, ACID, SOLID; 80 cards) that can be studied in the browser or printed
as physical cards. Single user, no backend.

The defining product rule: **you cannot turn a card over until you have written
an answer.** Recognition feels like knowledge and isn't. Any change that makes
revealing the answer easier is working against the point of the app.

## Stack and commands

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4. No database.

```bash
npm run dev           # local
npm run build         # must pass before any commit
npm run test:parser   # deck parser test cases
```

Fonts come from Google Fonts via `next/font`, so builds need network access.

## Out of scope — do not build

Accounts, authentication, databases, deck publishing, public library, forking,
moderation, copyright terms, billing, Stripe. These are designed in
`ARCHITECTURE.md` and deliberately deferred to a later session. If a task seems
to need one of them, stop and ask rather than introducing it.

## Architecture

Server components by default. Only `Reviewer.tsx`, `PrintButton.tsx`,
`DeckImporter.tsx`, `CustomDeckList.tsx` and `CustomDeckView.tsx` are client
components, and that list should not grow without a reason. The point is that
the JavaScript shipped is the interactive parts and nothing else.

```
app/
  page.tsx              deck index
  new/page.tsx          import screen + format guide
  study/[deck]/page.tsx reviewer; unknown slugs fall through to localStorage
  print/[deck]/page.tsx A4 sheets
components/
  Reviewer.tsx          all study state
  PrintSheets.tsx       shared by the built-in and custom print paths
lib/
  decks.ts              GENERATED — see below
  parseDeck.ts          one parser for uploads, pastes and (after task 2) files
  print.ts              sheet pagination and column mirroring
  customDecks.ts        localStorage store for imported decks
```

Both `[deck]` routes set `dynamicParams = true`: built-in slugs are prerendered,
anything else renders `CustomDeckView`, which reads `localStorage` on the client.

## Things that will break if you "improve" them

**`lib/decks.ts` is generated, not hand-written.** It comes from the printed PDFs
via `scripts/extract-cards.py` and `scripts/generate-decks.py`. Editing it by hand
puts the app and the physical cards out of sync. Task 2 replaces this with
markdown files in `content/`; until then, don't touch the generated file.

**The print geometry is load-bearing.** `.sheet` and its children in
`globals.css` reproduce an A4 layout that was validated against reportlab-
generated PDFs: 12.7mm margin, 2×4 grid, 8 cards per side. `mirrorRows()` in
`lib/print.ts` reverses each row so answers land on the back of their own
questions under a long-edge flip. Verified output is questions `1,2,3,4,5,6,7,8`
and answers `2,1,4,3,6,5,8,7`. Changing either without printing a test sheet will
silently produce misaligned cards.

**Answers stay to one or two sentences.** Not a style preference — longer answers
overflow a printed card and there is no scrollbar on paper.

**Deck tints are pastels with a darker `ink` for text and progress bars.** The
palette in `globals.css` derives from the original print spec. New decks take an
unused pastel rather than an arbitrary colour.

## Storage

`localStorage`, two kinds of key:

- `decks:custom` — imported decks, a bare `Deck[]`
- `progress:{slug}` — `{ drafts, grades }`, currently keyed by card **index**

Card-index keying is a known defect; task 1 fixes it and adds a version envelope
to both. Until then, assume any change to card order corrupts progress.

## Conventions

- Sentence case in all UI copy. No title case, no exclamation marks
- Copy names what happens: "Turn card over", not "Submit"
- Tap targets at least 44px; the answer box uses 16px on mobile so iOS doesn't
  zoom on focus
- Colours come from the Tailwind theme in `globals.css`, never hardcoded hex in
  components, except deck tints which are data
- `prefers-reduced-motion` is respected by the card flip; keep it that way
- Errors are specific and actionable, and never blame the user

## Before committing

- `npm run build` passes
- `npm run test:parser` passes
- Anything touching print geometry has been printed and physically checked
- One task per commit
