"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearApiKey,
  isWellFormed,
  keyHint,
  loadApiKey,
  saveApiKey,
} from "@/lib/apiKey";

/** Multiples of eight, because eight cards fill one printed sheet. Offering
    only these is kinder than letting someone pick 25 and warning them after. */
const COUNTS = [8, 16, 24, 32];

const KEYS_URL = "https://platform.claude.com/settings/keys";

const FIELD =
  "min-h-11 w-full rounded-sm border border-rule bg-card px-3 text-base outline-none placeholder:text-muted focus:border-ink sm:text-sm";

const BUTTON =
  "min-h-11 shrink-0 rounded-sm border border-ink px-4 text-sm font-medium hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent";

/**
 * Asks Claude for a deck and streams it into the importer's textarea.
 *
 * It deliberately stops there. The generated text is parsed, previewed and
 * editable exactly like a paste, and saving is still a separate deliberate
 * press — a generated card is a claim someone is about to memorise, so reading
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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [editingKey, setEditingKey] = useState(false);

  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(24);
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const abort = useRef<AbortController | null>(null);

  // localStorage is not readable during the server render, so the key is
  // picked up after mount. `ready` keeps the two states from flashing past
  // each other on the way through.
  useEffect(() => {
    setApiKey(loadApiKey());
    setReady(true);
  }, []);

  useEffect(() => () => abort.current?.abort(), []);

  const storeKey = () => {
    const value = keyDraft.trim();
    if (!isWellFormed(value)) {
      setError(
        "That doesn't look like an Anthropic key — they start with sk-ant- . Copy the whole thing from the console.",
      );
      return;
    }
    saveApiKey(value);
    setApiKey(value);
    setKeyDraft("");
    setEditingKey(false);
    setError(null);
  };

  const forgetKey = () => {
    clearApiKey();
    setApiKey(null);
    setKeyDraft("");
    setEditingKey(false);
  };

  const run = async (revision: boolean) => {
    if (!apiKey || busy) return;
    if (revision ? !note.trim() : !subject.trim()) return;

    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);

    // Loaded on demand so the Anthropic SDK stays out of the bundle for
    // everyone who only came here to paste a deck.
    const mod = await import("@/lib/generateDeck");

    try {
      const text = await mod.generateDeck({
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
      setError(
        err instanceof mod.GenerateError
          ? err.message
          : "Generation failed. Try again.",
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const stop = () => abort.current?.abort();

  if (!ready) return null;

  return (
    <section className="cut mb-8 rounded-sm bg-card px-5 py-4">
      <h2 className="text-base font-medium">Write one with Claude</h2>

      {!apiKey || editingKey ? (
        <>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Needs your own Anthropic API key. It stays in this browser and calls
            the API directly — nothing goes through a server, and a deck costs a
            fraction of a penny on your account.
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1 basis-64">
              <label htmlFor="api-key" className="sr-only">
                Anthropic API key
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
                placeholder="sk-ant-..."
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
                className="min-h-11 shrink-0 px-2 text-sm text-muted hover:text-ink"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            <a
              href={KEYS_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              Get a key from the Anthropic console
            </a>{" "}
            — in that dialog, set{" "}
            <strong className="font-medium text-ink">Scope</strong> to a{" "}
            <em>specific</em> workspace such as &ldquo;Default&rdquo;.
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
                of these controls agree on. The chevron below replaces it. */}
            <div className="relative shrink-0">
              <select
                id="count"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={busy}
                className="min-h-11 w-full appearance-none rounded-sm border border-rule bg-card py-2 pl-3 pr-9 text-base outline-none focus:border-ink disabled:cursor-not-allowed disabled:text-muted sm:text-sm"
              >
                {COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n} cards
                  </option>
                ))}
              </select>
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
            </div>
            {busy ? (
              <button type="button" onClick={stop} className={BUTTON}>
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void run(false)}
                disabled={!subject.trim()}
                className={BUTTON}
              >
                Write the deck
              </button>
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
                disabled={!note.trim()}
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
                Key {keyHint(apiKey)}
                {" · "}
                <button
                  type="button"
                  onClick={() => setEditingKey(true)}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Change
                </button>
                {" · "}
                <button
                  type="button"
                  onClick={forgetKey}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Forget
                </button>
              </>
            )}
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a32d2d]">
          {error}
        </p>
      )}
    </section>
  );
}
