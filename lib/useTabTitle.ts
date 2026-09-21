import { useEffect } from "react";

/**
 * Names the browser tab from the client, for the titles the server cannot
 * write: an imported deck's, which it has never seen, and the other voice's,
 * which it cannot know a reader is in.
 *
 * Kept, not just set: Next writes the layout's title into the head after the
 * page has rendered, and that overwrote a title set once from an effect. A
 * `<title>` rendered in the page lost the same way, since the browser reads the
 * first one in the head and Next's comes first.
 */
export function useTabTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
