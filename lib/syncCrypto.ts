/**
 * Turning a sync key into where its data lives and the key that locks it, with
 * nothing but the browser's own Web Crypto.
 *
 * The key never leaves the device. PBKDF2 stretches it, slowly on purpose, into
 * one secret, and HKDF splits that into two unrelated halves: an `id`, which is
 * all the server is told, and an AES-GCM key, which encrypts the payload before
 * it is sent. Knowing the id does not give the AES key.
 *
 * The salt is the same for everyone, and has to be: with no account there is
 * nowhere to keep a salt of one's own, since finding it would need the key it
 * protects. That means one guess, stretched once, can be checked against every
 * stored id at once. The stretching is what makes each guess cost something,
 * and the note beside the key field says plainly that a simple key can be
 * guessed. See `components/SyncPanel.tsx`.
 */

import { KEY_WORDS } from "./syncWords";

const SALT = "flashcards sync v1";

/** OWASP's figure for PBKDF2-SHA256: a fraction of a second on a phone, and
    each guess costs the same. */
const ITERATIONS = 600_000;

export const MIN_KEY_LENGTH = 8;

const encoder = new TextEncoder();

/** What a typed key means: spaces at either end are a paste, not part of it. */
export function normalizeKey(key: string) {
  return key.normalize("NFC").trim();
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

function fromBase64(text: string) {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type SyncKeys = {
  /** 64 hex characters: where the server keeps this key's data. */
  id: string;
  /** The AES-256 key, as base64, so it can be kept and the stretching skipped. */
  secret: string;
};

export async function deriveKeys(key: string): Promise<SyncKeys> {
  const subtle = globalThis.crypto.subtle;
  const password = await subtle.importKey("raw", encoder.encode(normalizeKey(key)), "PBKDF2", false, [
    "deriveBits",
  ]);
  const stretched = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(SALT), iterations: ITERATIONS },
    password,
    256,
  );
  const master = await subtle.importKey("raw", stretched, "HKDF", false, ["deriveBits"]);
  const half = (info: string) =>
    subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(info) },
      master,
      256,
    );
  const [id, secret] = await Promise.all([half("id"), half("encrypt")]);
  return { id: hex(id), secret: toBase64(new Uint8Array(secret)) };
}

function aesKey(secret: string) {
  return globalThis.crypto.subtle.importKey("raw", fromBase64(secret), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/** A fresh 12-byte nonce on every call, sent in front of the ciphertext. */
export async function encrypt(text: string, secret: string): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const sealed = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesKey(secret),
    encoder.encode(text),
  );
  const out = new Uint8Array(iv.length + sealed.byteLength);
  out.set(iv);
  out.set(new Uint8Array(sealed), iv.length);
  return toBase64(out);
}

/** Throws if the data was not sealed with this key, or has been changed since. */
export async function decrypt(data: string, secret: string): Promise<string> {
  const bytes = fromBase64(data);
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.subarray(0, 12) },
    await aesKey(secret),
    bytes.subarray(12),
  );
  return new TextDecoder().decode(plain);
}

/** A uniformly random index below `n`: rejection sampling, since 2^32 is not
    a multiple of most list lengths and the leftover would favor the first words. */
function pick(n: number) {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const one = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(one);
  while (one[0] >= limit);
  return one[0] % n;
}

/**
 * A key to suggest: an adjective, a noun and a verb, like "pink pony charging".
 * See `lib/syncWords.ts` for the lists and what their size is worth.
 */
export function suggestKey() {
  const { adjectives, nouns, verbs } = KEY_WORDS;
  return [adjectives, nouns, verbs].map((list) => list[pick(list.length)]).join(" ");
}
