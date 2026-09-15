# Tasks

One task per commit. Each is independently useful and leaves the app working.
Read `CLAUDE.md` first.

The spaced repetition tasks mostly run in order. Tasks 1 to 4 each depend on
the one before. After that, 6 needs 5, and 7, 8 and 9 need only 4 — which is why
8 has already landed ahead of 5, and 10 needs only 4 as well. Docs, task 11, goes last. The miscellaneous
tasks depend on nothing and can land whenever.

Scope for this round is a personal deployment: local decks plus committed
markdown decks. Accounts, publishing and moderation are out — see
`ARCHITECTURE.md` for why they're deferred.

---

## Spaced repetition

Leitner boxes over the grading the reviewer already collects. Intervals stop
being a sort key and start governing the session: a study session becomes what
is due today, and it ends.

**Where it stands**

| Task | Status |
|---|---|
| 1 — One progress store | merged |
| 2 — Boxes and due dates | merged |
| 3 — The queue builder | merged |
| 4 — The reviewer studies the queue | merged |
| 5 — Due counts on the index | merged |
| 6 — The cross-deck due queue | merged |
| 7 — A first interval shorter than a day | built, in review |
| 8 — An empty box when a card comes back | merged |
| 9 — Say what the colors mean, once | merged |
| 10 — The queue bar | merged |
| 11 — Docs | not started |

**Spaced repetition is the default.** The switch at the foot of the index starts on,
and free study is what you turn to. The logo in the header shows which mode you are
in, on every page: a cream ground on a schedule, a muted sage in free study
(`public/logo-free.svg`, from `tools/wordmark.py`). On the index the sun's rays follow
it, cream or a sage of the same family, but kept nearly as faint as the cream, so the
logo is what carries the mode.

**The ladder as built.** Four boxes. A right answer moves a card up one box, a wrong
answer sends it to box 1. On a schedule the strip colors each card by its box:

| Box | Color | Means | Comes back in |
|---|---|---|---|
| — | gray | not answered yet | — |
| 1 | red | wrong last time | 1 day |
| 2 | orange | one right in a row | 2 days |
| 3 | yellow | two right in a row | 3 days |
| 4 | green | three or more right in a row | 4 days |

With the switch off, the strip is two colors: green for a card last answered right,
red for one last answered wrong. **Studying with the switch off never moves the
schedule** — no box, date or miss count changes — so only a scheduled session can turn
a card green.

---

### Task 1 — One progress store

*Merged.*

**Why now.** `cardKey()` is already `{deckSlug}:{cardId}` — unique across the whole
app on its own. The store it lands in is chosen by route, so the same key exists
twice with two different values: `progress:all` from the shuffle, `progress:{slug}`
from the deck. Nothing reconciles them. Today that shows up as a draft you wrote an
hour ago reading as empty on the other route, and two tallies that disagree. Tasks 2
onward put a schedule in that store, and two schedules for one card is not a wart.

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

*Merged.*

**Why.** Leitner, not SM-2 or FSRS. It takes exactly the binary signal the reviewer
already collects, it is explainable in one sentence, and a box of dividers is a
physical object — which is the same claim the print route makes. FSRS wants a trained
model; 264 cards and one reader will never feed it.

**Do**

- The record becomes `{ draft, box, due, reviewed, seen }`. `due` and `reviewed` are
  local `YYYY-MM-DD` strings, not epoch ms — a card graded at 11pm should come back at
  6am, not at 11pm *(task 4 added `misses`, the count of wrong answers in a row. It is
  written and not read; see `CardProgress` in `lib/progress.ts`.)*
- `lib/schedule.ts`: `nextBox(box, grade)`, `dueOn(box, today)`, `isDue(record, today)`.
  Boxes 1/2/4/8/16 days. Right promotes one box, wrong drops to box 1
  *(shortened at task 4 to four boxes of 1/2/3/4 days, in even steps — two weeks is outside the horizon of interview preparation, and doubling gaps
  put a deck with a few stubborn cards most of a month out. See
  `lib/schedule.ts`.)*
