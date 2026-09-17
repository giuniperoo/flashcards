"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  chooseModel,
  chooseProvider,
  clearApiKey,
  hideModel,
  keyHint,
  loadLlmStore,
  restoreModels,
  saveApiKey,
  type LlmStore,
} from "@/lib/apiKey";
import {
  GenerateError,
  generateDeck,
  listModels,
  preferredModel,
  type ModelOption,
} from "@/lib/generateDeck";
import {
  PROVIDERS,
  PROVIDER_INFO,
  keyProblem,
  type Provider,
} from "@/lib/llm/providers";

/** Multiples of eight, because eight cards fill one printed sheet. Offering
    only these is kinder than letting someone pick 25 and warning them after. */
const COUNTS = [8, 16, 24, 32];

/* 44px for a finger and 36px for a mouse, like every control in the app; see
   the tap target convention in CLAUDE.md. The selects trim their padding with a
   mouse too, or their line and border would hold them at 38px. */
const FIELD =
  "min-h-11 pointer-fine:min-h-9 w-full rounded-sm border border-rule bg-card px-3 text-base outline-none placeholder:text-muted focus:border-ink sm:text-sm";

const SELECT =
  "min-h-11 pointer-fine:min-h-9 w-full appearance-none rounded-sm border border-rule bg-card py-2 pl-3 pr-9 text-base pointer-fine:py-1.5 outline-none focus:border-ink disabled:cursor-not-allowed disabled:text-muted sm:text-sm";

const BUTTON =
  "press min-h-11 pointer-fine:min-h-9 shrink-0 rounded-sm border border-ink px-4 text-sm font-medium hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent";

const TEXT_BUTTON = "underline underline-offset-2 hover:text-ink";

/** The list of models a key can use, per provider and key, once it has been
    asked for. Kept for the visit, so switching providers back and forth does
    not ask again. */
type ModelList =
  | { status: "loading" }
  | { status: "ready"; options: ModelOption[] }
  | { status: "failed"; message: string };

/**
 * Asks a model for a deck and streams it into the importer's textarea: Claude,
 * OpenAI or Gemini, with the reader's own key and a model from that provider's
 * own list.
 *
 * It deliberately stops there. The generated text is parsed, previewed and
 * editable exactly like a paste, and saving is still a separate deliberate
 * press — a generated card is a claim someone is about to memorize, so reading
 * it first is the feature rather than a step to remove.
 */
