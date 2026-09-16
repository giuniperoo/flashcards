"use client";

import { useEffect, useState } from "react";
import { PROGRESS_KEY, peekProgress } from "./progress";
import { dueByDeck } from "./queue";
import { dayKey } from "./schedule";

/**
 * How many cards each deck owes today, by slug, for the deck cards on the index.
 *
 * Empty until mount, which is what the server rendered: progress lives in the
 * browser. The read lands in the same commit as the preferences and the
 * imported decks, whose hooks also read on mount, so a deck card arrives with
 * its count rather than gaining one a frame later.
 *
 * Read again when another tab writes the store. The reviewer in this tab is on
 * another route, and coming back to the index mounts this afresh.
 */
export function useDueCounts(): Record<string, number> {
  const [due, setDue] = useState<Record<string, number>>({});

  useEffect(() => {
    const read = () => setDue(dueByDeck(peekProgress(), dayKey(), Date.now()));
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PROGRESS_KEY) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return due;
}
