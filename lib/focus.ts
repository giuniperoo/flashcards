/**
 * Where focus goes when the deck card holding it leaves the grid.
 *
 * Hide and Delete take their own card off the page, and the button pressed
 * goes with it, so focus fell back to the body and the next Tab started over
 * from the header. It moves to the card that took this one's place instead, or
 * the one before it if this was the last, and to "Add your own deck" once the
 * list is empty or gone.
 *
 * Only after a press from the keyboard: a click has nowhere it was reading
 * from, and on a phone a focused link is a ring nobody asked for. Call it
 * before the removal, while the card and its neighbors are still there.
 */
export function focusNeighborCard(event: React.MouseEvent<HTMLElement>) {
  // A click from the keyboard, Enter or Space, reports no clicks.
  if (event.detail !== 0) return;
  const item = event.currentTarget.closest("li");
  if (!item) return;
  // The card after this one, which takes its place, or the one before it,
  // focused while this card is still on the page. React has not taken it out
  // by the next frame, so waiting would find the grid unchanged.
  const neighbor = (item.nextElementSibling ?? item.previousElementSibling)
    ?.querySelector<HTMLElement>(".deck-open");
  const fallback = () => document.querySelector<HTMLElement>('a[href="/new"]')?.focus();
  if (!neighbor) {
    fallback();
    return;
  }
  neighbor.focus();
  // Hiding the last deck takes the "Everything" card with it, and that can be
  // the neighbor. Watched for rather than waited out: a frame count is no
  // promise, and frames stop altogether in a tab nobody is looking at.
  const observer = new MutationObserver(() => {
    if (neighbor.isConnected) return;
    observer.disconnect();
    fallback();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 1000);
}