- Grading writes a box and a date. `Grade` stays two buttons *(since task 4, only an
  answer in a scheduled session does; free study records the answer and nothing else)*
- Migrate: `held` → box 2 due tomorrow, `review` → box 1 due today, ungraded → unseen

**Done when** grading a card sets a due date, and progress from task 1 migrates into
boxes without losing a card.

**Note.** Nothing on screen moves here. The strip keeps its two-color verdict until
task 4, which is now where every visible change lives. That is deliberate: the data
can land without settling the interface question, and the interface change stays one
commit — one to compare against, and one to revert.

**Watch for.** `reviewed` is unused at this point and goes in anyway: it is what a
future sync needs to resolve a conflict, and the one field here that cannot be
backfilled, since nothing else records *when* a review happened. `due` is not a
substitute — a box-4 card reviewed two days ago has a later `due` than a box-1 card
reviewed this morning.

---

### Task 3 — The queue builder

*Merged.*

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

*Merged, in #21, with free study kept off the schedule in #22.*

**Why.** The largest change, and it is structural: a session becomes today's queue
and it *ends*. Without that, the reviewer keeps grinding past the due cards into ones
you know cold, which is the waste spaced repetition exists to remove — and this app
taxes it harder than most, because every card costs a typed answer.

*(Since September 13 the default is the other way around: spaced repetition is on
unless you choose free study. What follows is why it started off.)*

**Scheduling is a mode, and it is off by default.** The app as it stands is the one
that keeps working: the whole-deck reviewer, its shuffle button and its two-color
strip are what `/study/{slug}` opens until somebody asks for the other reviewer, and
what it goes back to when they stop asking. Everything below lands beside today's
reviewer rather than on top of it.

The reason is that nobody has yet lived with a scheduled session in this app, and
whether this should *present* as a spaced repetition app is not a question the code
should answer on its own. The switch is what buys the two weeks needed to answer it,
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
  on a schedule", and "Study whole decks" to come back *(now "Spaced repetition →" and
  "Free study →", the arrow saying it is a destination rather than the current mode)*
- The index writes the parameter into its own study links while the switch is on, the
  way it already writes `?deck=a,b,c` into the shuffled card's. The preference is what
  the index writes with; the parameter is what the reviewer reads
- Cards leave the queue as they are graded rather than a cursor advancing over a fixed
  array
- A done state when the queue empties: how many you got right and how many need review,
  in the buttons' own words, and when the deck comes back. It is also the right home for
  a map of the whole deck by box, which the strip stops showing (see below). Its button
  reads "Study the whole deck", because that is what it deals
- Nothing due opens "Study anyway". It and "Study the whole deck" both step out into
  free study: the parameter comes off the address, the shuffle comes back, and nothing
  graded from there moves the schedule. The plan first had grading there reschedule
  normally, which let a reader press "Study anyway" again and again and climb a whole
  deck to green in one afternoon
- **No shuffle control in a scheduled session.** You only ever see one card, so
  reordering the ones you have not reached is unobservable; the button only appears to
  do something today because it resets to position 0. "Study anyway" keeps it, because
  there is no schedule ordering those cards. With the switch off it never left
- The strip changes twice over inside a scheduled session, and both halves land here.
  It colors by box rather than by grade, in four named colors: red for box 1, then
  orange, yellow, and green at the top, so green means three right in a row; unseen
  stays `--color-rule`. Two other versions were tried. A ramp between
  `--color-review` and `--color-held` was five near-neighbor hues at one lightness,
  which is one color at three pixels tall. Coloring by misses turned a card green on
  its first right answer, so a deck could go all green in one pass — recognition
  passing for knowledge, which is what the app is built against. The miss count it
  needed is still written. And the strip holds today's queue rather than the deck, so
  it stops being a map and becomes a session progress bar — the right reading once
  `position` marks a place in a queue

**Done when** grading the last due card finishes the session instead of wrapping
around, `/study/{slug}` without the parameter is the reviewer it is today, and
`prefers-reduced-motion` still holds on the flip.

