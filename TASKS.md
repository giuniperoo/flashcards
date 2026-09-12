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
  *(shortened at task 4 to four boxes of 1/2/4/7 days — a fortnight is outside
  the horizon of interview preparation, and the long tail was buying load
  relief rather than memory. See `lib/schedule.ts`.)*
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

**Why.** The largest change, and it is structural: a session becomes today's queue
and it *ends*. Without that, the reviewer keeps grinding past the due cards into ones
you know cold, which is the waste spaced repetition exists to remove — and this app
taxes it harder than most, because every card costs a typed answer.

**Scheduling is a mode, and it is off by default.** The app as it stands is the one
that keeps working: the whole-deck reviewer, its shuffle button and its two-colour
strip are what `/study/{slug}` opens until somebody asks for the other reviewer, and
what it goes back to when they stop asking. Everything below lands beside today's
reviewer rather than on top of it.

The reason is that nobody has yet lived with a scheduled session in this app, and
whether this should *present* as a spaced repetition app is not a question the code
should answer on its own. The switch is what buys the fortnight needed to answer it,
and it is the escape hatch as well: scrapping the experiment deletes a path rather
than restoring a deleted one.

**Do**

- `lib/studyMode.ts`: the parameter, and reading it off `window.location`. Same
  technique and the same reason as `ShuffledSet` — `useSearchParams` on a prerendered
  route needs a Suspense boundary, and a boundary around a reviewer left the whole
  subtree unhydrated
- `/study/{slug}?scheduled` opens what is due. `/study/{slug}` opens the deck, the way
  it does today. No parameter, no scheduling — a bookmark somebody already has cannot
  change what it opens under them
- `prefs:index` goes to version 3 with a `scheduled` boolean, default false. A stored
  version 2 reads as a version 3 with it off, so the defaults are the migration and
  there is nothing to write back, exactly as version 1 already does
- The switch sits in the row at the foot of the index that already holds "Add your own
  deck" and the built-in deck controls. Each label names the mode it moves to: "Study
  on a schedule", and "Study whole decks" to come back
- The index writes the parameter into its own study links while the switch is on, the
  way it already writes `?deck=a,b,c` into the shuffled card's. The preference is what
  the index writes with; the parameter is what the reviewer reads
- Cards leave the queue as they are graded rather than a cursor advancing over a fixed
  array
- A done state when the queue empties: what moved up, what went back to box 1, when the
  deck returns. It is also the right home for a deck-wide box map, which the strip stops
  showing (see below)
- Nothing due opens "Study anyway", which deals the whole deck. No separate mode —
  grading there still schedules normally
- **No shuffle control in a scheduled session.** You only ever see one card, so
  reordering the ones you have not reached is unobservable; the button only appears to
  do something today because it resets to position 0. "Study anyway" keeps it, because
  there is no schedule ordering those cards. With the switch off it never left
- The strip changes twice over inside a scheduled session, and both halves land here.
  It colours by box rather than by grade, in four named colours rather than a ramp:
  red is the card you just got wrong, green is the one you have earned a week off
  from, orange and yellow are the rungs between, and unseen stays `--color-rule`.
  The interpolated ramp between `--color-review` and `--color-held` was tried first
  and abandoned: five near-neighbour hues at a constant lightness are one colour at
  three pixels tall. And the strip holds today's queue rather than the deck, so it
  stops being a map and becomes a session progress bar — the right reading once
  `position` marks a place in a queue

**Done when** grading the last due card finishes the session instead of wrapping
around, `/study/{slug}` without the parameter is the reviewer it is today, and
`prefers-reduced-motion` still holds on the flip.

**Not here.** `/study/all` stays unscheduled: the cross-deck queue is task 6, and it
has a remount bug to fix before it can change size nightly. Due counts on the index are
task 5. Both sit behind the same switch when they arrive.

**Watch for.** The mode is read after mount, like `?deck=` before it, so a scheduled
session is assembled in the browser a frame after the page paints. That is already true
of everything the strip shows — progress is read in an effect — so there is nothing on
screen to take away. It stops being true the moment anything the *server* renders
depends on the mode, and at that point this stops being a parameter and starts being a
route.

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

