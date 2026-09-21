/**
 * Which voice the interface speaks in: plain, or Al Swearengen's.
 *
 * Plain is the default. `?swearengen` on any address turns the other voice on
 * and `?swearengen=off` turns it off again; either way the choice is kept in a
 * cookie, so it holds on every page after it without links having to carry
 * it. A cookie and not `localStorage`, because the two routes that answer in
 * words, the sync API and the export route, run on the server, and a cookie is
 * the one thing they can read off the request.
 *
 * The pre-paint script in `app/layout.tsx` reads the address and the cookie
 * and sets `data-voice` on `<html>` before anything is drawn. In the browser
 * that attribute is the authority: `currentVoice` reads it, and CSS keyed off
 * it chooses which of the two versions `<Say>` rendered is shown. With scripts
 * off it is never set, and the interface is plain.
 *
 * The words themselves are in `lib/copy.ts`.
 */

export type Voice = "plain" | "swearengen";

export const VOICE_PARAM = "swearengen";
export const VOICE_COOKIE = "voice";

/** The voice a request's cookie header asks for. For the server's routes. */
export function voiceFromCookie(header: string | null | undefined): Voice {
  return header && /(?:^|;\s*)voice=swearengen(?:;|$)/.test(header) ? "swearengen" : "plain";
}

let override: Voice | null = null;

/** Tests run without a document; this lets one of them speak in either voice. */
export function setVoiceForTests(voice: Voice | null) {
  override = voice;
}

/**
 * The voice this page is in. Plain on the server, where prerendered pages are
 * the same for everyone, and plain in a test unless the test says otherwise.
 */
export function currentVoice(): Voice {
  if (override) return override;
  if (typeof document === "undefined") return "plain";
  return document.documentElement.getAttribute("data-voice") === "swearengen" ? "swearengen" : "plain";
}
