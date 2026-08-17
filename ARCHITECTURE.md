# Architecture

> **Status: deferred.** None of this is being built in the current round. The
> app is deployed for one person, with local decks and markdown decks committed
> to `content/`. Everything below — accounts, databases, publishing, forking,
> moderation, copyright terms — is designed but explicitly out of scope until a
> later session with its own branch. Kept here so the thinking isn't lost.

How the flashcard service is meant to work once other people use it. Written
before the multi-user version exists, so it is a specification rather than a
description — where something is not yet decided it says so.

The single-user app that exists today (local decks, `localStorage` progress,
print sheets) is the starting point, not a thing to be thrown away.

---

## 1. Vocabulary

Fix these words now, because they leak into table names, routes and UI copy, and
renaming them later is tedious.

| Term | Means | Notes |
| --- | --- | --- |
| **Card** | One question and one answer | Has a stable id, see §6 |
| **Deck** | An ordered set of cards | The unit that is created, shared, printed |
| **Topic** | Subject matter, e.g. "databases" | A tag on a deck; many decks share one |
| **In rotation** | What the user is drilling now | Not "favourites" — see below |
| **Fork** | A copy of a public deck under a new owner | Snapshot, not a live link |
| **Version** | An immutable published snapshot of a deck | See §5 |

**Deck, not topic**, for the collection. The product's whole vocabulary is
physical — cards, cut lines, shuffle, flip, print double-sided. Decks shuffle;
topics do not. Keeping "topic" free for tagging also gives the public library a
browse axis for nothing.

**In rotation, not favourites.** Favourites only ever accumulate, because
removing one reads as a rejection of the thing. A study set needs removal to
feel like ordinary housekeeping, because the whole point is that it turns over
as interviews come and go. "Remove from rotation" says that; "unfavourite" does
not. If the phrase reads as too clever in situ, "Studying" is the plain
alternative — both beat starring things.

---

## 2. The three states of a deck

The obvious model is private and public. There are actually three, and merging
the first two produces a signup wall that costs more users than it gains.

| State | Lives in | Account | Syncs | Visible to |
| --- | --- | --- | --- | --- |
| **Local** | Browser `localStorage` | No | No | Only that browser |
| **Private** | Database, owned row | Yes | Yes | Owner |
| **Public** | Same row, `visibility = 'public'` | Yes | Yes | Everyone |

**Local is the default and stays supported.** A new visitor can write a deck,
study it, print it and never create an account. Nothing is transmitted, so
"private" is not a promise about our data handling — it is a statement of fact.
Ask for an account at the two moments it buys something concrete: syncing to a
second device, or publishing. That is a far better conversion point than a wall
on the front page.

Promotion is one-directional and explicit: **local → private** on first sign-in
(offer to upload what is already there), **private → public** on publish.
Unpublishing returns a deck to private; it does not return it to local.

### Where the built-in decks live

The five shipped decks (Gigs, React 19, CAP, ACID, SOLID) stay in the repo as
markdown under `content/`, parsed at build time. They are authored, reviewed and
versioned like code because they *are* part of the product.

User-submitted public decks **must not** go in the repo. Writing to `content/`
on publish would mean a bot holding a GitHub token committing on users' behalf,
a full Vercel rebuild per publish, a queue when two people publish at once, and
content that survives deletion in git history forever — which is not an
acceptable answer to "please remove my data". Git is for artefacts you author;
user submissions are data, and data goes in a database.

The distinction is a product feature, not a compromise: a curated shelf you
control, plus a community library.

---

## 3. Data model

Postgres. Supabase is the recommended host because row-level security maps
directly onto the visibility rules and it brings auth with it; Neon plus Auth.js
is the less-locked-in alternative with more assembly required.

```sql
users            id, email, handle, created_at

decks            id, owner_id, slug, title, blurb, tint,
                 visibility ('private' | 'public'),
                 forked_from_version_id nullable,
                 current_version_id nullable,
                 created_at, updated_at

deck_versions    id, deck_id, number, cards jsonb, published_at,
                 review_state ('pending' | 'approved' | 'rejected' | 'removed'),
                 review_note nullable

deck_topics      deck_id, topic          -- tags, many per deck

rotation         user_id, deck_id, added_at   -- "in rotation"

progress         user_id, deck_id, card_id, draft, grade, updated_at
```

`cards` is a `jsonb` array rather than a table. Cards are never queried
individually, always loaded as a whole deck, and a version needs to be an
immutable blob. A `cards` table would buy nothing and complicate versioning.

**Row-level security**, if using Supabase:

