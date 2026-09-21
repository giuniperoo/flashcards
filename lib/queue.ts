import type { CardProgress } from "./progress";
import { cardKey, deckOfKey } from "./progress";
import { isDue, type Grade } from "./schedule";
import { shuffled } from "./shuffle";
import type { StudyCard } from "./types";

/**
 * What a study session is: the cards you owe today, and the ones you have never
 * seen. Everything else in the deck is left where it is.
 *
 * Pure functions over plain values. The algorithm is
 * short; what goes subtly wrong is the interaction between a backlog and the
 * unseen pool, and that only shows up after a week of real use. Isolating it
 * here turns that week into test cases.
 *
 * Nothing in it is per-deck. `/study/all` can hand it every card across every
 * deck and get an interleaved queue for free, because sorting by date and
 * tie-breaking at random never sorts by deck.
 */

/** Injectable so a test can assert an exact order rather than sample one. */
export type Shuffle = <T>(items: T[]) => T[];

/**
 * Due cards first, oldest day leading, then the new ones.
 *
 * **Nothing is trimmed.** A backlog is debt already owed, and holding any of it
 * back would let a missed week compound quietly: cards you failed to reach
 * would sit at yesterday's date for ever while the queue served a comfortable
 * handful a day. So two weeks away hands back two weeks' work, which is
 * unpleasant and honest.
 *
 * **Cards that came due on the same day are shuffled among themselves**, and
 * only among themselves. Everything graded in one sitting shares a due date, so
 * without it a deck comes back in the order you last did it, which is the
 * serial dependency the reviewer's shuffle existed to break in the first place.
 *
 * **New cards stay in deck order.** A deck's order is the author's, and a
 * predictable intake is easier to reason about than a random one. The shuffle
 * is for cards coming back, not for first meetings.
 *
 * **There is deliberately no daily intake cap**, and it has been considered
 * twice. A card enters the schedule when it is *graded*, not when it is dealt:
 * an unseen card offered and skipped, or written into and never turned over,
 * stays unseen and comes back as new. Intake is therefore already bounded by
 * what the reader chooses to do, and a cap only bounds it by making that choice
 * for them. A cap here would also not be a cap on a day — it is per call, so it
 * multiplies by however many decks are opened and however many times each is
 * reopened, and it would contradict `/study/all`, which calls this once and
 * would get a single allowance across every deck. Making it mean a day needs a
 * *first seen* date, which the store does not keep: `reviewed` is the last
 * review, and a card met this morning is indistinguishable from one known for a
 * month and got wrong. If a freshly imported deck turns out to move through the
 * boxes as one lump, bring the cap back with that field and not without it.
 */
export function buildQueue(
  cards: StudyCard[],
  records: Record<string, CardProgress>,
  today: string,
  shuffle: Shuffle = shuffled,
  now?: number,
): StudyCard[] {
  // No record, or one carrying only a draft: never graded, so not scheduled.
  const unseen = cards.filter((card) => !records[cardKey(card)]?.seen);
  return [...buildDueQueue(cards, records, today, shuffle, now), ...unseen];
}

/**
 * The due half of `buildQueue` alone: what `/study/all` deals on a schedule.
 *
 * **No new cards across decks.** A deck's new cards come in deck order, which is
 * the author's order and is what makes a first meeting predictable. Every deck's
 * new pool dealt one after another is 264 cards in file order — not a day's
 * review and not interleaved. So new cards are met in a deck of their own, and
 * the cross-deck queue is only the cards already owed, which is also the number
 * the index counts as due.
 *
 * **Interleaved for free.** Days sort, cards inside a day shuffle, and nothing
 * ever sorts by deck.
 *
 * **`now` is read once, when the session is dealt.** A card with a time
 * (see `comesBack` in `lib/schedule.ts`) is dealt only if that time has passed
 * by then, so a card answered twenty minutes ago never comes back into the
 * session it was answered in, however short the first interval. It is grouped
 * by its `due` day like every other card, which keeps the shuffle within a day:
 * grouped by the minute, every group would be one card and the shuffle would
 * silently stop existing.
 */
