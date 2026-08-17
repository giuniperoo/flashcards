# Tasks

One task per commit, in this order. Each is independently useful and leaves the
app working. Read `CLAUDE.md` first.

Scope for this round is a personal deployment: local decks plus committed
markdown decks. Accounts, publishing and moderation are out — see
`ARCHITECTURE.md` for why they're deferred.

---

## Task 1 — Stable card ids

**Why now.** Progress is keyed by array index. Inserting a card at position 3
silently reassigns every later card's history. Editing decks is about to become
routine (task 2), so this has to land first, while there's little study history
to migrate.

**Do**

- Add `id: string` to the `Card` type — a uuid, generated once at creation or
  import. Not a hash of the question text: a hash changes when you fix a typo,
  which is exactly when progress should survive
- Generate ids for the built-in decks and for decks created through `/new`
- Key `progress` by `{deckSlug}:{cardId}` instead of `{deckSlug}:{index}`
- Wrap both stores in a version envelope:

```ts
type ProgressStore = { version: 2; drafts: Record<string, string>;
                       grades: Record<string, Grade> };
type CustomDeckStore = { version: 1; decks: Deck[] };
```

- Migrate on read: a bare array or an unversioned progress object is version 1;
  rewrite index keys to the card id at that index, then persist the new shape
- Migration runs once and is idempotent

**Done when** existing progress survives the upgrade, a card inserted mid-deck
leaves later cards' grades intact, and `npm run build` passes.

---

## Task 2 — Decks as markdown in `content/`

**Why.** This is the feature that makes the deployment worth having: decks in the
repo are available on every device, versioned in git, and diffable when you
revise a card. It also collapses two code paths into one parser.

**Do**

- Create `content/` with one `.md` per deck, in the `Q:` / `A:` format
  `lib/parseDeck.ts` already accepts, with front matter for title, tint, blurb
- Convert the five built-in decks into that folder. Content must match the
  current `lib/decks.ts` exactly — these decks mirror printed cards and must not
  drift. Generate the files from the existing data rather than retyping
- Add `lib/loadDecks.ts` reading the folder at build time with `node:fs` and
  `parseDeck`. Server-only; never imported into a client component
- Delete `lib/decks.ts` and `scripts/generate-decks.py`
- Move `scripts/extract-cards.py` to `tools/` with a comment explaining it was a
  one-off migration from the printed PDFs and isn't part of the build
- Fail the build loudly on an unparseable file — a silently missing deck is worse
  than a broken build

**Done when** all five decks render identically to before, adding a `.md` file
produces a new deck with no other change, and the repo has no Python in its build
path.

**Watch for.** `Deck` is imported by client components. Keep the type in a
module free of `node:fs` imports, or the client bundle will break.

---

## Task 3 — In rotation

**Why.** With decks synced across devices, the index becomes a list you scroll
past. Rotation is the set you're drilling this fortnight.

The name matters: **"in rotation", not "favourites"**. Favourites only
accumulate, because removing one reads as rejecting it. Rotation is expected to
turn over, so "remove from rotation" is ordinary housekeeping.

**Do**

- Store rotation in `localStorage` as an array of deck slugs, versioned envelope
  as in task 1
- Add/remove control on every deck card, and an "In rotation" section at the top
  of the index
- A study route across everything in rotation, shuffled and interleaved. Reuse
  the `/study/all` mechanism, scoped to the rotation set
- If rotation is empty, show nothing rather than an empty-state box

**Done when** rotation survives a reload, and studying it interleaves cards from
several decks.

**Note.** Interleaving decks is better practice than drilling one at a time, so
make the rotation route the prominent one on the index.

---

## Task 4 — Import hardening

Small fixes to the import path, now that it's the main way decks get created.

**Do**

- Either test `.rtf` against the editors you actually use, or drop `.rtf` from
  the accept list. Current handling is regex-based and only reliable on TextEdit
  output. Silently mangling a file is worse than refusing it
- Warn, without blocking, when a deck isn't a multiple of eight, explaining that
  the last printed sheet will have blank cells
- Warn when an answer runs past roughly 300 characters — it will overflow a
  printed card
- Add an "export all decks" button producing a zip, so local decks can be
  promoted into `content/` by hand

**Done when** the importer's warnings tell you about print problems before you
print, and `npm run test:parser` still passes.

---

## Task 5 — Housekeeping

- Add a `not-found.tsx` matching the app's visual language
- Add `metadata` per route (deck name in the title, so browser tabs are useful)
- Consider `next/dynamic` for `PrintSheets` — it's only needed on print routes
  and currently sits in the shared bundle
- Check the reviewer with a screen reader once; the live regions were written
  correctly but never tested with one

---

## Not now

Do not start on accounts, databases, publishing, forking, moderation, copyright
terms or billing. They're designed in `ARCHITECTURE.md` and belong to a later
session with its own branch. If a task above seems to require one of them, the
task has been misread — stop and ask.
