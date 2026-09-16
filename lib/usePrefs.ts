"use client";

import { useCallback, useLayoutEffect, useState } from "react";
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
 * matches; the stored value arrives on mount, in a layout effect so that it is
 * in place before the browser paints. On a client navigation to the index that
 * is the whole of the fix for a frame of defaults; on a reload the server's
 * frame has already painted, and `data-index-pending` covers it. The built-in decks start off, so
 * the server renders an index without them and they arrive with the
 * preferences, the same way the imported decks do — nothing is painted and
 * then taken away. More than one component reads
 * this — the grid and the controls that change it sit at opposite ends of the
 * page — and `savePrefs` fires an event every instance listens for, so they
 * cannot drift apart.
 */
export function usePrefs(): [IndexPrefs, (next: IndexPrefs) => void] {
  const [prefs, setPrefs] = useState<IndexPrefs>(DEFAULT_PREFS);

  useLayoutEffect(() => {
    const read = () => setPrefs(loadPrefs());
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
