/**
 * Fisher-Yates, on a copy.
 *
 * Shared because two callers want the same thing for different reasons: the
 * reviewer deals an unscheduled deck in a different order every time, and
 * `lib/queue.ts` breaks the tie between cards that came due on the same day.
 * One implementation, so a fix to either is a fix to both.
 */
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