**Behind the switch.** With scheduling off the label is the card count it has always
been. A due count is drawn by the index itself rather than by a route, which is the
second reason task 4's preference exists alongside its parameter — a URL cannot reach
a deck card.

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

**Behind the switch**, like tasks 4 and 5. With scheduling off the card is "Everything,
shuffled" and `/study/all` deals every card, unchanged. Print is not switched in either
mode: a sheet of paper has no idea what day it is, so `/print/all` keeps dealing the
whole set. Scheduling governs the session, not the paper.

**Watch for.** This queue has no goal filter — it draws from every deck holding a due
card. That is right until you are preparing for something specific and would rather not
meet CAP cards while drilling React. Hiding is the wrong instrument: `CLAUDE.md` is
explicit that hiding is about the index, and "not right now" is not "hidden". If it
starts to bite, the answer is the deferred "in rotation" scoping this queue, not a
change here.

---

### Task 7 — A first interval shorter than a day

**Why.** Box 1 is a day, and the day before an interview a day is too long. A card
you have just got wrong is the one you most want back this afternoon, and the ladder
has no rung below tomorrow. One setting, from an hour to a day, and it moves box 1
alone — the rungs above it are already inside the horizon and the morning is the
right time for all of them.

**Do**

- A choice, not a slider: 1, 2, 4, 8 hours or a day. The difference between five
  hours and six is noise, and a control with twenty-four positions invites the reader
  to tune something that does not repay tuning
- Its own key, `prefs:schedule`, `{ version: 1, firstInterval }` in hours, default 24.
  Not `prefs:index`: the reviewer is what reads this, and `lib/prefs.ts` says in its
  first paragraph what that key is for. `scheduled` lives there because the *index*
  acts on it
- The control sits beside the schedule switch at the foot of the index, and only
  while scheduling is on. Off, it governs nothing and should not be on the page

**The representation is the whole task.** `due` is a local `YYYY-MM-DD` string, and
that is argued for twice — in `lib/schedule.ts` and in `CLAUDE.md` — on the grounds
that a card graded at eleven at night should come back in the morning rather than at
eleven the following night. An hour cannot be said in a day key. Two ways out:

1. **Timestamps throughout.** One model, and the largest blast radius: the migration,
   `isDue`'s string compare, the queue's grouping, and every line of copy that says
   "Thursday". It also brings the eleven o'clock problem back for every box.
2. **A day key, plus a `dueAt` that only box 1 carries.** `isDue` reads `dueAt` when
   it is there and `due` when it is not. Boxes 2 to 4 keep the morning and keep their
   argument intact. Box 1 is the one rung where "back in three hours" is what the
   reader actually meant.

Take the second. The first is tidier on paper and reverses a decision that was right
for four of the five cases.

**Watch for.**

**A card graded in this session must not return in this session**, however short the
interval. The reviewer reads the day once, on mount, so cards cannot move under the
reader mid-deck; an hourly interval breaks that assumption in a new way rather than an
old one. Re-dealing a card somebody answered twenty minutes ago is not review, it is
the same answer twice. So the queue is still built once and the short interval means
"the next session", not "this one".

**The queue's tiebreak disappears if you are not careful.** `buildQueue` groups by
`record.due` and shuffles inside each group, which is what stops a deck coming back in
the order it was last studied. Timestamps at minute resolution make every group one
card long, and the shuffle silently stops existing. Group box 1 cards by the day they
fall on even when they carry a `dueAt`.

**The copy has no sub-day vocabulary.** "ACID comes back tomorrow" and "Nothing due
today" are both wrong when the deck returns at four o'clock. `returnsIn` needs an
hours branch, and the nothing-due panel needs to stop claiming the day.

**Done when** a card graded wrong with the setting at three hours comes back three
hours later rather than the next morning, a card graded right still comes back in the
morning, and `pnpm run test:schedule` covers both under a fixed timezone.

**Not this.** A duration per deck. One setting for the app: the reader has one
interview horizon at a time, not twelve.

---

### Task 8 — An empty box when a card comes back

**Why.** When a card returns, the answer you wrote last time is already sitting in
the box. You read it instead of recalling it. That is the one thing this app exists
to stop.