export default function DeckGenerator({
  onText,
  current,
}: {
  /** Receives the deck text as it streams. */
  onText: (text: string) => void;
  /** What is in the textarea now, so a revision builds on any hand edits. */
  current: string;
}) {
  // Null until storage is read after mount, since it is not readable during the
  // server render; nothing renders until then, so the states do not flash past.
  const [store, setStore] = useState<LlmStore | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [editingKey, setEditingKey] = useState(false);

  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(24);
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const [lists, setLists] = useState<Record<string, ModelList>>({});

  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setStore(loadLlmStore());
  }, []);

  useEffect(() => () => abort.current?.abort(), []);

  const provider = store?.provider ?? "anthropic";
  const info = PROVIDER_INFO[provider];
  const apiKey = store?.keys[provider];
  const listKey = apiKey ? `${provider}:${apiKey}` : "";
  const list = listKey ? lists[listKey] : undefined;

  const fetchModels = useCallback(
    (forProvider: Provider, key: string, signal?: AbortSignal) => {
      const id = `${forProvider}:${key}`;
      setLists((all) => ({ ...all, [id]: { status: "loading" } }));
      listModels(forProvider, key, signal)
        .then((options) =>
          setLists((all) => ({ ...all, [id]: { status: "ready", options } })),
        )
        .catch((err) => {
          if (signal?.aborted) return;
          setLists((all) => ({
            ...all,
            [id]: {
              status: "failed",
              message:
                err instanceof GenerateError
                  ? err.message
                  : "Could not load the models. Try again.",
            },
          }));
        });
    },
    [],
  );

  // Asks the provider which models this key can use, once per provider and key.
  // Tracked in a ref rather than read off `lists`: depending on the lists would
  // re-run this as soon as the request marks itself loading, and a cleanup that
  // aborted it then would leave the select loading for good. Not aborted when
  // the provider changes either, so switching back finds the answer waiting.
  const requested = useRef(new Set<string>());
  useEffect(() => {
    if (!apiKey) return;
    const id = `${provider}:${apiKey}`;
    if (requested.current.has(id)) return;
    requested.current.add(id);
    fetchModels(provider, apiKey);
  }, [provider, apiKey, fetchModels]);

  // Without the models that have already failed for good on this key.
  const hidden = store?.hidden[provider] ?? [];
  const options =
    list?.status === "ready" ? list.options.filter((m) => !hidden.includes(m.id)) : [];
  const modelId = store ? preferredModel(provider, options, store.models[provider]) : null;
  const model = options.find((m) => m.id === modelId) ?? null;

  const switchProvider = (next: Provider) => {
    setStore(chooseProvider(next));
    setKeyDraft("");
    setEditingKey(false);
    setError(null);
  };

  const storeKey = () => {
    const value = keyDraft.trim();
    const problem = keyProblem(provider, value);
    if (problem) {
      setError(problem);
      return;
    }
    setStore(saveApiKey(provider, value));
    setKeyDraft("");
    setEditingKey(false);
    setError(null);
  };

  const forgetKey = () => {
    setStore(clearApiKey(provider));
    setKeyDraft("");
    setEditingKey(false);
    setError(null);
  };

  const run = async (revision: boolean) => {
    if (!apiKey || !model || busy) return;
    if (revision ? !note.trim() : !subject.trim()) return;

    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);

    try {
      const text = await generateDeck({
        provider,
        model,
        subject: subject.trim(),
        count,
        apiKey,
        previous: revision ? current : undefined,
        note: revision ? note.trim() : undefined,
        onText,
        signal: controller.signal,
      });
      if (text.trim()) {
        setGenerated(true);
        if (revision) setNote("");
      }
    } catch (err) {
      if (err instanceof GenerateError && err.unusableModel) {
        // Trying it again will fail the same way, so it comes off the list and
        // the next model takes its place, and the message says which.
        const next = hideModel(provider, model.id);
        setStore(next);
        const rest = options.filter((m) => m.id !== model.id);
        const replacement = rest.find(
          (m) => m.id === preferredModel(provider, rest, next.models[provider]),
        );
        setError(
          replacement
            ? `${model.label} can't write a deck from here, so it's off the list. ${replacement.label} is selected instead — try again.`
            : `${model.label} can't write a deck from here, and it was the last model on the list. Try another provider.`,
        );
      } else {
        setError(err instanceof GenerateError ? err.message : "Generation failed. Try again.");
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const stop = () => abort.current?.abort();

  if (!store) return null;

  return (
    <section className="cut mb-8 rounded-sm bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-base font-medium">Write one with AI</h2>
        <ProviderPicker value={provider} onChange={switchProvider} disabled={busy} />
      </div>

      {!apiKey || editingKey ? (
        <>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Needs your own {info.company} API key. It stays in this browser and
            calls {info.company}&rsquo;s API directly — nothing goes through a
            server, and a deck is billed to your own account.
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1 basis-64">
              <label htmlFor="api-key" className="sr-only">
                {info.company} API key
              </label>
              <input
                id="api-key"
                type="password"
                value={keyDraft}
                onChange={(e) => {
                  setKeyDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && storeKey()}
                placeholder={info.placeholder}
                autoComplete="off"
                spellCheck={false}
                className={`${FIELD} font-mono`}
              />
            </div>
            <button type="button" onClick={storeKey} className={BUTTON}>
              Save key
            </button>
            {editingKey && (
              <button
                type="button"
                onClick={() => {
                  setEditingKey(false);
                  setKeyDraft("");
                  setError(null);
                }}
                className="min-h-11 pointer-fine:min-h-9 shrink-0 px-2 text-sm text-muted hover:text-ink"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            <a href={info.keysUrl} target="_blank" rel="noreferrer" className={TEXT_BUTTON}>
              {info.keysLinkText}
            </a>
            <KeyAdvice provider={provider} />
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1 basis-64">
              <label htmlFor="subject" className="sr-only">
                What the deck is about
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void run(false)}
                placeholder="Postgres isolation levels"
                disabled={busy}
                className={FIELD}
              />
            </div>
            <label htmlFor="count" className="sr-only">
              How many cards
            </label>
            {/* `appearance-none` is the point: left native, the browser paints
                its own radius and stepper glyph and ignores everything the rest
                of these controls agree on. The chevron replaces it. */}
            <div className="relative shrink-0">
              <select
                id="count"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={busy}
                className={SELECT}
              >
                {COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n} cards
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
            {busy ? (
              <button type="button" onClick={stop} className={BUTTON}>
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void run(false)}
                disabled={!subject.trim() || !model}
                className={BUTTON}
              >
                Write the deck
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <label htmlFor="model" className="label text-muted">
              Model
            </label>
            {list?.status === "ready" && options.length > 0 ? (
              <div className="relative min-w-0 flex-1 basis-56 sm:flex-none">
                <select
                  id="model"
                  value={modelId ?? ""}
                  onChange={(e) => setStore(chooseModel(provider, e.target.value))}
                  disabled={busy}
                  className={SELECT}
                >
                  {options.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            ) : list?.status === "failed" ? (
              <p role="alert" className="text-sm text-error">
                {list.message}{" "}
                <button
                  type="button"
                  onClick={() => apiKey && fetchModels(provider, apiKey)}
                  className={`min-h-11 pointer-fine:min-h-9 ${TEXT_BUTTON}`}
                >
                  Try again
                </button>
              </p>
            ) : list?.status === "ready" ? (
              <p role="alert" className="text-sm text-error">
                This key can&rsquo;t use any model that writes text. Check the
                key&rsquo;s permissions, or use another provider.
              </p>
            ) : (
              <span role="status" className="flex min-h-11 pointer-fine:min-h-9 items-center text-sm text-muted">
                Loading the models this key can use…
              </span>
            )}
          </div>

          {generated && !busy && (
            <div className="mt-3 flex flex-wrap items-start gap-2 border-t border-rule pt-3">
              <div className="min-w-0 flex-1 basis-64">
                <label htmlFor="note" className="sr-only">
                  What to change
                </label>
                <input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void run(true)}
                  placeholder="Fewer definitions, more scenario questions"
                  className={FIELD}
                />
              </div>
              <button
                type="button"
                onClick={() => void run(true)}
                disabled={!note.trim() || !model}
                className={BUTTON}
              >
                Revise
              </button>
            </div>
          )}

          <p className="label mt-3 text-muted">
            {busy ? (
              <span role="status">Writing…</span>
            ) : (
              <>
                {info.company} key {keyHint(apiKey)}
                {" · "}
                <button type="button" onClick={() => setEditingKey(true)} className={TEXT_BUTTON}>
                  Change
                </button>
                {" · "}
                <button type="button" onClick={forgetKey} className={TEXT_BUTTON}>
                  Forget
                </button>
                {hidden.length > 0 && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => {
                        setStore(restoreModels(provider));
                        setError(null);
                      }}
                      className={TEXT_BUTTON}
                    >
                      {`Show ${hidden.length} hidden ${hidden.length === 1 ? "model" : "models"}`}
                    </button>
                  </>
                )}
              </>
            )}
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
}

/** What is worth knowing about a key before making one, per provider. */
function KeyAdvice({ provider }: { provider: Provider }) {
  switch (provider) {
    case "anthropic":
      return (
        <>
          {" "}
          — in that dialog, set <strong className="font-medium text-ink">Scope</strong> to a{" "}
          <em>specific</em> workspace such as &ldquo;Default&rdquo;.
        </>
      );
    case "openai":
      return (
        <>
          {" "}
          — a project key with a monthly budget set is the safest kind to keep in a
          browser.
        </>
      );
    case "gemini":
      return null;
  }
}

/**
 * Which provider writes the deck: a bar of three, like the mode bar on the
 * index, so every choice is on show. A radio group underneath: Tab reaches it
 * once and the arrow keys move between the providers.
 */
function ProviderPicker({
  value,
  onChange,
  disabled,
}: {
  value: Provider;
  onChange: (provider: Provider) => void;
  disabled: boolean;
}) {
  const name = useId();
  return (
    <span role="radiogroup" aria-label="Who writes the deck" className="inline-flex min-h-11 pointer-fine:min-h-9 items-center">
      <span className="segment-bar">
        {PROVIDERS.map((provider) => (
          <label key={provider} className={provider === value ? "chosen" : undefined}>
            <input
              type="radio"
              name={name}
              checked={provider === value}
              onChange={() => onChange(provider)}
              disabled={disabled}
              aria-label={PROVIDER_INFO[provider].name}
              className="sr-only"
            />
            <span aria-hidden>{PROVIDER_INFO[provider].name}</span>
          </label>
        ))}
      </span>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 6"
      className="pointer-events-none absolute right-3 top-1/2 h-[6px] w-[10px] -translate-y-1/2 text-muted"
    >
      <path
        d="M1 1l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