- `select` on `decks` where `owner_id = auth.uid()` **or** (`visibility = 'public'`
  and the current version is `approved`)
- `insert`, `update`, `delete` where `owner_id = auth.uid()`
- `progress` and `rotation`: `user_id = auth.uid()`, no exceptions
- Moderation transitions are service-role only, never the client

---

## 4. Publishing and moderation

The owner keeps control of their own deck; the administrator keeps a veto over
everything public.

### Pipeline

1. Owner presses **Publish**. A `deck_version` row is written with the cards
   snapshotted and `review_state = 'pending'`.
2. **Automated scan** runs (below). A clear pass sets `approved`; a clear fail
   sets `rejected` with a reason shown to the owner; anything uncertain stays
   `pending` for a human.
3. **Email to the administrator** on every publish, whatever the scan decided —
   deck title, owner handle, card count, scan verdict, and one-click links to
   approve or remove.
4. The deck appears in the public library once `approved`.
5. The administrator can set `removed` on any version at any time, for any
   reason. Removal is immediate and does not require the owner's agreement.

### The automated scan

Be honest about what this can do. **The wordlist catches the least harmful thing
you are screening for.** Defamation, harassment naming a real person, spam and
lifted question banks contain no profanity at all — "Q: Who embezzled from Acme?
A: [real name]" passes every wordlist ever written. Layer 1 is cheap and worth
having, but it is not the thing doing the work.

False positives are a smaller problem than usually claimed, provided matching is
on word boundaries rather than substrings — substring matching is what produces
the classic "Scunthorpe", "assassin", "cockpit" failures. A tight list of genuine
slurs fires rarely on technical material. The edge cases that remain are decks
about language, linguistics, or content moderation itself, which is an argument
for routing hits to review rather than auto-rejecting them.

Decide separately whether the policy bans **profanity** or bans **abuse**. A deck
teaching Spanish slang is legitimate; a deck attacking someone is not. Banning
abuse and treating profanity as a flag-for-review signal is the more defensible
line.

Three layers:

- **Layer 1, wordlist** — word-boundary matched, runs inline, costs nothing,
  flags for review rather than rejecting outright
- **Layer 2, moderation model** — an LLM or moderation endpoint classifying deck
  text for hate, harassment, sexual content, violence, self-harm. This is the
  layer doing the real work
- **Layer 3, defamation and impersonation heuristic** — flag decks naming a real
  person alongside accusatory language. Not reliably automatable; always route to
  a human, never auto-reject

Uncertain results go to the queue rather than through. Rate-limit publishing per
user (a handful per day is generous) so the queue cannot be flooded.

### Owner rights

The owner may edit or delete their public deck at any time. Editing creates a
**new version**, which re-enters review — it does not silently change what is
already live. Deleting removes it from the library immediately.

**This is the one place where two of your requirements pull against each other.**
"The owner can modify a public deck" and "a fork is a snapshot" cannot both hold
if edits mutate what learners already have. Versioning resolves it: a learner
studies the version they started, keeps their progress against it, and is offered
the update rather than given it. The alternatives, for the record, are freezing
public decks entirely (simpler, worse for authors) or letting edits propagate
live (simplest, breaks progress and forks). Versioning costs one table and is
worth it.

### Configuration

```
MODERATION_EMAIL=flashcards@pm.me
```

An environment variable, not a literal in source, so it can change without a
deploy and does not sit in a public repo. Resend or Postmark for delivery.

---

## 5. Forking

A fork copies the cards of a specific published version into a new deck owned by
the forker, sets `forked_from_version_id`, and starts private.

Forks do not track upstream. This is deliberate: the value of a fork is that it
is *yours* and stable, and a live link would reintroduce exactly the problem
versioning just solved. Attribution is shown ("forked from X"), and the fork's
own publishing goes through the same review.

Forking is also what makes the library work socially — most people want an
existing deck with three cards changed, not to start from nothing.

### Publishing is not reversible in the way people assume

An owner may delete their public deck at any time. **Deletion is not
retraction.** Forks taken while the deck was live are copies owned by other
people, and removing the original does not remove them.

This must be stated on the publish screen itself, not only in the linked terms,
because it is the one consequence users will not anticipate and cannot undo:

> Publishing lets anyone copy this deck and edit their copy. You can delete or
> unpublish yours at any time — but copies other people have already made stay
> theirs. You keep the copyright in what you wrote; what you cannot do is take
> back copies once they exist.

The copyright position is worth being precise about, because "you no longer own
it" would be wrong. The author keeps copyright throughout. What publishing grants
is a licence for others to copy and adapt — and a licence already exercised
cannot be withdrawn retroactively by deleting the source. Infringement *beyond*
that licence (someone republishing a fork as their own original work, say)
remains actionable through the ordinary takedown route in §7.

