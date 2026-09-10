# Tasks

One task per commit. Each is independently useful and leaves the app working.
Read `CLAUDE.md` first.

The spaced repetition tasks run in the order given — each depends on the one
before it. The miscellaneous tasks don't, and can land whenever.

Scope for this round is a personal deployment: local decks plus committed
markdown decks. Accounts, publishing and moderation are out — see
`ARCHITECTURE.md` for why they're deferred.

---

## Spaced repetition

Leitner boxes over the grading the reviewer already collects. Intervals stop
being a sort key and start governing the session: a study session becomes what
is due today, and it ends.

### Task 1 — One progress store

**Why now.** `cardKey()` is already `{deckSlug}:{cardId}` — unique across the whole
app on its own. The store it lands in is chosen by route, so the same key exists
twice with two different values: `progress:all` from the shuffle, `progress:{slug}`
from the deck. Nothing reconciles them. Today that shows up as a draft you wrote an
hour ago reading as empty on the other route, and two tallies that disagree. Tasks 2
onwards put a schedule in that store, and two schedules for one card is not a wart.

**Do**

- Collapse every `progress:*` key into one `progress`, keyed `{deckSlug}:{cardId}`.
  No suffix — the suffix in `progress:{slug}` *was* the partition, and keeping one
  implies a sibling store that is not coming
- Version 3 envelope. Migrate on read as v1 → v2 already does, merging every legacy
  key it finds. Persist once, idempotent
- Conflict rule: **review beats held.** V2 carries no timestamps, so the tiebreak has
  to be arbitrary; being wrong this way costs one extra review, being wrong the other
  way loses the card
- Deck deletion in `lib/customDecks.ts` drops a key *prefix*, not a key
- Call `navigator.storage.persist()` where the store is first read. Chromium may grant
  it; WebKit will probably ignore it. It earns its place by having no interface

**Done when** the tally on `/study/all` and the tally on `/study/{slug}` agree for the
same card, and `pnpm run test:progress` covers the merge.

---

### Task 2 — Boxes and due dates

**Why.** Leitner, not SM-2 or FSRS. It takes exactly the binary signal the reviewer
already collects, it is explainable in one sentence, and a box of dividers is a
physical object — which is the same claim the print route makes. FSRS wants a trained
model; 264 cards and one reader will never feed it.

**Do**

- The record becomes `{ draft, box, due, reviewed, seen }`. `due` and `reviewed` are
  local `YYYY-MM-DD` strings, not epoch ms — a card graded at 11pm should come back at
  6am, not at 11pm
- `lib/schedule.ts`: `nextBox(box, grade)`, `dueOn(box, today)`, `isDue(record, today)`.
  Boxes 1/2/4/8/16 days. Right promotes one box, wrong drops to box 1
- Grading writes a box and a date. `Grade` stays two buttons
- Migrate: `held` → box 2 due tomorrow, `review` → box 1 due today, ungraded → unseen

**Done when** grading a card sets a due date, and progress from task 1 migrates into
boxes without losing a card.

**Note.** Nothing on screen moves here. The strip keeps its two-colour verdict until
task 4, which is now where every visible change lives. That is deliberate: the data
can land without settling the interface question, and the interface change stays one
commit — one to compare against, and one to revert.

**Watch for.** `reviewed` is unused at this point and goes in anyway: it is what a
future sync needs to resolve a conflict, and the one field here that cannot be
backfilled, since nothing else records *when* a review happened. `due` is not a
substitute — a box-5 card reviewed a fortnight ago has a later `due` than a box-1 card
reviewed this morning.

---

### Task 3 — The queue builder

**Why.** This is where the difficulty actually is. The algorithm is short; what goes
subtly wrong is the interaction between a backlog and the unseen pool, and it only
shows up after a week of real use. Isolating it as a pure function turns that week
into test cases.

**Do**

- One function: `(cards, records, today) → ordered cards`. Overdue first, most overdue
  leading; random within a due day; unseen last, in deck order
- Nothing is trimmed. A backlog is debt already owed, and holding any of it back lets a
  missed week compound silently
- Nothing calls it yet

**Done when** its tests cover a backlog, a day with nothing due, and a deck where every
card is unseen.

**Note.** The shuffle survives here as the tiebreak *within* a due day, and only there.
Cards graded in one sitting share a due date, so without it they come back in the order
you did them — which is the serial dependency the shuffle existed to break.

**No daily intake cap, and this is the second time it has been considered.** The
original plan held new cards back at 10–15 a day so a fresh deck would enter the
schedule over several days rather than as one lump that then moves through the boxes
together. It does not survive contact with two facts.

A card enters the schedule when it is *graded*, not when it is dealt. An unseen card
offered and skipped, or written into and never turned over, stays unseen and comes
back as new. So intake is already bounded by what the reader chooses to do, and a cap
only bounds it by making that choice for them.

And a cap on this function is not a cap on a day. It is per call, so it multiplies by
however many decks are opened and however many times each is reopened, and it
contradicts `/study/all`, which calls the same function once and would get a single
allowance across every deck. Making it mean a day needs a *first seen* date on the
record, which the store does not keep — `reviewed` is the last review, and a card met
this morning is indistinguishable from one known for a month and got wrong.

If the lumping does bite after a few imports, bring it back with that field and not
without it.

---

### Task 4 — The reviewer studies the queue

**Why.** The largest change, and it is structural: a session becomes today's queue and
it *ends*. Without that, the reviewer keeps grinding past the due cards into ones you
know cold, which is the waste spaced repetition exists to remove — and this app taxes
it harder than most, because every card costs a typed answer.