**Not here.** `/study/all` stays unscheduled: the cross-deck queue is task 6, and it
has a remount bug to fix before it can change size nightly. Due counts on the index are
task 5. Both sit behind the same switch when they arrive.

**Also landed with this task.** Fixes and changes that came up while living with task 4:

- **Free study no longer writes the schedule.** Since task 2, grading with the switch
  off moved boxes and due dates, so the two modes were not in fact separate. Now it
  writes only the answer, in a new `grade` field that free study's colors read. There
  is still one store and one answer text per card. See `applyGrade` in
  `lib/progress.ts`
- The ladder went to four boxes of 1, 2, 3 and 4 days (see task 2)
- Grading from the keyboard works after Cmd+Enter. The answer box used to keep focus
  once the card had turned, so 1 and 2 were typed into the hidden answer instead of
  grading. The turned-away face is now `inert`
- On a phone the card being studied fits the screen, so "Turn card over" needs no
  scrolling. The card takes the height that is left rather than a fixed 484px, and the
  grading buttons sit side by side at every width. Checked in a desktop browser at
  phone sizes only — see task 13
- The whole-deck strip is green and red, the same green and red as the scheduled strip
- On the index: Delete no longer gets cut off on a narrow imported deck card, and the
  schedule switch has no underline when it is on, since its label names the mode it
  moves to rather than the one you are in
- The card label says where you are in the deck: "Kafka · card 7 of 32". The count is
  the card's own deck, so on the shuffled set a card still reads as its place in the
  deck it came from rather than in the session

**Watch for.** The mode is read after mount, like `?deck=` before it, so a scheduled
session is assembled in the browser a frame after the page paints. That is already true
of everything the strip shows — progress is read in an effect — so there is nothing on
screen to take away. It stops being true the moment anything the *server* renders
depends on the mode, and at that point this stops being a parameter and starts being a
route.

---

### Task 5 — Due counts on the index

*Merged, in #28.*

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

**As built.** `dueByDeck` in `lib/queue.ts` counts the records, read through
`lib/useDueCounts.ts`, on the built-in and the imported deck cards alike. The shuffled
card has no count yet; what it deals on a schedule is task 6.

- **Due means due, not new.** The count is the overdue and due today cards, the same
  two the queue bar shows, and not the new ones the session deals after them. Counting
  new cards would make a deck nobody has started read "32 cards · 32 due", which is the
  card count said twice. A test holds the count to the due part of `buildQueue`
- **The index never migrates the store.** It reads a version 4 store as it stands, and
  anything older reads as nothing due until a deck is opened, since `loadProgress` needs
  a route's cards to migrate safely
- **Counting records, not cards,** is what keeps card ids off the index, and it has one
  gap: a record for a card removed from a deck by hand still counts. `CLAUDE.md` already
  says never to do that

---

### Task 6 — The cross-deck due queue

*Merged, in #29.*

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

**Watch for the volume.** The longest gap sets how many cards come back each day once
things settle. At four days, all 264 cards is about 66 a day, and every one costs a
typed answer. One deck at a time it is six to eight. If the cross-deck queue feels
like too much, that number is why, and the lever is the longest gap in
`lib/schedule.ts`.

**Watch for.** This queue has no goal filter — it draws from every deck holding a due
card. That is right until you are preparing for something specific and would rather not
meet CAP cards while drilling React. Hiding is the wrong instrument: `CLAUDE.md` is
explicit that hiding is about the index, and "not right now" is not "hidden". If it
starts to bite, the answer is the deferred "in rotation" scoping this queue, not a
change here.

**As built.**

- **Due cards only, no new ones.** `buildDueQueue` in `lib/queue.ts` is the due half of
  `buildQueue`, which is now that queue followed by the new cards. Every deck's new pool
  dealt in turn would be 264 cards in file order, which is neither a day's review nor
  interleaved, so new cards are met in a deck of their own. It also makes the card's
  count on the index, which task 5 already left new cards out of, exactly what the
  session deals
