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
pnpm install          # pnpm, not npm — see below
pnpm run dev          # local
pnpm run build        # must pass before any commit
pnpm run lint         # ESLint flat config, next/core-web-vitals
pnpm run test         # both suites below
pnpm run test:parser  # deck parser test cases
pnpm run test:progress # storage migration test cases
```

Fonts come from Google Fonts via `next/font`, so builds need network access.

**The package manager is pnpm**, pinned by `packageManager` in `package.json`.
pnpm blocks dependency install scripts by default, so the three packages that
need to link native binaries — `esbuild` (backs `tsx`), `sharp`, and
`unrs-resolver` — are allowed explicitly in `pnpm-workspace.yaml`. If a future
dependency fails with `ERR_PNPM_IGNORED_BUILDS`, add it there rather than
switching package managers. Note that pnpm refuses to run *any* script while
that error is outstanding, so it presents as every command failing at once.

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
  loadDecks.ts          reads content/*.md at build time — SERVER ONLY
  types.ts              Card, Deck, StudyCard — safe for client components
  tint.ts               hue maths: ink for a tint, and the next unused tint
  parseDeck.ts          one parser for uploads, pastes and (after task 2) files
  print.ts              sheet pagination and column mirroring
  customDecks.ts        localStorage store for imported decks
  progress.ts           progress store, card keys, and v1 to v2 migration
  cardId.ts             uuid for new cards
```

Both `[deck]` routes set `dynamicParams = true`: built-in slugs are prerendered,
anything else renders `CustomDeckView`, which reads `localStorage` on the client.

## Things that will break if you "improve" them

**`content/*.md` is the source of the printed cards.** One file per deck; the
filename is the slug, so adding a file adds a deck and nothing else is needed.
Card *content* is fixed — these decks mirror physical cards, so editing a `q` or
an `a` puts the app and the printed cards out of step unless you are reprinting.
Card order is free to change, because progress is keyed by id.

**Never remove or rewrite an `id:` line.** Progress is keyed by it. A card whose
id changes reads as a brand new card and loses its history. `tools/extract-cards.py`
is the original one-off PDF migration, kept for the record and run by nothing.

**`lib/loadDecks.ts` is server-only** — it reads the filesystem. Client
components import types from `lib/types.ts` instead. This is why `DeckImporter`
takes `reservedSlugs` as a prop rather than importing the decks: it runs in the
browser and cannot see `content/`.

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
five built-in decks carry both in their front matter, from the original print
spec, and must not change. A deck you add gets its colour from `nextTint()` in
`lib/tint.ts`, which picks the hue *furthest from every hue already in use* —
built-in and custom alike — and renders it at a fixed pastel saturation and
lightness. There is deliberately no fixed palette: the previous list of six ran
out and repeated, was indexed by deck count so deleting a deck recoloured every
later one, and five of its six entries sat within 16° of a built-in hue despite
a comment claiming otherwise. A `tint:` line in an import still wins — that
colour is the author's choice.

Because `lib/customDecks.ts` runs in the browser and cannot read `content/`,
the built-in tints reach it as the `reservedTints` prop, the same way
`reservedSlugs` does.

## Storage

`localStorage`, two kinds of key, both wrapped in a version envelope:

- `decks:custom` — `{ version: 1, decks: Deck[] }`
- `progress:{slug}` — `{ version: 2, drafts, grades }`, keyed by
  `{deckSlug}:{cardId}`

Every card carries a uuid `id`, assigned once when it is written into
`content/*.md` or parsed on import, and never derived from the question text —
fixing a typo is exactly when progress should survive. Card order is therefore
free to change.

Both stores migrate on read, in `lib/progress.ts` and `lib/customDecks.ts`: an
unversioned progress object is version 1 and gets its index keys rewritten onto
card ids; a bare `Deck[]` predates the envelope and gets ids backfilled. Both
migrations persist immediately and are idempotent. `lib/progress.test.ts` covers
them, including the case that motivated all of this — a card inserted mid-deck
leaving later cards' grades intact.

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

- `pnpm run build` passes
- `pnpm run lint` passes
- `pnpm run test` passes
- Anything touching print geometry has been printed and physically checked
- One task per commit
