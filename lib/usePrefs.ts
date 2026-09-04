"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PREFS,
  PREFS_EVENT,
  loadPrefs,
  savePrefs,
  type IndexPrefs,
} from "./prefs";

/**
 * The index preferences, kept in step with `localStorage`.
 *
 * Starts at the defaults, which is what the server rendered, so hydration
 * matches; the stored value arrives on mount. More than one component reads
 * this — the grid and the controls that change it sit at opposite ends of the
 * page — and `savePrefs` fires an event every instance listens for, so they
 * cannot drift apart.
 */
export function usePrefs(): [IndexPrefs, (next: IndexPrefs) => void] {
  const [prefs, setPrefs] = useState<IndexPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const read = () => {
      setPrefs(loadPrefs());
      // React renders the truth from here on, so the rules the pre-paint script
      // wrote have to go: they would otherwise keep hiding a deck that is
      // un-hidden. Harmless to call twice — the second finds nothing.
      document.getElementById("deck-prefs")?.remove();
    };
    read();
    window.addEventListener(PREFS_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(PREFS_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const update = useCallback((next: IndexPrefs) => {
    setPrefs(next);
    savePrefs(next);
  }, []);

  return [prefs, update];
}