- **The index card**, on a schedule: "264 cards · 41 due", "Everything, due today", and
  "41 cards across 7 decks, interleaved — the honest test". One deck holding everything
  due says "3 cards, all from ACID"; nothing due says "Nothing due today across 12
  decks". Its due count is a darker tan than `shadeForTint` gives the cream, which was
  4.2:1 on the card
- **The endings across decks** say "The next cards come back tomorrow", "Every deck" and
  "Study every card" rather than naming whichever deck the first card is from. With
  nothing scheduled at all, the panel says cards join the schedule when answered in
  their own deck, since this queue will never deal them
- **The key is the decks in the set**, not the card count. Checked by swapping hidden
  ACID for hidden CAP, twelve cards each: the reviewer now remounts with ACID's cards,
  where the old key kept the stale set. The due queue is not in the key and needs not
  be: the reviewer builds it once, after mount, from the cards it is given
- The mode script in `app/layout.tsx` no longer treats `/study/all` as always free study

---

### Task 7 — A first interval shorter than a day

*Built, in review. See "As built" below.*

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

**Undecided: same-day repeats.** Anki shows a new card again after a minute and then
ten minutes before it starts spacing by days, and this app has nothing like it — the
first answer always waits at least a day. That is the biggest reason a card cannot
reach green quickly. This task could grow into it, or it could be its own task. Not
agreed yet either way. *(Decided when task 7 started: not in task 7. It stays
undecided as a task of its own.)*

**As built.**

- **The setting** sits at the foot of the index between "Hide built-in decks" and the
  mode switch, only on a schedule: "Red cards back in [1 day]", a native select of 1,
  2, 4 or 8 hours or a day. It names the current value, unlike the switch beside it,
  because it is a choice among five rather than a way out
- **Stored in `prefs:reviewer`, not `prefs:schedule`.** The plan predates that key,
  which task 9 added for what the reviewer reads, and a fifth key for one number was
  not worth it. `firstInterval` arrived inside its version 1, reading as 24 when absent
  or off the list. Saving now merges, so the index setting the interval and the
  reviewer marking the color key shown cannot undo each other
- **The representation is the plan's second way.** `comesBack` in `lib/schedule.ts`
  gives a box 1 card a `dueAt`, counted from the moment of the answer, when the interval
  is under a day; `due` is the local day it falls on. Any other scheduled answer takes
  `dueAt` off; free study leaves it alone. `isDue` compares the time when `now` is
  given, and the day otherwise
- **A card graded in a session never returns to it.** The reviewer reads the clock once
  when it opens, alongside the day, and deals with that; grading counts from the real
  moment of the answer. The index's due counts read the clock when they are drawn
- **The tiebreak survives.** Cards with times group by their `due` day, and a test
  holds the shuffle to one group across them
- **Copy with hours.** A deck with a card back later today "comes back at 3:57 PM", or
  "tomorrow at 7:00 AM" past midnight. The panels say "Done for now" and "Nothing due
  right now" when the next card is back today, and the color key says "Red comes back
  in 1 hour"
- `pnpm run test:schedule` covers a wrong answer at four hours coming back four hours
  later, a right answer still in the morning, a time past midnight carrying the next
  day, and real hours across the clocks going forward, under `TZ=Europe/London`

**Checked in Chromium.** With the setting at 1 hour, a card answered wrong went to box 1
due exactly 60 minutes later, and the done panel read "Done for now … ACID comes back at
3:57 PM". Reopening straight away dealt nothing, "Nothing due right now". With the time
moved into the past, reopening dealt it again, and the index counted it. The setting is
not on the page in free study. At 800px wide the footer's controls wrap to a line of
their own under "Add your own deck".

---

### Task 8 — An empty box when a card comes back

*Merged, in #21. Landed early, alongside task 4, and narrower than first planned.*

**Why.** When a card returns, the answer you wrote last time is already sitting in
the box. You read it instead of recalling it. That is the one thing this app exists
to stop.

**What was built**

- On a schedule, every card opens with an empty box, whatever you wrote last time.
  With the switch off, nothing changes: the box opens with your saved draft
- What you type during a visit survives it. Half an answer left for another card and
  come back to is still there, and so is anything written before stepping out of the
  queue into the whole deck
