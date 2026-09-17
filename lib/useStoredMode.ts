"use client";

import { useLayoutEffect } from "react";
import { loadPrefs } from "./prefs";

/**
 * Marks the page with the reader's saved mode, for the pages that have no mode
 * of their own: the import screen and the print pages. Neither studies, but the
 * logo and the page's ground still say which app the reader is in, so going to
 * add a deck in free study does not look like switching to spaced repetition.
 *
 * A study page takes its mode from `?scheduled` instead, and the index from the
 * same preference through `LogoSun`. On a full load the script in
 * `app/layout.tsx` has set this already; this covers a client navigation, which
 * that script does not see, and runs before paint so the wrong logo never shows.
 *
 * `enabled` lets a component that serves more than one kind of page, like
 * `CustomDeckView`, use it only on the print one.
 */
export function useStoredMode(enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const html = document.documentElement;
    html.dataset.mode = loadPrefs().scheduled ? "schedule" : "free";
    return () => {
      delete html.dataset.mode;
    };
  }, [enabled]);
}