The draft is there for a good reason, though. Write half an answer, move on, come
back to it in the same sitting, and you want your text where you left it. So the rule
is about *returning*, not about drafts in general: keep the draft inside a session,
clear it when the card comes back in a later one.

**Do**

- The box starts empty when the card has been graded since the draft was written.
  `reviewed` already records the day of the last grade, so the reviewer can tell
- Inside one session the draft behaves as it does now
- The old answer is not thrown away. Show it on the back of the card, under the one
  you just wrote, so you can see whether this attempt was better
- That means the record keeps two drafts rather than one: this attempt and the last.
  Two is enough. A full history is a different feature and nobody asked for it
- The setting goes beside the schedule switch at the foot of the index

**Consider not having a setting.** Showing the old answer on a returning card is
straightforwardly against the rule the app is built on, and a default nobody should
want is usually a default that should not exist. If it ships as a setting, it ships
switched to empty.

**Done when** a card graded yesterday opens with an empty box, a card you half
answered ten minutes ago still has your text, and the back of the card shows both
attempts.

---

### Task 9 — Say what the colours mean, once

**Why.** The strip is four colours and a grey and nothing on screen says what any of
them mean. A reader who answers a new card correctly, sees orange, and expects green
concludes the app is broken. That is not hypothetical — it is how this task got
written.

**Not a popup on first load.** At that point the reader has never seen a strip, so it
explains a thing they have not met, and there is no other modal anywhere in this app.
Show it when they press "Study on a schedule": that is the moment they opt into the
thing that needs explaining, and the only moment the explanation is certainly wanted.
Leave a "How does this work?" link beside the switch so it can be read again, and
never show it unasked twice — `prefs:index` remembers.

**Do**

- A panel, in the app's own language: the card shape, a real strip rather than a
  description of one, sentence case, no exclamation marks
- The four colours are shown as dashes at the size they actually appear, each labelled
  with what puts a card there. A legend of swatches at 3px is the thing being
  explained, so it should not be redrawn larger and differently
- Dismissing it starts the session. It is not a gate in front of the deck

**The copy, corrected.** Two things in the first draft were wrong, and both matter:

> **How this works**
>
> Every card sits on a ladder of four rungs, and its colour on the strip is the rung.
>
> - grey — not answered yet
> - red — you marked it "Needs review"
> - orange — one right answer
> - yellow — two right answers in a row
> - green — three right answers in a row
>
> One wrong answer sends a card back to red from wherever it had got to. So green
> means three in a row, not three in total.
>
> The rung also sets when the card comes back: red tomorrow, orange in two days,
> yellow in four, green in a week.
>
> Nobody is checking your answers but you.

**What changed from the draft.** "Answer each question 3 times correctly" became
"three times in a row", because a wrong answer drops a card to red from any rung, and
that is the whole of the ladder. And the interval paragraph came out: it described
task 7, which is not built, and said the wait is a day, which is true only of red.

**When task 7 lands**, this panel gains a line about the setting, saying plainly that
it moves the red rung and nothing else.

**Done when** turning the switch on shows it once and never again unasked, the link
beside the switch brings it back, and the dashes in it are the same three pixels tall
as the ones in the reviewer.

---

### Task 10 — Docs

Three documents describe a world without scheduling and stop being true at task 4.

- `CLAUDE.md` — the Storage section: `decks:custom`, `prefs:index` at version 3,
  `progress` at version 4, and `prefs:schedule` once task 7 lands, which is four keys
  rather than the three that section is written around. While in there: "What this is"
  still says five built-in decks and 80 cards, and there are twelve and 264, and it
  still describes a ladder of five boxes running to sixteen days
- `ARCHITECTURE.md` §8 — progress now carries a schedule; rotation is deferred, and
  the build order in §9 lists it as step 4, so both say so
- `ARCHITECTURE.md` §10 — retitled. It is not a Safari quirk: WebKit's seven-day timer,
  DuckDuckGo's Fire Button (its browser wraps WebKit on macOS and iOS, so it inherits
  the timer *and* adds the button), clear-on-exit settings, private windows and
  Chromium's quota eviction are all one class — `localStorage` is not durable storage

---

## Miscellaneous

Independent of the above and of each other.

### Task 11 — Import hardening

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

### Task 12 — Housekeeping

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
