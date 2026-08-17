"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudyCard } from "@/lib/decks";

type Grade = "held" | "review";

type Saved = {
  drafts: Record<string, string>;
  grades: Record<string, Grade>;
};

const empty: Saved = { drafts: {}, grades: {} };

function cardKey(card: StudyCard) {
  return `${card.deck.slug}:${card.index}`;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT");
}

export default function Reviewer({
  cards,
  storageKey,
}: {
  cards: StudyCard[];
  storageKey: string;
}) {
  const [order, setOrder] = useState(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<Saved>(empty);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const card = order[position];
  const key = cardKey(card);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setSaved({ ...empty, ...(JSON.parse(raw) as Saved) });
    } catch {
      // A corrupt or unavailable store just means starting fresh.
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // Private mode or a full quota — progress simply will not persist.
    }
  }, [saved, storageKey, ready]);

  // Read through a ref so committing a draft — which replaces saved.drafts —
  // does not count as a card change and turn the card back over.
  const draftsRef = useRef(saved.drafts);
  useEffect(() => {
    draftsRef.current = saved.drafts;
  }, [saved.drafts]);

  useEffect(() => {
    setDraft(draftsRef.current[key] ?? "");
    setFlipped(false);
    setError(false);
  }, [key, ready]);

  const commitDraft = useCallback(
    (value: string) => {
      setSaved((prev) => ({ ...prev, drafts: { ...prev.drafts, [key]: value } }));
    },
    [key],
  );

  const move = useCallback(
    (step: number) => {
      commitDraft(draft);
      setPosition((p) => (p + step + order.length) % order.length);
    },
    [commitDraft, draft, order.length],
  );

  const flip = useCallback(() => {
    if (flipped) {
      setFlipped(false);
      return;
    }
    if (!draft.trim()) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    commitDraft(draft);
    setFlipped(true);
  }, [flipped, draft, commitDraft]);

  const grade = useCallback(
    (value: Grade) => {
      setSaved((prev) => ({ ...prev, grades: { ...prev.grades, [key]: value } }));
      move(1);
    },
    [key, move],
  );

  const shuffle = useCallback(() => {
    commitDraft(draft);
    setOrder((current) => shuffled(current));
    setPosition(0);
  }, [commitDraft, draft]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        flip();
        return;
      }
      if (isTyping(event.target) || event.metaKey || event.ctrlKey) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (flipped && (event.key === "1" || event.key.toLowerCase() === "k")) {
        event.preventDefault();
        grade("held");
      } else if (flipped && (event.key === "2" || event.key.toLowerCase() === "r")) {
        event.preventDefault();
        grade("review");
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        shuffle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, move, grade, shuffle, flipped]);

  const tally = useMemo(() => {
    const values = order.map((c) => saved.grades[cardKey(c)]);
    return {
      held: values.filter((v) => v === "held").length,
      review: values.filter((v) => v === "review").length,
    };
  }, [order, saved.grades]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="label text-muted">
          <span
            aria-hidden
            className="mr-2 inline-block h-2 w-2 rounded-[2px] align-middle"
            style={{ background: card.deck.ink }}
          />
          {card.deck.name} · card {card.index + 1}
        </span>
        <div className="flex items-center gap-3">
          <span className="label text-muted" aria-live="polite">
            {position + 1}/{order.length}
            {tally.held + tally.review > 0 && (
              <> · {tally.held} held · {tally.review} to revisit</>
            )}
          </span>
          <button
            type="button"
            onClick={shuffle}
            className="label min-h-9 rounded-sm border border-rule px-3 text-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Shuffle
          </button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Card {position + 1} of {order.length}, {card.deck.name}.{" "}
        {flipped ? "Showing the answer." : "Showing the question."}
      </p>

      <div className="[perspective:1600px]">
        <div className="flip" data-face={flipped ? "back" : "front"}>
          <Face tint={card.deck.tint} hidden={flipped}>
            <p className="label" style={{ color: "var(--color-question)" }}>
              Question
            </p>
            <p className="mt-3 text-lg leading-snug font-medium sm:text-xl">
              {card.q}
            </p>
            <label htmlFor="recall" className="sr-only">
              Write your answer before turning the card over
            </label>
            <textarea
              id="recall"
              ref={inputRef}
              rows={4}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError(false);
              }}
              onBlur={() => commitDraft(draft)}
              aria-invalid={error}
              aria-describedby={error ? "recall-error" : undefined}
              placeholder="Write it from memory. A half answer still counts."
              className="mt-5 w-full resize-y rounded-sm border border-rule bg-transparent p-3 text-base leading-relaxed outline-none placeholder:text-muted focus:border-ink sm:text-[15px]"
            />
            {error && (
              <p id="recall-error" role="alert" className="mt-2 text-sm text-[#a32d2d]">
                Write something first — the guess is the part that works.
              </p>
            )}
          </Face>

          <Face tint={card.deck.tint} className="face-back" hidden={!flipped}>
            <p className="label" style={{ color: "var(--color-answer)" }}>
              Answer
            </p>
            <p className="mt-3 text-base leading-relaxed sm:text-[17px]">
              {card.a}
            </p>
            <div className="mt-5 border-t border-rule pt-4">
              <p className="label text-muted">You wrote</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {saved.drafts[key] || draft}
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => grade("held")}
                className="min-h-11 flex-1 rounded-sm border border-rule px-3 py-2 text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                I had it
              </button>
              <button
                type="button"
                onClick={() => grade("review")}
                className="min-h-11 flex-1 rounded-sm border border-rule px-3 py-2 text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Needs review
              </button>
            </div>
          </Face>
        </div>
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous card"
          className="min-h-11 w-14 rounded-sm border border-rule text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ←
        </button>
        <button
          type="button"
          onClick={flip}
          className="min-h-11 flex-1 rounded-sm border border-ink px-3 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {flipped ? "Turn back" : "Turn card over"}
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next card"
          className="min-h-11 w-14 rounded-sm border border-rule text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          →
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-[3px]" aria-hidden>
        {order.map((c, i) => {
          const g = saved.grades[cardKey(c)];
          return (
            <span
              key={cardKey(c)}
              className="h-[3px] min-w-[4px] flex-1 rounded-full"
              style={{
                background:
                  i === position
                    ? c.deck.ink
                    : g === "held"
                      ? "#9fe1cb"
                      : g === "review"
                        ? "#f7c1c1"
                        : "var(--color-rule)",
              }}
            />
          );
        })}
      </div>

      <p className="label mt-4 hidden text-muted sm:block">
        ⌘/Ctrl + Enter turn over · ← → move · 1 held · 2 revisit · S shuffle
      </p>
    </div>
  );
}

function Face({
  tint,
  className = "",
  hidden,
  children,
}: {
  tint: string;
  className?: string;
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={hidden}
      className={`face cut relative overflow-hidden rounded-sm bg-card px-4 py-5 sm:px-8 sm:py-6 ${className}`}
    >
      <span
        aria-hidden
        className="absolute top-0 right-0 h-8 w-8 sm:h-9 sm:w-9"
        style={{ background: tint, clipPath: "polygon(100% 0,0 0,100% 100%)" }}
      />
      {children}
    </div>
  );
}
