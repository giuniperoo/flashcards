import { isProvider, type Provider } from "./llm/providers";

/**
 * The reader's own API keys, for generating decks from the browser, with the
 * provider they last used and the model they picked for each.
 *
 * Deliberately its own storage key rather than a field on the deck store.
 * `decks:custom` is the thing an export button serializes (see TASKS.md task
 * 4), and a credential that rides along inside a deck export is exactly the
 * leak you don't find until someone has already sent the file to a friend.
 *
 * The keys are held in `localStorage`, which is readable by any script running
 * on the page. That is safe here only because nothing in this app renders
 * user-supplied text as HTML — an imported deck is inert text. The only
 * `dangerouslySetInnerHTML` in the app, in `app/layout.tsx`, is a constant
 * string that never touches deck content. If either of those changes, a
 * malicious deck could read these keys, and this store needs to change with it.
 * There can now be three of them, which is three times the reason.
 *
 * `hidden` is the models that failed in a way that will not change — not a
 * model that writes text this way, or not one the key can reach after all —
 * so the list stops offering them. It belongs to the key: saving a different
 * one, or forgetting it, brings them back, since a new key can reach
 * different models. It arrived inside version 2, and reads as nothing hidden
 * when absent.
 *
 * Version 1 held one Anthropic key, `{ version: 1, key }`, from when Claude was
 * the only provider. It reads as version 2 with that key under Anthropic and
 * Anthropic chosen, and is written back that way on the first read.
 */

export const KEY_STORAGE = "llm:key";
export const KEY_VERSION = 2;

export type LlmStore = {
  version: 2;
  provider: Provider;
  keys: Partial<Record<Provider, string>>;
  models: Partial<Record<Provider, string>>;
  hidden: Partial<Record<Provider, string[]>>;
};

const EMPTY: LlmStore = { version: 2, provider: "anthropic", keys: {}, models: {}, hidden: {} };

function strings(value: unknown): Partial<Record<Provider, string>> {
  const out: Partial<Record<Provider, string>> = {};
  if (!value || typeof value !== "object") return out;
  for (const [name, entry] of Object.entries(value)) {
    if (isProvider(name) && typeof entry === "string" && entry) out[name] = entry;
  }
  return out;
}

function lists(value: unknown): Partial<Record<Provider, string[]>> {
  const out: Partial<Record<Provider, string[]>> = {};
  if (!value || typeof value !== "object") return out;
  for (const [name, entry] of Object.entries(value)) {
    if (!isProvider(name) || !Array.isArray(entry)) continue;
    const ids = entry.filter((id): id is string => typeof id === "string" && id !== "");
    if (ids.length) out[name] = ids;
  }
  return out;
}

export function loadLlmStore(): LlmStore {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY_STORAGE);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;

    if (parsed?.version === 1) {
      const key = typeof parsed.key === "string" ? parsed.key : "";
      const migrated: LlmStore = { ...EMPTY, keys: key ? { anthropic: key } : {} };
      write(migrated);
      return migrated;
    }

    return {
      version: 2,
      provider: isProvider(parsed?.provider) ? parsed.provider : EMPTY.provider,
      keys: strings(parsed?.keys),
      models: strings(parsed?.models),
      hidden: lists(parsed?.hidden),
    };
  } catch {
    return EMPTY;
  }
}

function write(store: LlmStore) {
  try {
    window.localStorage.setItem(KEY_STORAGE, JSON.stringify(store));
  } catch {
    // A private window or a full quota: the key still works for this visit.
  }
}

function update(change: (store: LlmStore) => LlmStore) {
  const next = change(loadLlmStore());
  write(next);
  return next;
}

export function saveApiKey(provider: Provider, key: string) {
  return update((s) => {
    const hidden = { ...s.hidden };
    delete hidden[provider];
    return { ...s, provider, keys: { ...s.keys, [provider]: key.trim() }, hidden };
  });
}

/** Forgets one provider's key, and the model picked with it, leaving the
    others where they are. */
export function clearApiKey(provider: Provider) {
  return update((s) => {
    const keys = { ...s.keys };
    const models = { ...s.models };
    const hidden = { ...s.hidden };
    delete keys[provider];
    delete models[provider];
    delete hidden[provider];
    return { ...s, keys, models, hidden };
  });
}

export function chooseProvider(provider: Provider) {
  return update((s) => ({ ...s, provider }));
}

export function chooseModel(provider: Provider, model: string) {
  return update((s) => ({ ...s, models: { ...s.models, [provider]: model } }));
}

/** Takes a model off this provider's list, and off its choice if it was the
    one chosen, so the next model on the list takes its place. */
export function hideModel(provider: Provider, model: string) {
  return update((s) => {
    const models = { ...s.models };
    if (models[provider] === model) delete models[provider];
    const current = s.hidden[provider] ?? [];
    const hidden = current.includes(model) ? current : [...current, model];
    return { ...s, models, hidden: { ...s.hidden, [provider]: hidden } };
  });
}

/** Puts every hidden model back on this provider's list. */
export function restoreModels(provider: Provider) {
  return update((s) => {
    const hidden = { ...s.hidden };
    delete hidden[provider];
    return { ...s, hidden };
  });
}

/** Last four characters, for confirming which key is stored without showing it. */
export function keyHint(key: string) {
  return `…${key.slice(-4)}`;
}
