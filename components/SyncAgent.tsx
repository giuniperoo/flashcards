"use client";

import { useEffect } from "react";
import { CUSTOM_EVENT } from "@/lib/customDecks";
import { PROGRESS_EVENT } from "@/lib/progress";
import { isApplying, setReservedSlugs, syncNow, syncStatus } from "@/lib/sync";

/** Long enough that a run of grades goes up as one sync, short enough that
    putting the phone down a minute later finds it already sent. */
const SETTLE_MS = 4000;

/**
 * When to sync, on every page: on arrival, a few seconds after progress or the
 * imported decks change, when the tab is left, when it is come back to, and
 * when the connection returns. Draws nothing. Does nothing at all on a device
 * that has not turned sync on, beyond reading one key.
 *
 * In the layout, since a grade is given on a study page and the panel that
 * turns sync on is on the index.
 */
export default function SyncAgent({ slugs }: { slugs: string[] }) {
  useEffect(() => {
    setReservedSlugs(slugs);
  }, [slugs]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;

    const run = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (syncStatus().state === "off") return;
      lastRun = Date.now();
      void syncNow();
    };

    const changed = () => {
      if (isApplying() || syncStatus().state === "off") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, SETTLE_MS);
    };

    const visibility = () => {
      if (document.visibilityState === "hidden") {
        // Whatever was waiting goes now, while the page is still allowed to.
        if (timer) run();
      } else if (Date.now() - lastRun > 60_000) {
        run();
      }
    };

    run();
    window.addEventListener(PROGRESS_EVENT, changed);
    window.addEventListener(CUSTOM_EVENT, changed);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(PROGRESS_EVENT, changed);
      window.removeEventListener(CUSTOM_EVENT, changed);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return null;
}
