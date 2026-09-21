import { say, type PlainKey } from "../copy";
/**
 * The model providers a deck can be written with, and what differs between them
 * before any request is made: what they are called, where a key comes from, and
 * what a key looks like.
 *
 * All three are called straight from the browser with the reader's own key, as
 * Claude always was. Each answers a CORS preflight from a page, which was checked
 * before any of this was written; a provider that did not could not be added
 * without a server, and the app has none.
 *
 * Pure values and functions, safe anywhere.
 */

export type Provider = "anthropic" | "openai" | "gemini";

/** In the order the picker shows them. Claude first, since it came first. */
export const PROVIDERS: Provider[] = ["anthropic", "openai", "gemini"];

export type ProviderInfo = {
  /** What the picker and the copy call it. */
  name: string;
  /** Whose account the key and the bill belong to. */
  company: string;
  placeholder: string;
  keysUrl: string;
  /** The words on the link to where keys are made; see `lib/copy.ts`. */
  keysLink: PlainKey;
};

export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  anthropic: {
    name: "Claude",
    company: "Anthropic",
    placeholder: "sk-ant-...",
    keysUrl: "https://platform.claude.com/settings/keys",
    keysLink: "keys.linkAnthropic",
  },
  openai: {
    name: "OpenAI",
    company: "OpenAI",
    placeholder: "sk-...",
    keysUrl: "https://platform.openai.com/api-keys",
    keysLink: "keys.linkOpenai",
  },
  gemini: {
    name: "Gemini",
    company: "Google",
    placeholder: "AQ... or AIza...",
    keysUrl: "https://aistudio.google.com/apikey",
    keysLink: "keys.linkGemini",
  },
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as string[]).includes(value);
}

/* What each provider's keys look like. Checked so a typo, or a key pasted under
   the wrong provider, fails here with a message that says which, rather than as
   a rejected request. `sk-` alone is not proof of OpenAI, since other providers
   use it too; it only has to rule out the two this app knows are someone else's. */
const ANTHROPIC = /^sk-ant-[A-Za-z0-9_-]{20,}$/;
const OPENAI = /^sk-[A-Za-z0-9_-]{20,}$/;
/* Google has two: the long-standing `AIza…`, and `AQ.…`, which Google AI Studio
   hands out now. The newer one's alphabet is not documented here, so past its
   prefix it only has to be long and unbroken; a key that is wrong after that is
   the API's to reject, with a message that says so. */
const GEMINI = /^(?:AIza[A-Za-z0-9_-]{30,}|AQ\.\S{20,})$/;

const AN_OWNER: Record<Provider, string> = {
  anthropic: "an Anthropic",
  openai: "an OpenAI",
  gemini: "a Google",
};

function looksLike(key: string): Provider | null {
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return "gemini";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

/**
 * What is wrong with a key for this provider, or null if it looks right. A key
 * that belongs to one of the other providers says so by name, since pasting the
 * Anthropic key into the OpenAI field is the likeliest mistake there is once
 * there are two fields.
 */
export function keyProblem(provider: Provider, raw: string): string | null {
  const key = raw.trim();
  const shape = { anthropic: ANTHROPIC, openai: OPENAI, gemini: GEMINI }[provider];
  const other = looksLike(key);
  // Checked by prefix before shape: an Anthropic key is `sk-` too, and would
  // otherwise pass as an OpenAI one.
  if (shape.test(key) && (other === null || other === provider)) return null;

  if (other && other !== provider) {
    return say("keys.wrongProvider", AN_OWNER[other], PROVIDER_INFO[other].name, PROVIDER_INFO[provider].company);
  }

  switch (provider) {
    case "anthropic":
      return say("keys.notAnthropic");
    case "openai":
      return say("keys.notOpenai");
    case "gemini":
      return say("keys.notGemini");
  }
}
