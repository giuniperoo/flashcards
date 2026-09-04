/**
 * The user's own Anthropic API key, for generating decks from the browser.
 *
 * Deliberately its own storage key rather than a field on the deck store.
 * `decks:custom` is the thing an export button serialises (see TASKS.md task
 * 4), and a credential that rides along inside a deck export is exactly the
 * leak you don't find until someone has already sent the file to a friend.
 *
 * The key is held in `localStorage`, which is readable by any script running on
 * the page. That is safe here only because nothing in this app renders
 * user-supplied text as HTML — an imported deck is inert text. The single
 * `dangerouslySetInnerHTML` in the app, in `app/layout.tsx`, is a constant
 * string that never touches deck content. If either of those changes, a
 * malicious deck could read this key, and this store needs to change with it.
 */

export const KEY_STORAGE = "llm:key";
export const KEY_VERSION = 1;

type KeyStore = { version: 1; key: string };

/** Anthropic keys are `sk-ant-…`. Checked so a typo fails here, with a message
    that says what's wrong, rather than as a 401 from an API round trip. */
const SHAPE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export function isWellFormed(key: string) {
  return SHAPE.test(key.trim());
}

export function loadApiKey(): string | null {
  return read()?.key ?? null;
}

function read(): KeyStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KeyStore;
    return typeof parsed?.key === "string" && parsed.key ? parsed : null;
  } catch {
    return null;
  }
}

export function saveApiKey(key: string) {
  const store: KeyStore = { version: KEY_VERSION, key: key.trim() };
  window.localStorage.setItem(KEY_STORAGE, JSON.stringify(store));
}

export function clearApiKey() {
  window.localStorage.removeItem(KEY_STORAGE);
}

/** Last four characters, for confirming which key is stored without showing it. */
export function keyHint(key: string) {
  return `…${key.slice(-4)}`;
}
