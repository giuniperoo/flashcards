import type { CardProgress } from "./progress";
import { cardKey } from "./progress";
import { isDue } from "./schedule";
import { shuffled } from "./shuffle";
import type { StudyCard } from "./types";

/**
 * What a study session is: the cards you owe today, and the ones you have never
 * seen. Everything else in the deck is left where it is.
 *
 * A pure function over plain values, called by nothing yet. The algorithm is
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
 * handful a day. So a fortnight away hands back a fortnight's work, which is
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
): StudyCard[] {
  /* Keyed by due date rather than collected into one list and sorted, because
     the shuffle has to run inside a day and not across the boundary. */
  const byDay = new Map<string, StudyCard[]>();
  const unseen: StudyCard[] = [];

  for (const card of cards) {
    const record = records[cardKey(card)];
    // No record, or one carrying only a draft: never graded, so not scheduled.
    if (!record?.seen) {
      unseen.push(card);
      continue;
    }
    if (!isDue(record, today)) continue;
    const day = byDay.get(record.due);
    if (day) day.push(card);
    else byDay.set(record.due, [card]);
  }

  // Ascending, so the day that has waited longest leads. Day keys are
  // `YYYY-MM-DD`, which sorts as text.
  const due = [...byDay.keys()].sort().flatMap((day) => shuffle(byDay.get(day)!));

  return [...due, ...unseen];
}
