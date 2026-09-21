import { loadCustomDecks, loadDeletedDecks, replaceCustomDecks } from "./customDecks";
import { PROGRESS_KEY, peekProgress, saveProgress, CURRENT_VERSION } from "./progress";
import { decrypt, deriveKeys, encrypt, MIN_KEY_LENGTH, normalizeKey } from "./syncCrypto";
import {
  canonical,
  emptyPayload,
  mergePayloads,
  readPayload,
  type SyncPayload,
} from "./syncMerge";

/**
 * Keeping this device's progress and imported decks in step with the others
 * that hold the same sync key — CLIENT ONLY.
 *
 * `localStorage` stays the working copy. Nothing reads through the server: a
 * sync reads what is there, merges it with what is here, writes the result
 * back to both, and every page goes on reading `localStorage` as it always has.
 * So a failed sync costs nothing but the sync — studying carries on, and the
 * next one picks up what this one missed.
 *
 * The store under `sync` holds the key itself, so this device can show it and
 * its QR code again, and what it stretches into, so a page load does not pay
 * for the stretching. The note beside the key field says so.
 */

export const SYNC_KEY = "sync";

type SyncStore = {
  version: 1;
  key: string;
  id: string;
  secret: string;
  /** The version of the server's copy this device last read or wrote. */
  v: number;
  syncedAt: string;
};

export type SyncStatus =
  /* `notice` is why sync stopped, when it stopped by itself rather than by a
     press on this device: another device deleted the synced copy. */
  | { state: "off"; notice: string }
  | { state: "on"; key: string; busy: boolean; syncedAt: string; error: string };

export const SYNC_EVENT = "sync-changed";

/** Fired after a sync writes progress that came from another device. */
export const SYNCED_EVENT = "progress-synced";

function readStore(): SyncStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(SYNC_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Partial<SyncStore>;
    if (
      s.version !== 1 ||
      typeof s.key !== "string" ||
      typeof s.id !== "string" ||
      typeof s.secret !== "string"
    ) {
      return null;
    }
    return {
      version: 1,
      key: s.key,
      id: s.id,
      secret: s.secret,
      v: typeof s.v === "number" ? s.v : 0,
      syncedAt: typeof s.syncedAt === "string" ? s.syncedAt : "",
    };
  } catch {
    return null;
  }
}

function writeStore(store: SyncStore | null) {
  try {
    if (store) window.localStorage.setItem(SYNC_KEY, JSON.stringify(store));
    else window.localStorage.removeItem(SYNC_KEY);
  } catch {
    // Storage unavailable: nothing here would survive a reload anyway.
  }
}

let busy = false;
let error = "";
let notice = "";

export function syncStatus(): SyncStatus {
  const store = readStore();
  if (!store) return { state: "off", notice };
  return { state: "on", key: store.key, busy, syncedAt: store.syncedAt, error };
}

function announce() {
  window.dispatchEvent(new Event(SYNC_EVENT));
}

/* The built-in slugs, which a deck moved off a shared slug must not take. Set by
   `SyncAgent`, which the layout hands them to. */
let reserved: string[] = [];
export function setReservedSlugs(slugs: string[]) {
  reserved = slugs;
}

/* Set while a sync writes this device's stores, so the save it makes does not
   read as new work to send. */
let applying = false;
export function isApplying() {
  return applying;
}

function localPayload(): SyncPayload {
  return {
    version: 1,
    progress: peekProgress(),
    decks: loadCustomDecks(),
    deleted: loadDeletedDecks(),
  };
}

/** Whether this device has a store older than version 4 still waiting for a
    deck to be opened, which `peekProgress` reads as empty. */
function progressPending() {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw !== null && (JSON.parse(raw) as { version?: unknown })?.version !== CURRENT_VERSION;
  } catch {
    return false;
  }
}

function applyLocally(merged: SyncPayload, local: SyncPayload) {
  applying = true;
  try {
    if (canonical(merged.progress) !== canonical(local.progress) && !progressPending()) {
      saveProgress({ version: CURRENT_VERSION, cards: merged.progress });
      window.dispatchEvent(new Event(SYNCED_EVENT));
    }
    if (
      canonical(merged.decks) !== canonical(local.decks) ||
      canonical(merged.deleted) !== canonical(local.deleted)
    ) {
      replaceCustomDecks(merged.decks, merged.deleted);
    }
  } finally {
    applying = false;
  }
}

class SyncError extends Error {}

async function request(id: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`/api/sync/${id}`, { cache: "no-store", ...init });
  } catch {
    throw new SyncError(
      "Couldn’t reach the server. Your progress is saved on this device and will sync when you’re back online.",
    );
  }
  const body = (await response.json().catch(() => null)) as
    | { v?: number; data?: string; error?: string }
    | null;
  if (response.status === 404 || response.status === 409 || response.ok) {
    return { status: response.status, v: body?.v ?? 0, data: body?.data ?? "" };
  }
  throw new SyncError(body?.error ?? `The server answered ${response.status}. Try again in a minute.`);
}