- The old answer is not deleted to empty the box. It stays in the store until a new
  one replaces it, and moving past a blank box does not write the blank over it
- No old answer on the back of the card, and no setting

**What changed from the plan.** The plan kept two drafts per card and showed the
previous attempt under the new one for comparison. That came out on the grounds that
no previous answer should be on screen at all while studying on a schedule, so the
record still holds one draft. The plan also left the mode open; this only applies on
a schedule, because the whole-deck reviewer is the one being kept as it was.

---

### Task 9 — Say what the colors mean, once

*Merged, in #30, as a key beside the strip rather than a panel. See "As built" below.*

**Why.** The strip is four colors and a gray and nothing on screen says what any of
them mean. A reader who answers a new card correctly, sees orange, and expects green
concludes the app is broken. That is not hypothetical — it happened, and the strip
was briefly changed to go green on one right answer before being changed back.

**Not a popup on first load.** At that point the reader has never seen a strip, so it
explains a thing they have not met, and there is no other modal anywhere in this app.
Show it the first time a scheduled session opens. It was going to show when the reader
pressed "Study on a schedule", but spaced repetition is now the default, so nobody
presses anything to reach it: the first scheduled session is the first time the strip
needs explaining.
Leave a "How does this work?" link beside the switch so it can be read again, and
never show it unasked twice — `prefs:index` remembers.

**Do**

- A panel, in the app's own language: the card shape, a real strip rather than a
  description of one, sentence case, no exclamation marks
- The four colors are shown as dashes at the size they actually appear, each labeled
  with what puts a card there. A legend of swatches at 3px is the thing being
  explained, so it should not be redrawn larger and differently
- Closing it starts the session it opened over. It is not a gate in front of the deck,
  just the first thing on screen the first time

**The copy.**

> **How this works**
>
> Every card climbs a ladder of four rungs, and its color on the strip is the rung
> it is on.
>
> - gray — not answered yet
> - red — you marked it "Needs review"
> - orange — one right answer in a row
> - yellow — two right answers in a row
> - green — three right answers in a row
>
> One wrong answer sends a card back to red from wherever it had got to. So green
> means three in a row, not three in total.
>
> The rung also sets when the card comes back: red the next day, orange in two days,
> yellow in three, green in four.
>
> Nobody is checking your answers but you.

**What changed from the first draft.** "Answer each question 3 times correctly"
became "three times in a row", because a wrong answer drops a card to red from any
rung, and that is the whole of the ladder. And the interval paragraph came out: it
described task 7, which is not built.

**When task 7 lands**, this panel gains one line about the setting, saying plainly that
it only changes how soon a red card comes back. *(Landed as the key's note following
the setting instead: "Red comes back in 4 hours, orange in two days, …".)*

**Done when** turning the switch on shows it once and never again unasked, the link
beside the switch brings it back, and the dashes in it are the same three pixels tall
as the ones in the reviewer.

**As built.** A key on the study page instead of a panel, decided when the task started:
the explanation belongs beside the thing it explains, and it can then be read again
where the question comes up rather than from the index.

- **A "?" at the end of the strip**, Lineicons' `question-mark-circle` at 24px, with a
  44px hit area that takes no height from the row. A press opens the key above it and it
  stays until closed: its `xmark-circle` button, Escape, the "?" again, or a press
  anywhere else. A mouse pointing at the "?" previews it. The key ends where the strip
  ends, not flush with the card's edge. See `components/ColorKey.tsx`
- **Lineicons, over Material Symbols and Font Awesome Free.** Its hairline stroke and
  rounded ends match the app's thin rules; Material's square-cut close read heavier, and
  Font Awesome Free's icons are CC BY and need attribution. Lineicons Free is MIT. The
  two paths are pasted into the component rather than installed. The "?" started as a
  typed character in the label face, whose tracking set it off-center in its circle
