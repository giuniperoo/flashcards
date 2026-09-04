"use client";

import { useCallback, useEffect, useState } from "react";
import type { Deck } from "./types";
import { loadCustomDecks } from "./customDecks";

/**
 * The imported decks, kept in step with `localStorage`.
 *
 * `null` until the first read, which happens after mount: the decks live in the
 * browser, so the server has nothing to render and a component that pretended
 * otherwise would mismatch on hydration. Callers treat `null` as "not counted
 * yet" rather than "none".
 */
export function useCustomDecks(): Deck[] | null {
  const [decks, setDecks] = useState<Deck[] | null>(null);

  const refresh = useCallback(() => setDecks(loadCustomDecks()), []);

  useEffect(() => {
    refresh();
    // `custom-decks-changed` is this tab; `storage` is another one.
    window.addEventListener("custom-decks-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("custom-decks-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return decks;
}
