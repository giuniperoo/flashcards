"use client";

import type { PlainKey } from "@/lib/copy";
import { useSay, useVoice } from "@/lib/useSay";
import { useTabTitle } from "@/lib/useTabTitle";

/**
 * The tab's title in the other voice. A page's `metadata` is plain, since the
 * server prerenders it for everyone; in plain this draws nothing and leaves it
 * alone, and in Swearengen's voice it names the tab from the same entry.
 */
export default function VoiceTitle({ k }: { k: PlainKey }) {
  const voice = useVoice();
  const say = useSay();
  const words = say(k);
  useTabTitle(voice === "swearengen" ? `${words} · Flashcards` : null);
  return null;
}
