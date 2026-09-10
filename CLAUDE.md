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
pnpm run test:schedule # box and due date test cases, under a fixed timezone
pnpm run test:queue    # what a session deals: a backlog, then the new cards
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
`DeckImporter.tsx`, `DeckGenerator.tsx`, `CustomDeckList.tsx`, `DeckIndex.tsx`
and `CustomDeckView.tsx` are client components, and that list should not grow
without a reason. The point is that
the JavaScript shipped is the interactive parts and nothing else.

`DeckIndex.tsx` earns its place by counting: the headline totals span the
built-in decks and the imported ones, and neither which decks are hidden nor
the imported decks themselves are visible to the server. It takes
`DeckSummary[]` rather than `Deck[]` — a dozen names and counts instead of 264
cards — so what reaches the browser stays small. Exporting a built-in deck goes
through `/export/[deck]` for the same reason: a download button built in the
browser would need every card in the page payload.

```
app/
  page.tsx              deck index
  new/page.tsx          import screen + format guide
  study/[deck]/page.tsx reviewer; unknown slugs fall through to localStorage
  print/[deck]/page.tsx A4 sheets
components/
  Reviewer.tsx          all study state
  DeckIndex.tsx         headline counts, and hiding the built-in decks
  DeckCard.tsx          one deck on the index; both lists render through it
  DeckVisibility.tsx    the show/hide controls, at the foot of the index
  DeckGenerator.tsx     asks Claude for a deck, streams it into the importer
  PrintSheets.tsx       shared by the built-in and custom print paths
lib/
  loadDecks.ts          reads content/*.md at build time — SERVER ONLY
  types.ts              Card, Deck, StudyCard — safe for client components
  tint.ts               hue maths: ink for a tint, and the next unused tint
  parseDeck.ts          one parser for uploads, pastes and (after task 2) files
  print.ts              sheet pagination and column mirroring
  customDecks.ts        localStorage store for imported decks
  progress.ts           the one progress store, card keys, and its migrations
  schedule.ts           Leitner boxes: next box, due date, and whether it is due
  queue.ts              what a session deals — due cards, then the unseen ones
  shuffle.ts            Fisher-Yates, shared by the reviewer and the queue
  cardId.ts             uuid for new cards
  apiKey.ts             the user's own Anthropic key, its own localStorage key
  prefs.ts              index preferences; so far, showing the built-in decks
  useCustomDecks.ts     the imported decks, kept in step with localStorage
  usePrefs.ts           index preferences, shared by the grid and the controls
  generateDeck.ts       browser-direct call to Anthropic — CLIENT ONLY
```

Both `[deck]` routes set `dynamicParams = true`: built-in slugs are prerendered,
anything else renders `CustomDeckView`, which reads `localStorage` on the client.

## Things that will break if you "improve" them

**The mark is generated, not hand-edited.** `public/logo.svg` comes out of
`tools/wordmark.py`, and `app/icon.png` and `app/apple-icon.png` out of
`tools/app-icons.py`. Editing the SVG by hand works until the next regeneration
throws it away. The letters in the wordmark are outlines rather than `<text>`,
because an SVG that lands somewhere without IBM Plex Mono would otherwise fall
back to another mono and no longer fit the frame drawn around it — which also
means `tools/wordmark.py` needs `pnpm run build` to have run, since that is what
puts the font on disk. The icon carries a lighter frame and bolt outline than
the wordmark: the wordmark's weights are hairlines at 265x76 and heavy on a
square.

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

`localStorage`, three keys, each wrapped in a version envelope:

- `decks:custom` — `{ version: 1, decks: Deck[] }`
- `progress` — `{ version: 4, cards }`, keyed by `{deckSlug}:{cardId}`
- `prefs:index` — `{ version: 2, showBuiltIns, hiddenDecks }`

Version 1 of `prefs:index` held `showBuiltIns` alone, and reads as a version 2
with nothing hidden individually — the defaults are the migration, so there is
nothing to write back.

A card's record is `{ draft, box, due, reviewed, seen }`. `box`, `due` and
`reviewed` mean nothing while `seen` is false — a card written on but never
graded has no place in the schedule — and `seen` is the authority on that
rather than a sentinel box or an empty date. Version 3 held two parallel maps,
`drafts` and `grades`; a grade was a verdict, a record is a schedule, and the
two halves of a card's history cannot be kept in step when they are stored
apart.

**`reviewed` is written and never read.** It is the one field that cannot be
backfilled later: nothing else records *when* a review happened, and `due` is
no substitute, since a box-5 card reviewed a fortnight ago carries a later
`due` than a box-1 card done this morning. It is empty on every record migrated
from an older store, because those stores never knew.

**Progress is one store for the whole app, and the key carries no suffix.**
Versions 1 and 2 held a store per route — `progress:all` from the shuffle,
`progress:{slug}` from the deck — so a card studied both ways had two records
with two values and nothing reconciled them: a draft written an hour ago read
as empty on the other route, and the two tallies disagreed. `cardKey()` was
already unique across the app on its own, so the partition was the suffix and
both went together. Reintroducing a suffix implies a sibling store, and there
isn't one. Deleting an imported deck therefore drops a key *prefix* rather than
a key, which is what `forgetDeck()` is for.

