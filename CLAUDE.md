# CLAUDE.md

Context for working in this repo. Read before making changes.

## What this is

A flashcard app for interview preparation. Twelve built-in decks and 264 cards,
four of which (React 19, CAP theorem, ACID, SOLID) mirror decks that exist as
printed cards, plus any deck you import or have an AI write. Studied in the
browser, on a schedule or freely, or printed as physical cards. Single user. The
only backend is sync's: one route that keeps an encrypted copy per sync key.

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
pnpm run test         # every suite below
pnpm run test:parser  # deck parser test cases
pnpm run test:progress # storage migration test cases
pnpm run test:schedule # box and due date test cases, under a fixed timezone
pnpm run test:queue    # what a session deals: a backlog, then the new cards
pnpm run test:filter   # which decks the shuffled set draws from
pnpm run test:prefs    # index preferences, and the switch's default
pnpm run test:llm      # deck generation: keys, model lists, each provider's stream
pnpm run test:sync     # what two devices' progress and decks merge to, and the crypto
```

Fonts come from Google Fonts via `next/font`, so builds need network access.

**Sync needs two environment variables in production** and none in development.
`KV_REST_API_URL` and `KV_REST_API_TOKEN` come from Upstash Redis, added to the
Vercel project from the Marketplace, and `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are read as well, since that is what the same
integration calls them elsewhere; `lib/syncStore.ts` falls back to a
process-local map when they are absent, so `pnpm run dev` runs the whole flow
on one machine. It runs on *one* machine only: `crypto.subtle` is unavailable
outside a secure context, so a second device has to reach the deployed site
rather than a laptop's dev server. A production build with no Redis answers
that sync isn't set up rather than failing.

**The package manager is pnpm**, pinned by `packageManager` in `package.json`.
pnpm blocks dependency install scripts by default, so the three packages that
need to link native binaries — `esbuild` (backs `tsx`), `sharp`, and
`unrs-resolver` — are allowed explicitly in `pnpm-workspace.yaml`. If a future
dependency fails with `ERR_PNPM_IGNORED_BUILDS`, add it there rather than
switching package managers. Note that pnpm refuses to run *any* script while
that error is outstanding, so it presents as every command failing at once.

## Out of scope — do not build

Accounts, authentication, deck publishing, public library, forking, moderation,
copyright terms, billing, Stripe. These are designed in `ARCHITECTURE.md` and
deliberately deferred to a later session. If a task seems to need one of them,
stop and ask rather than introducing it.

Sync is the one exception to "no server state", decided on September 19, 2026:
a key-value store holding one encrypted copy per sync key, and nothing else. It
is not a database of users. There is no account, no table of anything, and the
server cannot read what it holds. Anything that would need the server to know
who someone is, or to read their data, is still out of scope.

## Architecture

Server components by default. Only `Reviewer.tsx`, `PrintButton.tsx`,
`DeckImporter.tsx`, `DeckGenerator.tsx`, `CustomDeckList.tsx`, `DeckIndex.tsx`,
`CustomDeckView.tsx`, `PrintPreview.tsx`, `PrintIntro.tsx`, `SyncPanel.tsx` and
`SyncAgent.tsx` are client components, and that list should not grow without a
reason. The preview has to measure its column to zoom the pages to fit, and the
print page's "Study" link has to carry the reader's mode and `?deck=` set.
`SyncAgent` sits in the layout and draws nothing: grades are given on study
pages and sync has to follow them there. The point is that the JavaScript
shipped is the interactive parts and nothing else.

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
  export/[deck]/route.ts a built-in deck as re-importable markdown
  not-found.tsx         "Nothing at this address", in the app's own panel
  api/sync/[id]/route.ts one sync key's encrypted copy: GET, PUT, DELETE
components/
  Reviewer.tsx          all study state
  DeckIndex.tsx         headline counts, and hiding the built-in decks
  DeckCard.tsx          one deck on the index; both lists render through it
  DeckVisibility.tsx    the show/hide controls, and `StudyMode`: the mode bar
                        and its interval, at the other end of the same row
  DeckGenerator.tsx     asks Claude, OpenAI or Gemini for a deck, streams it into the importer
  QueueBar.tsx          a scheduled session's breakdown, in the title row if it fits
  ColorKey.tsx          what the strip's colors mean, behind a "?" at its end
  SyncPanel.tsx         the sync control, and the dialog it opens: start, join, stop, QR code
  SyncAgent.tsx         when to sync: on arrival, after changes, on leaving and returning
  PrintSheets.tsx       shared by the built-in and custom print paths
  PrintPreview.tsx      zooms the pages to fit the column on screen, never in print
  PrintIntro.tsx        a print page's title row, and what to set in the dialog