async function send(id: string, v: number, payload: SyncPayload, secret: string) {
  const data = await encrypt(JSON.stringify(payload), secret);
  return request(id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v, data }),
  });
}

/**
 * Read, merge, write, until the server takes the write. A refused write means
 * another device got there first, and the loop reads what it wrote and merges
 * again. Three rounds is far more than two people's worth of devices need.
 */
async function round(store: SyncStore) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const got = await request(store.id);
    if (got.status === 404 && store.v > 0) {
      // It was there, and now it is not: another device deleted it.
      writeStore(null);
      notice =
        "The synced copy was deleted from another device, so this one stopped syncing. Its progress is still here.";
      throw new SyncError(notice);
    }

    let remote = emptyPayload;
    if (got.status !== 404) {
      try {
        remote = readPayload(JSON.parse(await decrypt(got.data, store.secret)));
      } catch {
        throw new SyncError(
          "The synced copy couldn’t be unlocked with this key. Stop syncing and join again with the key from your other device.",
        );
      }
    }

    const local = localPayload();
    const merged = mergePayloads(local, remote, reserved);
    applyLocally(merged, local);

    if (got.status !== 404 && canonical(merged) === canonical(remote)) {
      return { ...store, v: got.v };
    }
    const put = await send(store.id, got.status === 404 ? 0 : got.v, merged, store.secret);
    if (put.status === 200) return { ...store, v: put.v };
  }
  throw new SyncError("Other devices kept syncing at the same moment. This one will try again shortly.");
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Syncs now, or right after the sync already running, and never two at once.
 * Resolves when it is done; never rejects — a failure lands in the status.
 */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  const store = readStore();
  if (!store) return Promise.resolve();

  busy = true;
  announce();
  running = (async () => {
    try {
      const next = await round(store);
      // Stopped while this was on its way: leave it stopped.
      if (readStore()?.id === store.id) {
        writeStore({ ...next, syncedAt: new Date().toISOString() });
      }
      error = "";
    } catch (caught) {
      error =
        caught instanceof SyncError
          ? caught.message
          : "Sync stopped partway. Your progress is saved on this device, and it will try again.";
    } finally {
      busy = false;
      running = null;
      announce();
      if (again) {
        again = false;
        void syncNow();
      }
    }
  })();
  return running;
}

export type StartResult = { ok: true } | { ok: false; error: string };

/**
 * Turns sync on with a key: `new` for the first device, which needs a key
 * nobody holds, and `join` for every one after it, which needs a key someone
 * does. Joining merges what is here into what is there, so nothing on either
 * side is lost.
 */
export async function startSync(typed: string, mode: "new" | "join"): Promise<StartResult> {
  const key = normalizeKey(typed);
  if (key.length < MIN_KEY_LENGTH) {
    return { ok: false, error: `A key needs at least ${MIN_KEY_LENGTH} characters.` };
  }

  try {
    const { id, secret } = await deriveKeys(key);
    const got = await request(id);

    if (mode === "new") {
      if (got.status !== 404) {
        return {
          ok: false,
          error: "That key is already in use. If it’s yours, choose “I have a key” instead.",
        };
      }
      const payload = mergePayloads(localPayload(), emptyPayload, reserved);
      const put = await send(id, 0, payload, secret);
      if (put.status !== 200) {
        return {
          ok: false,
          error: "That key is already in use. If it’s yours, choose “I have a key” instead.",
        };
      }
      writeStore({ version: 1, key, id, secret, v: put.v, syncedAt: new Date().toISOString() });
      error = "";
      notice = "";
      announce();
      return { ok: true };
    }

    if (got.status === 404) {
      return {
        ok: false,
        error:
          "Nothing is stored under that key. Check it for typos (capital letters count), or start syncing with it as a new key.",
      };
    }
    writeStore({ version: 1, key, id, secret, v: 0, syncedAt: "" });
    notice = "";
    await syncNow();
    const status = syncStatus();
    if (status.state === "on" && status.error) {
      writeStore(null);
      return { ok: false, error: status.error };
    }
    return { ok: true };
  } catch (caught) {
    return {
      ok: false,
      error:
        caught instanceof SyncError
          ? caught.message
          : "Something went wrong while checking the key. Try again.",
    };
  }
}

/** This device stops. Its progress stays, and so does the server's copy. */
export function stopSync() {
  writeStore(null);
  error = "";
  notice = "";
  announce();
}

/**
 * Deletes the server's copy and stops this device. Every other device finds it
 * gone at its next sync and stops too; each keeps its own progress.
 */
export async function deleteServerCopy(): Promise<StartResult> {
  const store = readStore();
  if (!store) return { ok: true };
  try {
    await request(store.id, { method: "DELETE" });
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof SyncError ? caught.message : "Couldn’t delete it. Try again.",
    };
  }
  stopSync();
  return { ok: true };
}

/** The link a QR code carries: the index, with the key after the `#`, which a
    browser never sends to the server. */
export function joinLink(key: string) {
  return `${window.location.origin}/#sync=${encodeURIComponent(key)}`;
}

export const JOIN_HASH = "#sync=";