Requiring an explicit checkbox on first publish, rather than a passive notice, is
proportionate here.

---

## 6. Card identity

**This is the change to make first, before any of the above.**

Progress is currently keyed by array index (`deck.cards[3]`). The moment a deck
can be edited after someone has studied it, inserting a card at position 3
silently reassigns everyone's history. Publishing, forking and versioning all
make editing routine, so index-keyed progress becomes wrong the day this ships.

Every card gets a stable `id`, generated once at creation or import:

```ts
type Card = { id: string; q: string; a: string };
```

A uuid, not a hash of the question text — a hash is tempting because it
deduplicates, but it changes when you fix a typo, which is exactly when you least
want progress to reset.

**Migration.** Existing progress keys are `progress:{slug}` holding
`{ drafts, grades }` maps keyed `{deckSlug}:{index}`. On first load after the
change, rewrite index keys to the card id at that index and stamp the store with
a version:

```ts
type ProgressStore = { version: 2; drafts: Record<string, string>;
                       grades: Record<string, Grade> };
```

Wrap the custom-deck store in the same envelope at the same time. Both are five
lines now and a guessing game later.

---

## 7. Copyright and terms

Users will paste textbook, certification and course material into a public
library. This is the most likely source of a real complaint, and it is cheap to
handle before launch and unpleasant after.

**Terms must state**, in plain language on the publish screen and not only in a
linked document:

- The user warrants they have the right to publish what they are publishing
- Publishing grants the service a licence to host and display it, and grants
  other users a licence to fork and adapt it
- **Deleting a published deck does not delete forks others have already taken.**
  The author keeps copyright; what they cannot do is retract copies that already
  exist. See §5 for the wording to put on the publish screen
- Copying material from textbooks, certification syllabi, paid courses or another
  service's question bank is not permitted
- The administrator may remove any public deck at any time, without notice

**A takedown route must exist**: a contact address on every public deck page, a
commitment to respond, and the ability to set `removed` on a version instantly.
Because public decks live in the database rather than git history, removal is
genuinely removal — which is the second reason not to publish to `content/`.

**Data deletion.** Account deletion removes decks, versions, progress and
rotation. Public decks that others have forked leave the forks intact — the fork
is a copy, and the attribution can degrade to "forked from a deleted deck".

Not legal advice; get the terms reviewed before launch.

---

## 8. Progress and rotation

**Progress** stays per-user and per-card. Local decks keep it in
`localStorage`; signed-in users keep it in the `progress` table so it follows
them across devices. The reviewer does not care which — it reads through one
interface with two implementations, which is the dependency-inversion point from
the SOLID deck applied to something real.

**Rotation** is a plain join table. UI surface: an "In rotation" section at the
top of the index, an add/remove control on every deck, and a shuffled study route
across everything in rotation — the multi-deck interleaving that already exists
at `/study/all`, scoped to what the user actually cares about this month.

Interleaving decks is better practice than blocking one deck at a time, so the
rotation study route should be the prominent one.

---

## 9. Build order

Sequenced so each step is independently useful and nothing needs undoing.

1. **Card ids and versioned stores** (§6) — small, unblocks everything, wrong to
   defer past the first external user
2. **`content/` decks and one parser** — built-in decks become markdown, the
   generator script retires, `lib/parseDeck.ts` serves both file and paste paths
3. **Accounts and sync** — local → private promotion, progress moves to the
   database, no publishing yet
4. **Rotation** — small, immediately useful, independent of publishing
5. **Publishing with review** — versions, the scan, the email, the admin queue.
   Ship the queue with the feature, never after
6. **Public library** — browse, filter by topic, fork
7. **Forking** — trivial once versions exist

Steps 1 and 2 are worth doing while the app is still single-user.

---

## 10. Open questions

- **Handles.** Public decks need an author label. Real names, chosen handles, or
  anonymous? Anonymous weakens accountability and makes moderation harder.
- **Search.** Postgres full-text is enough until it is not; do not reach for a
  search service early.
- **Print at scale.** The client-side print route is fine for a personal deck.
  If public decks get printed often, server-side PDF generation gives more
  reliable output than browser print settings.
- **Safari storage eviction.** Safari clears script-writable storage after seven
  days without a visit. Local decks can vanish for an infrequent user, which is
  an argument for prompting to sign in before that bites.
- **Abuse of the free tier.** Publishing costs moderation attention. Watch it
  before opening the door wide.