**The built-in decks are off by default** — `showBuiltIns` is false in
`DEFAULT_PREFS`, and only a stored `true` turns them on. The decks in
`content/` are the author's, and somebody arriving at this app has not asked
for them; they are one press of "Show built-in decks" away, at the foot of the
index. That default is also what the server prerenders, which is what keeps the
index honest on load: it renders no built-in grid, so there is nothing to paint
and then take away, and the grid arrives with the preferences the same way the
imported decks do. A reader who has turned the decks on sees them appear on
hydration; that is the trade, and it is the smaller one, because the reverse
flashed content away on every load for everybody who had not chosen anything.
An earlier version of this app kept a pre-paint inline script in
`app/layout.tsx` that hid decks before they could flash. It had a job only
while the server rendered decks the reader did not want; if the default is ever
flipped back, it has to come back with it.

The controls sit at the foot of the index, beside "Add your own deck", not
above the grid. Someone who has hidden the built-in decks because none of them
are theirs will never press "show" again, and a control they will not use
should not sit in the middle of the page.

Hiding is not deleting, and the copy has to keep saying so: the files are read
off the filesystem at build time and the browser cannot remove them. That is
why built-in decks carry "Hide" where imported decks carry "Delete".

`/study/all` and `/print/all` are assembled on the server from every deck, then
narrowed in the browser by `components/ShuffledSet.tsx` — from `?deck=a,b,c` if
the link carries one, and from the preferences otherwise. The index writes that
parameter into the shuffled card's links, so a link says what it contains and
works for whoever opens it; their own hidden decks are none of its business. A
single deck is never narrowed: `/study/kafka` opens a hidden deck, because
hidden is not deleted.

`ShuffledSet` reads the query off `window.location` in an effect rather than
with `useSearchParams`. On a prerendered route that hook needs a Suspense
boundary, and a boundary there left the whole subtree unhydrated — the cards
rendered and no button did anything. If you reintroduce it, click a button
before believing it works.

Every card carries a uuid `id`, assigned once when it is written into
`content/*.md` or parsed on import, and never derived from the question text —
fixing a typo is exactly when progress should survive. Card order is therefore
free to change.

Both stores migrate on read, in `lib/progress.ts` and `lib/customDecks.ts`: a
read of `progress` folds in every `progress:*` key it finds, rewriting version
1's index keys onto card ids on the way, and every shape before version 4
reduces to drafts and grades first and converts to records in one place, so the
route-merge rules and the schedule rules stay separate; a bare `Deck[]`
predates the envelope and gets ids backfilled. Both migrations persist immediately and are idempotent.
`lib/progress.test.ts` covers them, including the case that motivated all of
this — a card inserted mid-deck leaving later cards' grades intact.

Two rules settle a card held in two of the old stores at once. **Review beats
held**, because being wrong that way costs one extra review and being wrong the
other way retires a card that was never learned; and the **longer draft wins**,
because a draft is writing the reader did and the fuller attempt is the better
guess at which they would want back. Neither has anything better to go on —
versions 1 and 2 carry no timestamps. Both are order-independent, which is what
lets one read fold in however many keys it finds without caring which came first.

Held becomes box 2 due tomorrow and review becomes box 1 due today. Held does
*not* get box 2's two days: the old stores never recorded when a card was
graded, so an interval has nothing to count from, and bringing everything back
within a day is the reading that cannot silently hide a card.

A version 1 key can only be rewritten where the deck's cards are in hand, and a
read only holds the cards for the route it was called from. So entries for a
deck this route *can* see and still cannot place are dropped as unreachable,
while entries for a deck it has never seen are written back to the legacy key
for a later route to finish. Each entry is consumed exactly once; that is what
stops a second read from merging a stale grade back over a newer one.

## Conventions

- Sentence case in all UI copy. No title case, no exclamation marks
- Copy names what happens: "Turn card over", not "Submit"
- Tap targets at least 44px; the answer box uses 16px on mobile so iOS doesn't
  zoom on focus
- Colours come from the Tailwind theme in `globals.css`, never hardcoded hex in
  components, except deck tints which are data
- The shell is `max-w-3xl` up to 1300px and 75% of the viewport past it. The
  extra width becomes more columns — `.deck-grid` goes 2, 3, 4, 5 — never wider
  cards, because a deck card stretched to 600px stops reading as a card. Study
  and the import screen set `max-w-3xl` of their own: a flip card the width of
  the window no longer matches the printed one, and prose wants a line length
- `prefers-reduced-motion` is respected by the card flip; keep it that way
- Errors are specific and actionable, and never blame the user

## Before committing

- `pnpm run build` passes
- `pnpm run lint` passes
- `pnpm run test` passes
- Anything touching print geometry has been printed and physically checked
- One task per commit
