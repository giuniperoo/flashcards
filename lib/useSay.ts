import { useCallback, useLayoutEffect, useState } from "react";
import { pick, type CopyArgs, type CopyKey } from "./copy";
import { currentVoice, type Voice } from "./voice";

/**
 * The voice this page is in, for client components. Plain on the first
 * render, since that is what the server rendered and hydration has to match
 * it, and the reader's voice from a layout effect straight after, before the
 * browser paints. That is the same arrangement the storage hooks use, so
 * anything held back until they have read, the index and a scheduled
 * session, is never seen in the wrong voice.
 *
 * Text on the page should be a `<Say>` from `components/Voice.tsx`, which needs
 * neither. This is for the strings that cannot be markup: an `aria-label`, a
 * `placeholder`, a live region's sentence, a string another component takes.
 */
export function useVoice(): Voice {
  const [voice, setVoice] = useState<Voice>("plain");
  useLayoutEffect(() => {
    setVoice(currentVoice());
  }, []);
  return voice;
}

/** `say` for a component: a key's words in this page's voice. */
export function useSay() {
  const voice = useVoice();
  return useCallback(
    <K extends CopyKey>(key: K, ...args: CopyArgs<K>) => pick(key, voice, ...args),
    [voice],
  );
}