- **It opens by itself once**, the first time a scheduled session starts with cards in
  it, and closes when the card is turned. It is remembered as shown the moment it opens,
  in its own key, `prefs:reviewer`, not `prefs:index`: the reviewer is what reads it, and
  `lib/prefs.ts` says what the index key is for. The "How does this work?" link beside
  the switch is not built; the "?" is how it is read again
- **Both modes.** On a schedule it explains the four boxes and gray; in free study,
  green for "I had it", red for "Needs review", and that free study does not change when
  cards come back. Free study's two colors were unexplained too
- **The dashes are the strip's own**, 3px tall, and the card you are on is the 7px dash
  in the deck's ink
- **The copy is shorter than the draft above**: a line saying what a dash is, the rows,
  then one note that green means three in a row and when each color comes back. "Nobody
  is checking your answers but you" did not fit a key
- **It covers the lower part of the card while open**, on a phone most of the row of
  buttons. A press anywhere closes it, so the first press on the page gets it out of the
  way
- **American English, everywhere.** The key started out saying "colours", and the
  whole repository has since been converted: UI copy ("Recognizing" on the index, "a
  fraction of a cent" rather than "a penny", "hex color" on the import screen and in the
  parser's tint warning), the prompt sent to Claude, code identifiers (`normalizeTint`),
  comments, tests, tools, these docs, and the card content in `content/`. The parser no
  longer accepts a `colour:` line, only `color:` and `tint:`. `CLAUDE.md` says so under
  Conventions. The printed cards that carry the old spellings ("behaviour",
  "recognised", "optimisation" and a few more) are out of step until they are reprinted

**Noticed while building it.** The card you are on is drawn in the deck's ink, and a
deck whose ink is green, like ACID, puts that dash beside box 4's green. The key names
it as its own row, but the strip itself does not tell them apart except by height.

---

### Task 10 — The queue bar

*Merged, in #25. Moved into the title row afterward.*

**Why.** A scheduled session opened with a small "0/32 today · 32 new" in the corner
and nothing else to say what the day held. How many cards are overdue, how many are
new, how much of the deck the schedule left out: all of it was in the store, none of
it was on screen.

**What was built**

- A slim bar, 22px, on a schedule only. Free study has no queue to split up and keeps
  its count
- **It sits in the title row**, between the deck's name and its links, when it fits
  there with its words. Otherwise it goes on its own line below the title row, still
  with words, and only if the words do not fit even there does it show numbers with a
  legend underneath. Every step is measured, never guessed from the screen width — a
  hidden copy at its natural width against the gap and against the row — and measured
  again on resize and as the counts change. A first version switched to numbers below
  640px regardless, and turned a lone "16 new" on a phone into "16" over a legend. The server draws the title row before any progress
  exists, so the row holds an empty `[data-queue-slot]` and the bar is portalled in.
  See `components/QueueBar.tsx`
- **At most 9rem per segment shown.** One segment is a short bar, not a line across
  the page
- **No bar for a deck that is all new.** "16 new" says nothing the card does not. It
  is decided when the session opens and holds for the session, so the bar does not
  pop in at the first grade and push the card down
- It replaces the corner count rather than sitting beside it. The strip is already a
  progress bar, and a third progress indicator on one screen is too many
- Five segments across the whole deck, in the order the queue deals: done, overdue,
  due today, new, then not due. A segment with nothing in it is left out
- Widths follow the counts but never clip a label: each segment grows by its count
  from a basis of its own text
- Neutral grays. The strip uses color for boxes, and a second meaning for the same
  hues would muddle both
- Screen readers get one sentence, "Today: 9 done, 3 overdue, 6 due today, 5 new,
  9 not due", rather than five fragments
- The counting is `breakdown` in `lib/queue.ts`, with tests

**A "done" segment was added to the mockup's four.** The count it replaces carried
progress, and without it progress would be on the strip alone.

**Counted per session, not per day.** Open the deck again this afternoon and this
morning's cards read as not due rather than done, because that is what they are.

---

### Task 11 — Docs

*Not started.*

Three documents are partly out of date. The Storage section of `CLAUDE.md` was kept
current as tasks 1 to 4 and 8 landed — `prefs:index` at version 3, `progress` at
version 4, the `misses` field — so what is left there is small.

- `CLAUDE.md` — "What this is" still says five built-in decks and 80 cards; there are
  twelve and 264. The Storage section says three keys: the API key has its own too,
  and `prefs:schedule` makes another once task 7 lands. The `reviewed` paragraph's
  example is "a box-5 card reviewed two weeks ago", from before the ladder became
  four boxes of up to four days, and `lib/progress.ts` has the same example
- `ARCHITECTURE.md` §8 — progress now carries a schedule; rotation is deferred, and
  the build order in §9 lists it as step 4, so both say so
- `ARCHITECTURE.md` §10 — retitled. It is not a Safari quirk: WebKit's seven-day timer,
  DuckDuckGo's Fire Button (its browser wraps WebKit on macOS and iOS, so it inherits
  the timer *and* adds the button), clear-on-exit settings, private windows and
  Chromium's quota eviction are all one class — `localStorage` is not durable storage

