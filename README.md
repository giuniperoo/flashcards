<img src="logo-pixelated.svg" alt="Flashcards" width="265">
<h2><a href="https://f.lash.cards">f.lash.cards</a></h2>

A flashcard app for interview preparation. You can't turn a card over until
you've written an answer. It's easy to recognize an answer you couldn't have
come up with yourself, and in an interview you have to come up with it.

Twelve decks and 264 cards ship with the app, none of them over 24 cards. Four
of them (React 19, CAP theorem, ACID and SOLID) began as printed cards, and the
other eight were written the same way. The index starts empty anyway, on the assumption that
you're here for your own material. A toggle at the bottom of the index brings
the built-in decks in.

## Studying

Spaced repetition is the default. A deck deals what is due, the cards you owe
first and then the ones you have never seen, and the session ends when they are
done. A card you get wrong goes to the back of the session and comes back until
you get it right; only the first answer counts toward the schedule. Every card sits in one of four boxes: a right answer moves it up one, a
wrong one sends it back to the first. Box one comes back after one interval, box
four after four. The interval is a day unless you set it shorter at the bottom
of the index: 1, 2, 4 or 8 hours, for the day before an interview. The strip
under the card colors each card by its box, red, orange, yellow or green, and
the "?" at its end explains the colors. "Everything" deals what is due across
every deck, interleaved, and the index shows how many cards each deck owes.

Free study is the other side of the switch: the whole deck, shuffled if you
like, green and red for your last answer. Nothing you do there moves the
schedule, so you can't turn a deck green in one sitting. The logo in the
header says which mode you are in, cream on a schedule and sage in free study.

## Two voices

Do you like things a little spicy? Add `?swearengen` to any address and it speaks
like Al Swearengen from <a href="https://www.imdb.com/title/tt0348914" target="_blank">Deadwood</a> instead, profanity and all, down to the
buttons and the error messages; `?swearengen=off` turns it back. The choice is
kept in a cookie in that browser, so it holds from page to page. Every string
is written twice, in `lib/copy.ts`, and nothing is swapped after the page loads,
so neither voice flashes up before the other. The printed sheets and these docs
are plain either way.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4. There's no
database. Decks are markdown files read at build time, and progress lives in
`localStorage`. The only thing the server keeps is sync's encrypted copy, in
Redis (see below).

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
pnpm run test   # parser, progress, schedule, queue, filter, prefs, deck writer, sync
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
  api/sync/[id]/route.ts reads, writes and deletes one sync key's encrypted copy
  not-found.tsx          an unknown address, in the app's own panel
  globals.css            Tailwind v4 theme, palette lifted from the print spec
components/
  Reviewer.tsx           all study state
  DeckIndex.tsx          headline counts and the built-in deck grid
  DeckCard.tsx           one deck on the index; both lists render through it
  DeckVisibility.tsx     the show/hide controls and the mode, at the foot of the index
  DeckImporter.tsx       parses a paste or a file, previews it, saves it
  DeckGenerator.tsx      asks Claude, OpenAI or Gemini for a deck, into the importer
  ShuffledSet.tsx        narrows /study/all and /print/all in the browser
  SyncPanel.tsx          the sync control, and the dialog that starts, joins and stops it
  SyncAgent.tsx          when to sync, on every page; draws nothing
  PrintSheets.tsx        the sheets themselves, built-in and imported alike
