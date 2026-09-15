import { useEffect, useId, useRef, useState } from "react";

/*
 * What the strip's colors mean, behind a small "?" at the end of the strip.
 *
 * The strip is four colors and a gray on a schedule, and nothing else on screen
 * says what any of them mean. A reader who answers a new card right, sees orange
 * and expects green concludes the app is broken — that happened, and the strip
 * was briefly changed to go green on one right answer before being changed back.
 *
 * The key is drawn in the strip's own terms: each color is a dash at the size it
 * actually appears, three pixels tall, not a swatch redrawn larger and
 * differently. The card you are on is the taller dash in the deck's ink.
 *
 * A tap or click opens it and it stays open until dismissed: the close button,
 * Escape, the "?" again, or a press anywhere else. A mouse pointing at the "?"
 * previews it without that. The reviewer opens it itself once, the first time a
 * scheduled session starts, and closes it when the card is turned.
 *
 * Imported only by `Reviewer`, so like `QueueBar` it runs in the browser without
 * a directive of its own.
 */

const SCHEDULED_ROWS: Array<[string, string]> = [
  ["var(--color-rule)", "Not answered yet"],
  ["var(--color-box-1)", "You marked it “Needs review”"],
  ["var(--color-box-2)", "One right answer in a row"],
  ["var(--color-box-3)", "Two right answers in a row"],
  ["var(--color-box-4)", "Three right answers in a row"],
];

const FREE_ROWS: Array<[string, string]> = [
  ["var(--color-rule)", "Not answered yet"],
  ["var(--color-held)", "You marked it “I had it”"],
  ["var(--color-review)", "You marked it “Needs review”"],
];

/* Two icons from Lineicons Free (MIT, https://lineicons.com): `question-mark`
   and `xmark-circle`, in its stroke style. The hairline weight and rounded ends
   sit with the app's thin rules and IBM Plex; Material Symbols' square-cut close
   read heavier, and Font Awesome Free's icons are CC BY and need attribution.
   The question mark's glyph is centered in its 24-unit box, which a typed "?" in
   the label face was not. Pasted as paths rather than installed, since two
   icons do not earn a package. */

const RING =
  "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2M3.5 12a8.5 8.5 0 1 1 17 0a8.5 8.5 0 0 1-17 0";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M8.784 8.784a.75.75 0 0 0 0 1.06L10.939 12l-2.155 2.155a.75.75 0 0 0 1.06 1.06L12 13.062l2.155 2.155a.75.75 0 0 0 1.06-1.06L13.06 12l2.155-2.155a.75.75 0 1 0-1.06-1.06L12 10.938L9.843 8.784a.75.75 0 0 0-1.06 0"
      />
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={RING} />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M9.16 8.84a2.84 2.84 0 1 1 4.66 2.177c-.522.437-1.154.97-1.65 1.588c-.501.62-.92 1.396-.92 2.323v.822a.75.75 0 0 0 1.5 0v-.822c0-.453.201-.903.588-1.383c.39-.484.909-.929 1.445-1.378A4.34 4.34 0 1 0 7.66 8.84a.75.75 0 1 0 1.5 0m2.838 9.011a.9.9 0 1 0 0 1.8a.9.9 0 0 0 0-1.8"
      />
    </svg>
  );
}

export default function ColorKey({
  scheduled,
  ink,
  open,
  onOpenChange,
}: {
  scheduled: boolean;
  /** The current card's deck ink, for the taller dash. */
  ink: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();
  const shown = open || hover;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onOpenChange]);

  const rows = scheduled ? SCHEDULED_ROWS : FREE_ROWS;

  return (
    <div
      ref={wrap}
      className="relative shrink-0"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {/* 44px to press, a 20px ring to see. The negative margins give the hit
          area back to the layout, so the strip's row is no taller than its
          dashes and the ring's edge lines up with the card's. */}
      <button
        type="button"
        onClick={() => {
          // Closing drops the hover preview too, or a mouse still over the "?"
          // would hold the key open after the press that closed it.
          if (open) setHover(false);
          onOpenChange(!open);
        }}
        aria-expanded={shown}
        aria-controls={id}
        aria-label="What the colors mean"
        className="group -my-[18px] -mr-3 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none"
      >
        {/* A 1px ring in the rule color with the glyph inside, rather than
            Lineicons' own `question-mark-circle`: that ring is drawn in the
            icon's color at 1.5px and read too heavy beside the 3px dashes. */}
        <span
          aria-hidden
          className={`flex h-5 w-5 items-center justify-center rounded-full border group-hover:border-ink group-hover:text-ink group-focus-visible:outline-1 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus ${
            shown ? "border-ink text-ink" : "border-rule text-muted"
          }`}
        >
          <QuestionIcon className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Up and to the right of the "?", by the same 8px each way: its bottom
          edge 8px above the ring and its right edge 8px past it, so the key sits
          off the ring's corner. The ring is 20px in a 44px button pulled in by
          `-my-[18px]` and `-mr-3`, which puts its top 6px above this wrapper and
          its right edge on the wrapper's — hence `mb-3.5` and `-right-2`. */}
      <div
        id={id}
        hidden={!shown}
        className="cut absolute -right-2 bottom-full z-10 mb-3.5 w-[min(20rem,calc(100vw-2rem))] rounded-sm bg-card px-4 pt-2 pb-4 shadow-[0_2px_10px_rgba(44,44,42,0.08)]"
      >
        {/* The close button only when the key is open. A hover preview goes
            away when the pointer leaves, so a button to close it is noise. The
            row keeps the button's height either way, so a click on the "?"
            while previewing does not grow the key and shift it up. */}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="text-sm font-medium">What the colors mean</p>
          {open && (
            <button
              type="button"
              onClick={() => {
                setHover(false);
                onOpenChange(false);
              }}
              aria-label="Close"
              className="-mr-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-focus"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted">
          {scheduled
            ? "Each dash is one of today’s cards, colored by how far it has climbed."
            : "Each dash is a card, colored by your last answer."}
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {rows.map(([color, words]) => (
            <li key={words} className="flex items-center gap-3">
              <span aria-hidden className="h-[3px] w-5 shrink-0 rounded-full" style={{ background: color }} />
              {words}
            </li>
          ))}
          <li className="flex items-center gap-3">
            <span aria-hidden className="h-[7px] w-5 shrink-0 rounded-full" style={{ background: ink }} />
            The card you’re on
          </li>
        </ul>
        {scheduled && (
          <p className="mt-3 text-sm text-muted">
            One wrong answer sends a card back to red, so green means three in a
            row, not three in total. Red comes back the next day, orange in two
            days, yellow in three, green in four.
          </p>
        )}
      </div>
    </div>
  );
}