---

## Miscellaneous

Independent of the above and of each other.

### Task 12 — Import hardening

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

### Task 13 — Housekeeping

- Add a `not-found.tsx` matching the app's visual language
- Add `metadata` per route (deck name in the title, so browser tabs are useful)
- Consider `next/dynamic` for `PrintSheets` — it's only needed on print routes
  and currently sits in the shared bundle
- Check the reviewer with a screen reader once; the live regions were written
  correctly but never tested with one
- The action buttons on a deck card are 41px tall, and `CLAUDE.md` asks for 44px tap
  targets. Raising them makes every deck card slightly taller, so it wants a decision
- Check the phone fit from task 4 on a real phone, with Safari's address bar both
  showing and hidden. It was only measured in a desktop browser at phone sizes

**Accessibility, in this order.** Not a project, three fixes. Most of this helps any
reader, not only someone using a screen reader: the keyboard grading bug fixed in task
4 was an accessibility bug.

- **Give the strip a signal besides color.** Both strips tell cards apart by color
  alone, and the colors that matter most are red and green, the pair roughly 1 in 12
  men cannot easily separate. They are also too close in brightness to fall back on,
  1.5:1 against each other. Give a red dash a second cue, such as a different height
  or a hollow shape, and check both strips with a color-blindness simulator. This
  matters more than the other two put together
- **Darken the muted text a touch.** `--color-muted` is 4.1:1 on the paper and 4.35:1
  on the card, under the 4.5:1 small text wants, and the labels it colors are small
  capitals. Nudge it until it clears 4.5:1 on both
- **Run an automated check once.** Lighthouse or axe on the index, a scheduled
  session and free study, and fix what it flags

---

### Task 14 — The whole app from the keyboard

*Not started.*

**Why.** Tab used to cycle through everything you could press on a page, and it no
longer does. Nothing has been checked since; it was noticed on September 15, 2026.
Everything this app does should be reachable and operable with the keyboard alone.

**Do**

- Find what broke Tab before changing anything, and say which commit did it. Suspects
  worth checking first: the global keydown handler in `Reviewer.tsx`, the `inert`
  turned-away face, and focus styles that make a focused element look unfocused
- Walk every route with Tab, Shift+Tab, Enter, Space and Escape: the index (deck cards,
  Hide and Delete, the switch, "Add your own deck"), `/new` (the key, the file picker,
  the paste box, generating a deck), a deck in free study and on a schedule (the answer
  box, turning over, grading, the arrows, the "?" key and its close button, the done and
  nothing-due panels), `/study/all`, and print
- Focus order follows the page, every focusable element shows a visible focus ring, and
  focus never lands on something hidden or off screen. The rings are 1px since
  September 15, 2026, all in `#5f5e5a`, a softer black than the text, thinner
  than the usual 2px advice by choice; check they still read on every surface
- After an action that removes the focused element — grading a card, closing the color
  key, deleting a deck — focus moves somewhere sensible rather than back to the body

**Done when** a session can be started from the index, a deck studied to its done panel,
and a deck imported, all without touching the mouse, in Chromium and in Safari.

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
