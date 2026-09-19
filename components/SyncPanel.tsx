"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CloseIcon, QuestionIcon } from "@/components/ColorKey";
import {
  JOIN_HASH,
  SYNC_EVENT,
  SYNC_KEY,
  deleteServerCopy,
  joinLink,
  startSync,
  stopSync,
  syncNow,
  syncStatus,
  type SyncStatus,
} from "@/lib/sync";
import { MIN_KEY_LENGTH, suggestKey } from "@/lib/syncCrypto";

const FIELD =
  "min-h-11 pointer-fine:min-h-9 w-full rounded-sm border border-rule bg-card px-3 font-mono text-base outline-none placeholder:text-muted focus:border-ink sm:text-sm";

const BUTTON =
  "press min-h-11 pointer-fine:min-h-9 shrink-0 rounded-sm border border-ink px-4 text-sm font-medium hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent";

const TEXT_BUTTON =
  "inline-flex min-h-11 pointer-fine:min-h-9 items-center text-sm text-muted underline underline-offset-2 hover:text-ink focus-visible:outline-none";

/* The same as the other plain controls in the row; see `PLAIN` in
   `DeckVisibility.tsx`. */
const PLAIN =
  "label inline-flex min-h-11 pointer-fine:min-h-9 items-center border border-transparent px-4 text-muted hover:text-ink focus-visible:outline-none";

function when(iso: string) {
  if (!iso) return "";
  const at = new Date(iso);
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (at.toDateString() === new Date().toDateString()) return `at ${time}`;
  return `on ${at.toLocaleDateString("en-US", { month: "long", day: "numeric" })} at ${time}`;
}

function useSyncStatus(): SyncStatus | null {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  // Before paint, like the other stores on the index; see `usePrefs`.
  useLayoutEffect(() => {
    const read = () => setStatus(syncStatus());
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SYNC_KEY) read();
    };
    window.addEventListener(SYNC_EVENT, read);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, read);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return status;
}

/**
 * Syncing across devices: a control at the foot of the index saying whether this
 * device syncs, and the dialog it opens, centered over the page, to start, join
 * or stop. A native `<dialog>` opened with `showModal`, so the overlay, Escape,
 * keeping focus inside while it is open and handing it back to the control when
 * it closes are all the browser's own.
 *
 * There is no account. A key the reader chooses, or the one suggested, is the
 * whole identity; the first device checks that nobody holds it, and every other
 * device joins with it, typed or scanned from the first device's QR code. The
 * dialog says what that trades away, in `KeyNote`, before anybody has to ask.
 */