lib/
  loadDecks.ts          reads content/*.md at build time — SERVER ONLY
  types.ts              Card, Deck, StudyCard — safe for client components
  tint.ts               hue math: ink for a tint, and the next unused tint
  parseDeck.ts          one parser for uploads, pastes and (after task 2) files
  print.ts              sheet pagination and column mirroring
  customDecks.ts        localStorage store for imported decks
  progress.ts           the one progress store, card keys, and its migrations
  schedule.ts           Leitner boxes: next box, due date, and whether it is due
  queue.ts              what a session deals — due cards, then the unseen ones
  shuffle.ts            Fisher-Yates, shared by the reviewer and the queue
  deckFilter.ts         which decks /study/all and /print/all draw from
  cardId.ts             uuid for new cards
  focus.ts              where focus goes when Hide or Delete takes its deck card away
  apiKey.ts             the reader's own keys and chosen models, one per provider
  prefs.ts              index preferences: the built-in decks, and the mode
  studyMode.ts          the `?scheduled` parameter, and links that carry it
  useCustomDecks.ts     the imported decks, kept in step with localStorage
  usePrefs.ts           index preferences, shared by the grid and the controls
  reviewerPrefs.ts      what the reviewer remembers: the color key has been shown
  useDueCounts.ts       cards each deck owes today, for the counts on the index
  useStoredMode.ts      the saved mode on pages that have none: import and print
  generateDeck.ts       writes a deck or lists models, loading one adapter — CLIENT ONLY
  llm/providers.ts      the providers: names, where keys come from, what keys look like
  llm/shared.ts         the prompt, the cleanup, the stream reader, `GenerateError`
  llm/anthropic.ts      Claude through the SDK, shaped by the model's capabilities
  llm/openai.ts         OpenAI Chat Completions over `fetch`, no SDK
  llm/gemini.ts         Gemini `streamGenerateContent` over `fetch`, no SDK
  sync.ts               read, merge, write against the server — CLIENT ONLY
  syncMerge.ts          what two devices settle on: records, decks, deletions
  syncCrypto.ts         the key into an id and an AES key; the suggested key
  syncWords.ts          what a suggested key is made of: adjective, noun, verb + ing
  syncStore.ts          Redis over REST, or memory in development — SERVER ONLY
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
silently produce misaligned cards. The on-screen preview zooms, labels and pairs
the pages, but all of that sits in `@media screen`; printing to PDF before and
after a change to it should give identical pages.

**Answers stay to one or two sentences.** Not a style preference — longer answers
overflow a printed card and there is no scrollbar on paper.

**Deck tints are pastels with a darker `ink` for text and progress bars.** The
four printed decks carry both in their front matter, from the original print
spec, and must not change. The other eight carry a tint, and their ink comes
from `shadeForTint()`. A deck you add gets its color from `nextTint()` in
`lib/tint.ts`, which picks the hue *furthest from every hue already in use* —
built-in and custom alike — and renders it at a fixed pastel saturation and
lightness. There is deliberately no fixed palette: the previous list of six ran
out and repeated, was indexed by deck count so deleting a deck recolored every
later one, and five of its six entries sat within 16° of a built-in hue despite
a comment claiming otherwise. A `tint:` line in an import still wins — that
color is the author's choice.

Because `lib/customDecks.ts` runs in the browser and cannot read `content/`,
the built-in tints reach it as the `reservedTints` prop, the same way
`reservedSlugs` does.

**The sync key never leaves the browser, and the server never learns it.**
`lib/syncCrypto.ts` stretches it with PBKDF2 into two halves that cannot be
derived from each other: the id the server files the copy under, and the
AES-GCM key that seals the copy before it goes. Anything that would send the
key itself, weaken the stretching, or let the server see plaintext undoes the
one property that makes three words an acceptable substitute for an account —
and the panel promises it in as many words. It is also why `joinLink` puts the
key in the URL *fragment*, `#sync=`: a fragment is the one part of an address a
browser never sends to the server, so a link that carries the key past a QR
code still does not hand it over. Moving it to a query string would.

**The merge has to stay commutative, associative and idempotent.** That is what
lets two devices converge instead of handing each other their own copy forever:
a sync is read, merge, write, and the next sync on the other device has to
settle rather than reopen it. `lib/sync.test.ts` asserts all three. A rule that
prefers "this device" over "the other one", or that writes a timestamp during
the merge, breaks convergence while looking correct in a single test.

**A write names the version it read.** `syncStore.ts` compares and sets in one
Redis script, so two devices writing at once cannot both win; the loser reads,
merges again and retries. Version 0 means nothing is stored, which is also how
a new key is checked for a holder. Replacing that with a plain `SET` loses a
device's session silently.

## Storage

`localStorage`, six keys, each wrapped in a version envelope:

- `decks:custom` — `{ version: 1, decks: Deck[], deleted? }`. `deleted` is when
  each deleted deck went, by slug, so sync can carry a deletion to the other
  devices; each imported deck carries `added` for the same reason. Both arrived
  inside version 1
- `progress` — `{ version: 4, cards }`, keyed by `{deckSlug}:{cardId}`
- `prefs:index` — `{ version: 4, showBuiltIns, hiddenDecks, scheduled }`
- `prefs:reviewer` — `{ version: 1, colorKeyShown, firstInterval }`: whether the
  color key beside the strip has opened by itself yet, and the interval the
  schedule is counted in, in hours (1, 2, 4, 8, or 24 for a day, the default):
  box 1 waits one of it, box 2 two, box 3 three, box 4 four. Its own key
  because the reviewer reads both and `prefs:index` is what the index acts on,
  even though the interval is set at the foot of the index; see
  `lib/reviewerPrefs.ts`
- `llm:key` — `{ version: 2, provider, keys, models, hidden }`: the deck
  writer's chosen provider, and a key, a model and the models hidden as unusable
  for each of Claude, OpenAI and Gemini. Version 1 held one Anthropic key and
  migrates in. Never sent anywhere but the provider it belongs to; see
  `lib/apiKey.ts`
- `sync` — `{ version: 1, key, id, secret, v, syncedAt }`, present only while
  this device syncs: the key itself, so the panel can show it and its QR code,
  and what it stretches into, so a page load skips the stretching. See
  `lib/sync.ts`

Version 1 of `prefs:index` held `showBuiltIns` alone and version 2 added
`hiddenDecks`. Each reads as the version after it with the new field at its
default — the defaults are the migration, so there is nothing to write back.
Version 4 is where `scheduled` became on by default, and it is the one place
the defaults are not enough: every version 3 store holds a `scheduled`, since
saving any preference wrote all three, so a version 3 `false` may never have
been a choice. It reads as the new default. From version 4 a stored `false` is
kept. `lib/prefs.test.ts` covers it.

`scheduled` is the mode, at the foot of the index and **on by default**: spaced
repetition is the app, and free study is what you switch to. It started off,
while the scheduled reviewer was new; it flipped on September 13, 2026, once it
had been lived with. It is a bar of two segments, free study then spaced
repetition, with the current one filled in the color of the mark in the header —
the mark's cream, or the free study sage. Both modes on show is what lets the
labels name the modes themselves; the button it replaced named the mode it moved
*to*, with an arrow, since a bare "Free study" would have read as the mode you
were in. The sun on the index says the same thing a third time, the mark's cream
against a faint sage (`--color-sun-free`). Every other page says it in its
ground: in free study the study pages, the import screen and the print pages
are `--color-sun-free` rather than the paper, and the logo is the sage one on
every page. The index keeps the paper, because its rays are that color and
would disappear on it. Pages with no mode of their own take the saved one,
before paint from the script in `app/layout.tsx` and on a client navigation
from `useStoredMode`. It governs what the *index* draws and what it writes
into its own study links; what the reviewer reads is `?scheduled` in the URL,
never the preference. The two are separate on purpose: a link then says which
reviewer it opens and a bookmark cannot change under the reader, and scrapping
the experiment deletes a path rather than restoring a deleted one. See
`lib/studyMode.ts`.

`/study/all?scheduled` deals only what is due across its decks — `buildDueQueue`
in `lib/queue.ts` — and no new cards: every deck's new pool one after another is
the whole library in file order, which is neither a day's review nor
interleaved. New cards are met in a deck of their own. That is also why the
index's due counts leave new cards out, so the "Everything" card's count is what
the session deals.

A card's record is `{ draft, grade, box, misses, due, dueAt?, reviewed, seen,
updatedAt?, scheduledAt? }`.
`box`, `misses`, `due` and `reviewed` mean nothing while `seen` is false — a card
written on but never graded has no place in the schedule — and `seen` is the
authority on that rather than a sentinel box or an empty date.

**`due` is a day, and `dueAt` is the exception.** At the default interval days
are what the schedule thinks in: a card answered at eleven at night comes back in
the morning. When the interval is set shorter than a day, every scheduled answer
also writes `dueAt`, an ISO time counted from the answer — the box's step times
the interval, so 8, 16, 24 or 32 hours at eight — and `due` holds the day that
time falls on. An answer at a day takes it off. Until September 16, 2026 the
interval moved box 1 alone and only box 1 carried a time; see `FIRST_INTERVALS`
in `lib/schedule.ts` for why it changed. A card graded before then keeps the day
it was given until it is answered again.
`isDue` compares the time when there is one; the queue still groups by `due`, so
the shuffle within a day survives. A session reads the clock once when it is
dealt, so a card answered in a session never comes back into it, however short
the interval — see `comesBack` in `lib/schedule.ts` and `buildDueQueue`.
`dueAt` arrived inside version 4, like `misses`.

**Free study never touches the schedule.** One store and one record per card,
but two kinds of field. `grade` is the last answer, "held" or "review", and is
what free study's green and red read. The schedule fields — `box`, `misses`,
`due`, `reviewed`, `seen` — are written only by an answer in a scheduled
session. Grading with the switch off, or after "Study anyway" or "Study the
whole deck", writes `grade` and nothing else, so studying outside the schedule
cannot climb a deck to green in one sitting or change what tomorrow deals.
A scheduled answer writes both, so `grade` is always the latest answer from
either mode, and so is `draft`: there is one answer text per card, and
whichever mode wrote last wins. All of this lives in `applyGrade` in
`lib/progress.ts`. Before task 4 was finished, the free study reviewer wrote
boxes too, since task 2; that history is in the boxes and cannot be separated
out. `grade` arrived inside version 4 like `misses` and is read off the box
when absent — box 1 is "review", anything above is "held" — which is exactly
what that box meant while free study was still writing it.

`box` and `misses` are two different things and neither derives the other. The
box is how far a card has climbed, sets when it comes back, and is what a
scheduled strip colors by: red, orange, yellow, green for boxes 1 to 4.
`misses` is how many times running it has been answered wrong. A wrong answer
always sends a card to box 1, so the box cannot tell one miss from five.

**`misses` is written and not read**, like `reviewed`. The strip colored by it
for a while, which turned a card green on its first right answer and let a whole
deck go green in one pass; it went back to the box. The count stays because it
cannot be rebuilt once it stops being recorded, and it is what finding the cards
you keep failing would need. `misses` was added inside version 4 rather than as version
5: a missing count reads as 1 in box 1 and 0 above it, and bumping the envelope
would have sent every version 4 store down the path for older shapes, which
reduces a record to a verdict and loses its box.

Version 3 held two parallel maps,
`drafts` and `grades`; a grade was a verdict, a record is a schedule, and the
two halves of a card's history cannot be kept in step when they are stored
apart.

**`reviewed` is written and never read.** It is the one field that cannot be
backfilled later: nothing else records *when* a review happened, and `due` is
no substitute, since a box-4 card reviewed yesterday carries a later `due`
than a box-1 card done this morning. It is empty on every record migrated
from an older store, because those stores never knew.

**`updatedAt` and `scheduledAt` are what sync settles a card by.** Both are ISO
times. `updatedAt` moves when the draft or the grade changes, in either mode;
`scheduledAt` only on a scheduled answer. A merge takes the draft and grade from
the later `updatedAt` and the schedule fields from the later `scheduledAt`, so a
free study answer on one device cannot carry an older box over a scheduled
answer on another — the same line free study never crosses locally. A draft
committed unchanged is not stamped (`withDraft`), or every card passed over
would read as edited just now. Both arrived inside version 4, like `dueAt`, and
a record without them ties at "never" and falls back on the migration rules:
the longer draft, review over held. See `lib/syncMerge.ts` and its tests.

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
index. That default is also what the server prerenders.

**Nothing storage-dependent is painted before storage is read.** The server
cannot see the preferences, the imported decks or the address's `?scheduled`,
so its frame is the defaults: on the index no built-in decks, "No decks yet"
and the default mode and interval; on a scheduled study page the free study
reviewer, with card 1, Shuffle and the whole deck's strip. Both used to show
for a moment on every reload and then be replaced. The pre-paint script in
`app/layout.tsx` now sets `data-mode` on both routes, from the address on a
study page and from `prefs:index` on the index, and marks the index
`data-index-pending`. CSS keeps the index's content, and a scheduled page's
`data-pending` reviewer, out of sight until the client has what it needs:
`DeckIndex` takes the index's mark off once the preferences and imported decks
are read, and a dealt session carries no `data-pending`. The storage hooks read
in layout effects, so a client navigation, which the script does not see, has
the reader's values before its first paint too. Everything is keyed off
attributes only a script sets, so with scripts off the prerendered page stays
visible, and the index's mark comes off after two seconds regardless. The cost
is a blank index or card area until hydration, a few hundred milliseconds,
rather than the wrong one. See `app/globals.css`.

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
- American English everywhere: UI copy, what the app sends to Claude, card
  content in `content/`, code, comments and these docs. "Color", "recognize",
  "behavior", "a fraction of a cent", "two weeks" rather than "a fortnight", and
  dates as "September 13, 2026"
- Copy names what happens: "Turn card over", not "Submit"
- Tap targets at least 44px where the pointer is a finger, and 36px where it is
  a mouse or trackpad, which does not need the room: `min-h-11
  pointer-fine:min-h-9`. `pointer-fine` reads the primary pointer, so a
  touchscreen laptop gets the mouse size. A control with vertical padding trims
  it with a mouse too (`pointer-fine:py-1.5`), or its line and border hold it at
  38px. Press areas nobody sees — the color key's "?" and close, a segment bar's
  stretched label — stay 44px, since shrinking them changes nothing on screen.
  The answer box uses 16px text on mobile so iOS doesn't zoom on focus
- Colors come from the Tailwind theme in `globals.css`, never hardcoded hex in
  components, except deck tints which are data
- The shell is `max-w-3xl` up to 1300px and 75% of the viewport past it. The
  extra width becomes more columns — `.deck-grid` goes 2, 3, 4, 5 — never wider
  cards, because a deck card stretched to 600px stops reading as a card. Study
  and the import screen set `max-w-3xl` of their own: a flip card the width of
  the window no longer matches the printed one, and prose wants a line length
- `prefers-reduced-motion` is respected by the card flip; keep it that way
- Focus rings are 1px, not the usual 2px, by choice, and all one color:
  `--color-focus`, `#5f5e5a`, a softer black than the text. A base-layer rule
  draws it on links and anything without a ring of its own; controls that draw
  their own use `focus-visible:outline-1 focus-visible:outline-focus`, never
  `outline-ink`. A text link's ring is drawn around its words, 3px above and
  below and 5px to the sides; a plain text button matches it by wrapping its
  words in `.ring-words`, since a ring on the button would be a rectangle the
  height of its 44px press area. A deck card's main link has no ring: its dashed
  edge turns the focus color instead. Never leave a focusable element with no
  visible ring
- A keyboard press that takes away what had focus moves focus on, never to the
  body: a card turned or graded, a deck card hidden or deleted, a panel's button
  that removes its panel. Only for the keyboard, which a click event reports as
  `detail === 0`: on a phone, focusing the answer box would open the keyboard.
  See `focusNext` in `Reviewer.tsx` and `lib/focus.ts`
- Errors are specific and actionable, and never blame the user

## Before committing

- `pnpm run build` passes
- `pnpm run lint` passes
- `pnpm run test` passes
- Anything touching print geometry has been printed and physically checked
- One task per commit