export function buildDueQueue(
  cards: StudyCard[],
  records: Record<string, CardProgress>,
  today: string,
  shuffle: Shuffle = shuffled,
  now?: number,
): StudyCard[] {
  /* Keyed by due date rather than collected into one list and sorted, because
     the shuffle has to run inside a day and not across the boundary. */
  const byDay = new Map<string, StudyCard[]>();

  for (const card of cards) {
    const record = records[cardKey(card)];
    if (!record || !isDue(record, today, now)) continue;
    const day = byDay.get(record.due);
    if (day) day.push(card);
    else byDay.set(record.due, [card]);
  }

  // Ascending, so the day that has waited longest leads. Day keys are
  // `YYYY-MM-DD`, which sorts as text.
  return [...byDay.keys()].sort().flatMap((day) => shuffle(byDay.get(day)!));
}

/**
 * How many cards each deck owes today, by slug, for the counts on the index.
 *
 * The due half of `buildQueue`, counted off the records alone: the index holds
 * a name and a count for each deck, not its cards. A record's key leads with its
 * deck's slug, so no card ids need to reach the page. New cards are not counted.
 * They are not due — `isDue` says so — and a deck nobody has started would
 * otherwise read "32 cards · 32 due", which is the card count said twice.
 *
 * Counting records rather than cards means a record left behind by a card taken
 * out of a deck still counts. `CLAUDE.md` says never to remove an `id:` line, and
 * deleting an imported deck forgets its records, so that is a deck edited by
 * hand, and the count is out by the cards removed.
 */
export function dueByDeck(
  records: Record<string, CardProgress>,
  today: string,
  now?: number,
) {
  const due: Record<string, number> = {};
  for (const [key, record] of Object.entries(records)) {
    if (!isDue(record, today, now)) continue;
    const slug = deckOfKey(key);
    due[slug] = (due[slug] ?? 0) + 1;
  }
  return due;
}

/** What a scheduled session's queue bar shows. The six add up to the deck. */
export type Breakdown = {
  /** Done with in this session: answered right, or answered wrong and then
      right on a retry. */
  done: number;
  /** Still to come, and due before today. */
  overdue: number;
  /** Still to come, and due today. */
  today: number;
  /** Still to come, and never graded. */
  fresh: number;
  /** Answered wrong in this session, and still to be answered right. */
  again: number;
  /** Not dealt at all, because their day has not come. */
  notDue: number;
};

/**
 * The whole deck split by where each card stands in today's session, for the
 * queue bar above the card.
 *
 * `dealt` is the queue as it was built and `remaining` is what is left of it,
 * so the difference is what is done. A card answered wrong stays remaining,
 * and `retrying` names it: it is counted as again, whatever its record now
 * says. The rest of what is left is split by its record — overdue, due today,
 * or never seen — which is stable for the life of a session, since a card's
 * record only changes when it is answered, and an answered card is either gone
 * or retrying. Everything the queue left out is not due.
 *
 * Counted per session rather than per day: open the deck again this afternoon
 * and this morning's cards are not due, not done.
 */
export function breakdown(
  deck: StudyCard[],
  dealt: StudyCard[],
  remaining: StudyCard[],
  records: Record<string, CardProgress>,
  today: string,
  retrying: ReadonlySet<string> = new Set(),
): Breakdown {
  let overdue = 0;
  let dueToday = 0;
  let fresh = 0;
  let again = 0;
  for (const card of remaining) {
    const key = cardKey(card);
    const record = records[key];
    if (retrying.has(key)) again++;
    else if (!record?.seen) fresh++;
    else if (record.due < today) overdue++;
    else dueToday++;
  }
  return {
    done: dealt.length - remaining.length,
    overdue,
    today: dueToday,
    fresh,
    again,
    notDue: deck.length - dealt.length,
  };
}

/**
 * What is left of a session once the card at `position` is answered, and where
 * the reader lands.
 *
 * Right, and the card leaves. Wrong, and it goes to the back, behind every card
 * still to come, so the ones between are the gap before it is tried again; if
 * nothing else is left, it comes straight back. Either way the next card falls
 * into the answered one's place, or the one before it when the answered card
 * was last.
 */
export function afterAnswer<T>(remaining: T[], position: number, grade: Grade) {
  const card = remaining[position];
  const rest = remaining.filter((_, i) => i !== position);
  return {
    order: grade === "review" ? [...rest, card] : rest,
    position: rest.length === 0 ? 0 : Math.min(position, rest.length - 1),
  };
}