lib/
  loadDecks.ts           reads content/*.md at build time — server only
  parseDeck.ts           one parser for files, pastes and generated text
  print.ts               sheet pagination and column mirroring
  progress.ts            one store of answers and schedules, keyed by card id
  schedule.ts            the four boxes, when a card comes back, and whether it is due
  queue.ts               what a session deals: due cards, then the new ones
  customDecks.ts         imported decks in localStorage
  prefs.ts               which built-in decks this reader wants to see, and the mode
  tint.ts                a deck's color, picked furthest from those in use
  generateDeck.ts        browser-direct call to the chosen provider — client only
  sync.ts                read, merge, write: keeping this device in step — client only
  syncMerge.ts           how two devices' progress and decks settle on one
  syncCrypto.ts          a sync key into an id and an encryption key
  syncWords.ts           the words a suggested key is made of
  syncStore.ts           the server's side: Redis, or memory in development
```

Only the interactive parts are client components: the reviewer, the importer and
generator, the print button, and the index components that read `localStorage`.
Deck cards render from summaries, which hold names and counts instead of all 264
cards, so the index ships kilobytes instead of the whole content folder.
`generateStaticParams` prerenders every study and print route at build time,
thirteen slugs each.

## Keyboard

| Key              | Action                             |
| ---------------- | ---------------------------------- |
| Cmd/Ctrl + Enter | Turn the card over                 |
| Left / Right     | Previous / next card               |
| 1 or K           | Mark held (once turned over)       |
| 2 or R           | Mark for review (once turned over) |
| S                | Shuffle (free study only)          |

A scheduled session can't be shuffled, because its order is the queue: the
cards you owe, then the ones you've never seen.

Arrow and letter shortcuts stand down while you are typing in the answer box.
Everything else is reachable with Tab. In Safari, and in DuckDuckGo and other
WebKit browsers, Tab skips links and buttons unless you hold Option or turn on
"Press Tab to highlight each item on a webpage" in Safari's settings.

## Printing

`/print/[deck]` lays the deck out as A4 sheets, eight cards per side in a 2×4
grid, with dashed cut lines and the deck's corner tint. Answer columns are
mirrored left to right so each answer prints on the back of its own question.

Print double-sided, flipping on the **long edge**, at 100% scale with browser
margins set to none. The sheet has its own 12.7mm margin. The print page lists
these settings using the print dialog's wording, and previews the sheets zoomed
to fit, with front and back side by side when the window is wide enough. The
preview only changes the screen, not what prints. A deck that isn't a multiple
of eight leaves blank cells on its last sheet, so the alignment stays put.

## Adding your own decks

`/new` takes a pasted deck or an uploaded `.txt`, `.md`, `.csv` or `.tsv`
file, parses it in the browser, shows you what it found, and saves it to
`localStorage`. Imported decks study and print exactly like the built-in ones.
Any deck can be exported as markdown: an imported one from the browser, and a
built-in one through `/export/[deck]`.

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

Front matter is optional: `#` sets the title, `tint:` sets the corner color,
`blurb:` sets the subtitle. Answers may wrap over several lines; a blank line
ends the card.

Two fallbacks are accepted for material you already have:

- Markdown headings: `## question`, with the answer as the text under it
- One card per line, with the question and answer split by a tab or a pipe, the
  way a spreadsheet exports them

The preview lists problems by line number before you save: a question with no
answer, an answer with no question, a tint that isn't a six-digit hex, or an
answer too long to fit on a printed card.

```bash
pnpm run test:parser
```

covers all three shapes plus the malformed cases.

### Writing one with AI

The import screen can also ask Claude, OpenAI or Gemini for a deck. Give it a
topic and a card count, and it streams the same `Q:` / `A:` text into the box
above, where you read and edit it like any other paste. If the deck isn't right,
say what to change and it writes it again. Saving is still a separate press. A
generated card is a claim you're about to memorize, so read it before you keep
it.

It runs in your browser with your own key for the provider you pick. The key is
kept in `localStorage` and sent only to that provider. Each provider keeps its
own key and model, and the list of models comes from the provider. There's no
server involved and no key of mine anywhere. Card counts come in multiples of
eight, because eight cards fill one printed sheet.

## The built-in decks

They start hidden. The twelve decks in `content/` are compiled into the app, so
only their author can delete them, and someone running the app for their own
material probably doesn't want them. The index opens empty. "Show built-in
decks", beside "Add your own deck", brings them all in, and "Hide" on a card
takes one away again. The two settings are separate, so turning the built-in
decks off and on again doesn't bring back the ones you hid.

Hiding a deck doesn't delete anything. The files stay, the links still work,
progress on those cards is kept, and imported decks aren't affected. The
setting applies before the page paints, so hidden decks don't flash up on load.

The headline counts only what's on screen: hidden decks aren't counted, and
imported ones are.

## Storage

Everything the app remembers lives in `localStorage`, under six keys:
`decks:custom` for imported decks, `progress` for your answers and each card's
schedule, `prefs:index` for what the index shows and the mode, `prefs:reviewer`
for the interval, `llm:key` for the deck writer's keys if you have set any, and
`sync` for your sync key if you have turned sync on. One cookie, `voice`, says
whether the interface speaks in the second voice. There is no account, and a
`/study/your-deck` link will not open for anyone else.

## Sync

"Sync across devices", at the bottom of the index, keeps progress and imported
decks in step between your devices with a key instead of an account. The first
device chooses a key or keeps the suggested one, three words such as "pink pony
charging", and the app checks that nobody else holds it. Every other device
joins with the same key, typed in or scanned from the first device's QR code. The preferences and the interval stay per device.

The key never leaves the browser. It is stretched with PBKDF2 into two halves:
one is the id the server files your data under, the other an AES-GCM key that
encrypts it first. The server holds ciphertext it cannot read. That trades some
security for ease of use, and the panel says so: a short key can be guessed,
anyone with the key or a photo of its QR code has your progress, and a key lost
on every device cannot be recovered. Misses are rate limited per network to
slow guessing.

`localStorage` stays the working copy, and a sync is read, merge, write. Two
answers to one card settle by time: the words and grade from whichever device
changed them last, the schedule from whichever answered on a schedule last. A
deleted deck is deleted everywhere.

In production it needs Upstash Redis. Add it to the Vercel project from the
Marketplace, which sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without them,
`pnpm run dev` keeps synced copies in memory, and a production build says sync
isn't set up. The browser only allows the encryption on a secure origin, so a
second device has to use the deployed site, not a laptop's dev server.

Browsers do clear `localStorage`. WebKit deletes it after seven days without a
visit, which covers Safari and, on macOS and iOS, every browser built on WebKit,
including DuckDuckGo. Privacy browsers clear it on demand, and any browser may
clear it when storage runs low. Imported decks can be exported before that
happens. Progress can't, so it's the one thing here you can lose, unless sync
is on and has a copy for the next device that joins. The built-in decks are
compiled in and aren't affected.

## Responsive

The deck grid goes one column, then two at 640px, and past 1300px the shell
takes 75% of the viewport and adds a column at 1300, 1800 and 2400px. The extra
width goes to more cards per row, and the cards stay the same width. Study and
the import screen keep a comfortable line length at any window size. Controls are 44px tall
where the pointer is a finger and 36px with a mouse, the card being studied fits
a phone's screen with its buttons, the answer box uses 16px text on mobile to stop
iOS zooming on focus, and the print preview zooms its pages to fit the column,
which printing ignores. The card flip respects
`prefers-reduced-motion`.

## Card data

Decks live in `content/*.md`, one file per deck. The four that began as printed
cards were converted from the PDFs, and have since been updated, so the paper
decks from that first print run are out of date. The filename is the slug: add a new `.md` file and it becomes a
deck, with no code change. A file that doesn't parse fails the build.

Each card carries an `id:`, a uuid that progress is keyed by. A card with a new
id looks new to the app, and its history is lost, so an id changes only when the
card's answer has changed and it should be learned again.

Each deck carries the pastel tint used for the corner triangle on the printed
card, so a card looks the same on screen as it does in your hand.

## License

MIT, see [LICENSE](LICENSE). It covers the code and the card content. The
decks are original, and the four printed ones were written for those cards.
