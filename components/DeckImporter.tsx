"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseDeck, EXAMPLE_DECK } from "@/lib/parseDeck";
import { saveCustomDeck } from "@/lib/customDecks";
import DeckGenerator from "./DeckGenerator";

const ACCEPT = ".txt,.md,.markdown,.text,.csv,.tsv,.rtf";

/** Strip RTF control words well enough to recover plain text from TextEdit. */
function fromRtf(source: string) {
  return source
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\par[d]?\b/g, "\n")
    .replace(/\\line\b/g, "\n")
    .replace(/\\[a-z]+-?\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .trim();
}

export default function DeckImporter({
  reservedSlugs,
  reservedTints,
}: {
  /** Built-in deck slugs, read from `content/` on the server so an import
      cannot claim a slug a committed deck already owns. */
  reservedSlugs: string[];
  /** Built-in deck tints, so a new deck is given a colour unlike them. */
  reservedTints: string[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => (text.trim() ? parseDeck(text) : null),
    [text],
  );
  const canSave = !!parsed && parsed.cards.length > 0;

  const readFile = async (file: File) => {
    const raw = await file.text();
    const isRtf = file.name.toLowerCase().endsWith(".rtf");
    setText(isRtf ? fromRtf(raw) : raw);
    setFileName(file.name);
    setSaveError(null);
  };

  const save = () => {
    if (!parsed || parsed.cards.length === 0) return;
    try {
      const deck = saveCustomDeck({
        title: parsed.title,
        blurb: parsed.blurb,
        tint: parsed.tint,
        cards: parsed.cards,
        reservedSlugs,
        reservedTints,
      });
      router.push(`/study/${deck.slug}`);
    } catch {
      setSaveError(
        "Could not save — browser storage is full or unavailable. Try a smaller deck, or a normal (non-private) window.",
      );
    }
  };

  return (
    <div>
      <DeckGenerator
        current={text}
        onText={(next) => {
          setText(next);
          setFileName(null);
          setSaveError(null);
        }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-sm border border-rule px-4 text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Choose a file
        </button>
        <button
          type="button"
          onClick={() => {
            setText(EXAMPLE_DECK);
            setFileName(null);
          }}
          className="min-h-11 rounded-sm border border-rule px-4 text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Load the example
        </button>
        <span className="label text-muted">
          {fileName ?? ".txt, .md, .csv, .tsv or .rtf"}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <label htmlFor="deck-source" className="label mb-2 block text-muted">
        Or paste the deck here
      </label>
      <textarea
        id="deck-source"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFileName(null);
          setSaveError(null);
        }}
        rows={14}
        spellCheck={false}
        placeholder={"# My deck\n\nQ: First question?\nA: First answer."}
        className="w-full resize-y rounded-sm border border-rule bg-card p-3 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted focus:border-ink"
      />

      {parsed && (
        <div className="cut mt-4 rounded-sm bg-card px-5 py-4">
          <p className="text-sm">
            <strong className="font-medium">{parsed.title}</strong> —{" "}
            {parsed.cards.length}{" "}
            {parsed.cards.length === 1 ? "card" : "cards"} found
            {parsed.tint && (
              <span
                aria-hidden
                className="ml-2 inline-block h-3 w-3 rounded-[2px] align-middle"
                style={{ background: parsed.tint }}
              />
            )}
          </p>

          {parsed.errors.length > 0 && (
            <ul role="alert" className="mt-3 space-y-1">
              {parsed.errors.map((issue, i) => (
                <li key={i} className="text-sm text-[#a32d2d]">
                  Line {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          )}

          {parsed.warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {parsed.warnings.slice(0, 5).map((issue, i) => (
                <li key={i} className="text-sm text-muted">
                  Line {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          )}

          {parsed.cards.length > 0 && (
            <ol className="mt-4 space-y-3 border-t border-rule pt-4">
              {parsed.cards.slice(0, 3).map((card, i) => (
                <li key={i}>
                  <p className="text-sm font-medium">{card.q}</p>
                  <p className="mt-1 text-sm text-muted">{card.a}</p>
                </li>
              ))}
              {parsed.cards.length > 3 && (
                <li className="label text-muted">
                  and {parsed.cards.length - 3} more
                </li>
              )}
            </ol>
          )}
        </div>
      )}

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-[#a32d2d]">
          {saveError}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="mt-4 min-h-11 w-full rounded-sm border border-ink px-4 text-sm font-medium hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent sm:w-auto sm:px-6"
      >
        {canSave
          ? `Add ${parsed!.cards.length} ${parsed!.cards.length === 1 ? "card" : "cards"}`
          : "Add deck"}
      </button>
    </div>
  );
}