**Do**

- `/study/{slug}` opens what is due, not the deck. Cards leave the queue as they are
  graded rather than a cursor advancing over a fixed array
- A done state when the queue empties: what moved up, what went back to box 1, when the
  deck returns. It is also the right home for a deck-wide box map, which the strip stops
  showing (see below)
- Nothing due opens "Study anyway", which deals the whole deck. No separate mode —
  grading there still schedules normally
- **No shuffle control in a scheduled session.** You only ever see one card, so
  reordering the ones you have not reached is unobservable; the button only appears to
  do something today because it resets to position 0. "Study anyway" keeps it, because
  there is no schedule ordering those cards
- The strip changes twice over, and both halves land here. It colours by box rather
  than by grade: five steps interpolated between `--color-review` and `--color-held`,
  so box 1 sits furthest forward and each box up recedes, which is the ordering
  `globals.css` already argues for; unseen stays `--color-rule`. And it holds today's
  queue rather than the deck, so it stops being a map and becomes a session progress
  bar — the right reading once `position` marks a place in a queue

**Done when** grading the last due card finishes the session instead of wrapping around,
and `prefers-reduced-motion` still holds on the flip.

---

### Task 5 — Due counts on the index

**Do**

- "32 cards · 14 due" in the count label already at the top of every deck card, the due
  number in the deck's ink. Not a badge — this app has no pills, and one shape for one
  number costs more than it says
- Counted client-side from the single store by slug prefix, against `DeckSummary.count`.
  No card ids need to reach the index
- A deck with nothing due shows the card count alone. No "0 due"

**Done when** the number on a deck card matches what that deck actually opens with.

---

### Task 6 — The cross-deck due queue

**Why.** A due queue across decks is interleaved for free — sort by date, tiebreak
randomly, never sort by deck. `ARCHITECTURE.md` §8 already argues this route should be
the prominent one.

**Do**

- `/study/all` draws what is due across decks rather than everything
- The "everything" card on the index says what it will deal: "Everything, due today",
  and a blurb naming the count and how many decks it spans
- Replace `key={visible.length}` in `ShuffledSet.tsx`. It is safe today only because the
  set size changes when preferences do; a due queue changes size nightly, and two
  different queues of the same length will not remount

**Done when** a day's cards from several decks interleave, and the queue changing size
overnight does not break hydration.

**Watch for.** This queue has no goal filter — it draws from every deck holding a due
card. That is right until you are preparing for something specific and would rather not
meet CAP cards while drilling React. Hiding is the wrong instrument: `CLAUDE.md` is
explicit that hiding is about the index, and "not right now" is not "hidden". If it
starts to bite, the answer is the deferred "in rotation" scoping this queue, not a
change here.

---

### Task 7 — Docs

Three documents describe a world without scheduling and stop being true at task 4.

- `CLAUDE.md` — the Storage section: three keys now, `decks:custom`, `prefs:index` and
  `progress`, the last at version 3. While in there: "What this is" still says five
  built-in decks and 80 cards, and there are twelve and 264
- `ARCHITECTURE.md` §8 — progress now carries a schedule; rotation is deferred, and
  the build order in §9 lists it as step 4, so both say so
- `ARCHITECTURE.md` §10 — retitled. It is not a Safari quirk: WebKit's seven-day timer,
  DuckDuckGo's Fire Button (its browser wraps WebKit on macOS and iOS, so it inherits
  the timer *and* adds the button), clear-on-exit settings, private windows and
  Chromium's quota eviction are all one class — `localStorage` is not durable storage

---

## Miscellaneous

Independent of the above and of each other.

### Task 8 — Import hardening

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
print, and `pnpm run test:parser` still passes.

---

### Task 9 — Housekeeping

- Add a `not-found.tsx` matching the app's visual language
- Add `metadata` per route (deck name in the title, so browser tabs are useful)
- Consider `next/dynamic` for `PrintSheets` — it's only needed on print routes
  and currently sits in the shared bundle
- Check the reviewer with a screen reader once; the live regions were written
  correctly but never tested with one

---

## Not now

**Progress export/import, or any control for saving progress.** Considered and
rejected: it only parses if you already know progress lives somewhere that can
vanish, so the control is the thing that teaches the reader the app forgets. The
footer row is placed deliberately and there is no settings screen to hide it in.
The honest fix is the `progress` table in `ARCHITECTURE.md` §3. Until then,
durability gets `navigator.storage.persist()` and nothing else. If the silent-loss
case needs answering sooner, report a wipe *after* it happens — a marker cookie
outliving script-writable storage tells you a store was cleared rather than never
written — and not a warning beforehand, which can only fire while the reader is
present, which is exactly when the timer has just reset.

**In rotation.** Deferred as premature — not dropped on the merits, and *not*
because the due queue replaces it. The two scope on different axes: rotation says
which decks you are working on, the due queue says which cards you owe today, and
the set worth studying is the intersection. Its original premise also still holds:
decks have been on every device since `content/` landed, and there are twelve of
them now rather than five.

The reason to wait is that you cannot tell whether the queue needs a goal filter
until you have lived with one that has none. Revive it when the due queue starts
serving cards from decks you do not currently care about — most likely the first
time you are preparing for something specific, since a schedule with no goal filter
fights a deadline. Designed in `ARCHITECTURE.md` §8.

Do not start on accounts, databases, publishing, forking, moderation, copyright
terms or billing. They're designed in `ARCHITECTURE.md` and belong to a later
session with its own branch. If a task above seems to require one of them, the
task has been misread — stop and ask.