export default function SyncPanel() {
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "join">("new");
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const modeName = useId();
  const noteId = useId();
  const titleId = useId();

  /* A scanned QR code, or a copied link, opens the index with the key after the
     `#`. It goes into the join field and off the address, so it is not left in
     the history or on screen in the address bar. A link pasted into a tab
     already on the index changes only the `#`, which loads nothing, hence the
     listener. */
  useEffect(() => {
    const arrive = () => {
      if (!window.location.hash.startsWith(JOIN_HASH)) return;
      let key = "";
      try {
        key = decodeURIComponent(window.location.hash.slice(JOIN_HASH.length));
      } catch {
        // A mangled link: open the dialog with nothing filled in.
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
      setMode("join");
      setTyped(key);
      setOpen(true);
      setProblem("");
    };
    arrive();
    window.addEventListener("hashchange", arrive);
    return () => window.removeEventListener("hashchange", arrive);
  }, []);

  /* `open` is the state and the dialog follows it. Escape closes the dialog by
     itself, and its `close` event brings the state back in line. `status` is a
     dependency because the dialog is not in the page until status is read, and
     a link can ask for it to be open before then. */
  useEffect(() => {
    const box = dialog.current;
    if (!box) return;
    if (open && !box.open) box.showModal();
    if (!open && box.open) box.close();
  }, [open, status]);

  const choose = (next: "new" | "join") => {
    setMode(next);
    setProblem("");
    setTyped(next === "new" ? suggestKey() : "");
  };

  const start = async () => {
    setWorking(true);
    setProblem("");
    const result = await startSync(typed, mode);
    setWorking(false);
    if (!result.ok) {
      setProblem(result.error);
      field.current?.focus();
      return;
    }
    setTyped("");
    // The field that had focus has gone with the form; focus stays in the dialog.
    closer.current?.focus();
  };

  if (!status) return null;
  const on = status.state === "on";

  const label = !on
    ? status.notice
      ? "Sync stopped"
      : "Sync across devices"
    : status.busy
      ? "Syncing…"
      : status.error
        ? "Not synced"
        : "Synced across devices";

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          if (!on && !typed) setTyped(mode === "new" ? suggestKey() : "");
          setOpen(true);
        }}
        className={PLAIN}
      >
        <span className="ring-words">{label}</span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        /* Escape closes a modal dialog natively; handled here too, as Enter is
           in the key field, so it does not rest on the browser's default. */
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          setOpen(false);
        }}
        /* A press on the overlay lands on the dialog element itself, since its
           content fills it edge to edge; a press inside lands on the content. */
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="sync-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-sm border border-rule bg-card p-0 text-ink shadow-[0_8px_30px_rgba(44,44,42,0.18)]"
      >
        {open && (
          <div className="px-5 pt-2 pb-5">
            <div className="flex items-center gap-1">
              <h2 id={titleId} className="mr-auto text-base font-medium">
                Sync across devices
              </h2>
              {/* 44px to press, a 20px ring to see, as beside the study strip. */}
              <button
                type="button"
                aria-expanded={noteOpen}
                aria-controls={noteId}
                aria-label="How your key is used"
                onClick={() => setNoteOpen(!noteOpen)}
                className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 items-center justify-center rounded-full border group-hover:border-ink group-hover:text-ink group-focus-visible:outline-1 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus ${
                    noteOpen ? "border-ink text-ink" : "border-rule text-muted"
                  }`}
                >
                  <QuestionIcon className="h-3.5 w-3.5" />
                </span>
              </button>
              <button
                ref={closer}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-focus"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {noteOpen && <KeyNote id={noteId} />}

            {on ? (
              <Syncing
                status={status}
                onStopped={() => {
                  setMode("new");
                  setTyped(suggestKey());
                  setProblem("");
                  closer.current?.focus();
                }}
              />
            ) : (
              <>
                {status.notice && (
                  <p className="mt-2 text-sm text-error">{status.notice}</p>
                )}
                <div
                  role="radiogroup"
                  aria-label="Which device is this"
                  className="mt-3 flex min-h-11 pointer-fine:min-h-9 items-center"
                >
                  <span className="segment-bar">
                    <label className={mode === "new" ? "chosen" : undefined}>
                      <input
                        type="radio"
                        name={modeName}
                        checked={mode === "new"}
                        onChange={() => choose("new")}
                        className="sr-only"
                      />
                      My first device
                    </label>
                    <label className={mode === "join" ? "chosen" : undefined}>
                      <input
                        type="radio"
                        name={modeName}
                        checked={mode === "join"}
                        onChange={() => choose("join")}
                        className="sr-only"
                      />
                      I have a key
                    </label>
                  </span>
                </div>

                <p className="mt-2 text-sm text-muted">
                  {mode === "new"
                    ? "Choose a key for your progress and imported decks, or keep the one suggested. You’ll use it, or its QR code, to add your other devices."
                    : "Enter the key from your first device. Scanning its QR code with this device’s camera fills it in."}
                </p>

                <form
                  className="mt-3 flex flex-wrap items-start gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void start();
                  }}
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <label htmlFor="sync-key" className="sr-only">
                      Sync key
                    </label>
                    <input
                      ref={field}
                      id="sync-key"
                      value={typed}
                      onChange={(event) => {
                        setTyped(event.target.value);
                        setProblem("");
                      }}
                      // Handled here, as the deck generator's fields do, rather
                      // than left to the form's own Enter, which not every
                      // keyboard event sets off; the default is stopped so a
                      // browser that would also submit does not do it twice.
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        if (!working && typed.trim().length >= MIN_KEY_LENGTH)
                          void start();
                      }}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-describedby="sync-key-hint"
                      aria-invalid={problem !== ""}
                      placeholder={mode === "join" ? "Your key" : undefined}
                      className={FIELD}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={working || typed.trim().length < MIN_KEY_LENGTH}
                    className={BUTTON}
                  >
                    {working
                      ? "Checking the key…"
                      : mode === "new"
                        ? "Start syncing"
                        : "Join"}
                  </button>
                </form>

                <p
                  id="sync-key-hint"
                  className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-muted"
                >
                  <span>
                    At least {MIN_KEY_LENGTH} characters. Capital letters count.
                  </span>
                  {mode === "new" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTyped(suggestKey());
                        setProblem("");
                      }}
                      className={TEXT_BUTTON}
                    >
                      <span className="ring-words">Suggest another</span>
                    </button>
                  )}
                </p>

                {problem && (
                  <p role="alert" className="mt-2 text-sm text-error">
                    {problem}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}

/**
 * What the key is and what it is not, said up front: the convenience is the
 * trade, and a reader choosing a short key should know what it costs. Every
 * place the key or anything derived from it is kept is named here.
 */
function KeyNote({ id }: { id: string }) {
  return (
    /* Closed off at both ends, dashed like the deck cards' edge and the cut
       lines on a printed sheet, so the note reads as an aside rather than as
       the start of what is under it. */
    <div
      id={id}
      className="mt-3 border-y border-dashed border-rule py-3 text-sm"
    >
      <p className="font-medium">How your key is used</p>
      <p className="mt-1 text-muted">
        Syncing with a key trades some security for ease of use. There’s no
        account, email or password to set up, and no password reset either. Your
        key is the only lock.
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted marker:text-rule">
        <li>
          <strong className="font-medium text-ink">On this device</strong> the
          key is saved in the browser so syncing keeps working. Anyone who can
          use this browser can see it.
        </li>
        <li>
          <strong className="font-medium text-ink">
            It’s never sent anywhere.
          </strong>{" "}
          The server receives a fingerprint of the key, used to find your data,
          and your progress encrypted with the key. It can’t read your answers.
        </li>
        <li>
          <strong className="font-medium text-ink">
            A simple key can be guessed
          </strong>
          , and whoever guesses it can read and change your progress. A longer
          key, or several unrelated words, is much harder to guess.
        </li>
        <li>
          <strong className="font-medium text-ink">
            Anyone with a photo of the QR code
          </strong>{" "}
          has your key.
        </li>
        <li>
          <strong className="font-medium text-ink">
            Lose the key on every device
          </strong>{" "}
          and it can’t be recovered.
        </li>
      </ul>
    </div>
  );
}

/** The panel once this device syncs: how it is going, the key, and the ways out. */
function Syncing({
  status,
  onStopped,
}: {
  status: Extract<SyncStatus, { state: "on" }>;
  onStopped: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState("");
  const [working, setWorking] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinLink(status.key));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setProblem(
        "Couldn’t copy the link. Show the key and type it on the other device instead.",
      );
    }
  };

  return (
    <div className="mt-2 text-sm">
      <p role="status" className={status.error ? "text-error" : "text-muted"}>
        {status.busy
          ? "Syncing…"
          : status.error
            ? status.error
            : status.syncedAt
              ? `This device is syncing. Last synced ${when(status.syncedAt)}.`
              : "This device is syncing."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="label text-muted">Key</span>
        <code className="font-mono text-ink">
          {showKey ? status.key : "••••••••••••"}
        </code>
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className={TEXT_BUTTON}
        >
          <span className="ring-words">{showKey ? "Hide" : "Show"}</span>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className={BUTTON}
        >
          {showCode ? "Hide QR code" : "Show QR code"}
        </button>
        <button type="button" onClick={copy} className={BUTTON}>
          {copied ? "Link copied" : "Copy link"}
        </button>
        <button
          type="button"
          disabled={status.busy}
          onClick={() => void syncNow()}
          className={BUTTON}
        >
          Sync now
        </button>
      </div>

      {showCode && <QrCode text={joinLink(status.key)} />}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 border-t border-rule pt-2">
        <button
          type="button"
          onClick={() => {
            stopSync();
            onStopped();
          }}
          className={TEXT_BUTTON}
        >
          <span className="ring-words">Stop syncing on this device</span>
        </button>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={TEXT_BUTTON}
          >
            <span className="ring-words">Delete the synced copy</span>
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-2">
          <p>
            This deletes the copy on the server. Every device stops syncing, and
            each keeps the progress it has.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={working}
              onClick={async () => {
                setWorking(true);
                const result = await deleteServerCopy();
                setWorking(false);
                if (result.ok) onStopped();
                else setProblem(result.error);
              }}
              className={BUTTON}
            >
              {working ? "Deleting…" : "Delete it"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={BUTTON}
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      {problem && (
        <p role="alert" className="mt-2 text-error">
          {problem}
        </p>
      )}
    </div>
  );
}

/**
 * The join link as a QR code, drawn as one SVG path. The library is loaded only
 * when a code is asked for, so the index does not carry it.
 */
function QrCode({ text }: { text: string }) {
  const [path, setPath] = useState<{ d: string; size: number } | null>(null);

  const draw = useCallback(async () => {
    const { default: qrcode } = await import("qrcode-generator");
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`;
      }
    }
    // Four modules of quiet space on every side, as scanners expect.
    setPath({ d, size: count + 8 });
  }, [text]);

  useEffect(() => {
    void draw();
  }, [draw]);

  return (
    <div className="mt-3 flex flex-wrap items-start gap-4">
      <div className="h-44 w-44 shrink-0 rounded-sm border border-rule bg-card">
        {path && (
          <svg
            role="img"
            aria-label="QR code for joining with this key"
            viewBox={`0 0 ${path.size} ${path.size}`}
            className="h-full w-full text-ink"
            shapeRendering="crispEdges"
          >
            <path d={path.d} fill="currentColor" />
          </svg>
        )}
      </div>
      <p className="max-w-[16rem] text-muted">
        Scan it with your other device’s camera to open this app with the key
        filled in. Anyone with a photo of this code has your key.
      </p>
    </div>
  );
}
