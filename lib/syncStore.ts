/**
 * Where synced data lives on the server — SERVER ONLY.
 *
 * One entry per sync key's id: the encrypted payload and a version number that
 * goes up by one on every write. A write names the version it read, and is
 * refused if another device wrote in between; the device then reads again,
 * merges, and tries once more. Version 0 means "nothing here yet", so the
 * first write under a new key is also the check that nobody else holds it.
 *
 * Backed by Upstash Redis over its REST API, as the Vercel Marketplace
 * integration provisions it, and read with `fetch` rather than an SDK. With no
 * Redis configured, development keeps entries in memory, so the whole flow
 * runs locally; production refuses rather than pretending to keep anything.
 *
 * Each operation is a span of its own, under the request's, so a trace shows
 * the store's part of a request and what it decided: a miss, a conflict, a
 * refusal. The spans carry versions, sizes and outcomes, never the id, the
 * data or the reader's address. See `instrumentation.ts`.
 */

import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";

export type Entry = { v: number; data: string };

type Redis = { url: string; token: string };

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/** Whether this server can keep anything at all. */
export function configured() {
  return redis() !== null || process.env.NODE_ENV !== "production";
}

async function command(db: Redis, args: (string | number)[]): Promise<unknown> {
  const response = await fetch(db.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${db.token}` },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? `Redis answered ${response.status}`);
  return body.result;
}

/* In development only. On `globalThis` so a hot reload of this module does not
   empty it. */
const memory = ((globalThis as { __syncMemory?: Map<string, string> }).__syncMemory ??= new Map());

const entryKey = (id: string) => `sync:${id}`;

const tracer = trace.getTracer("verso-sync");

/* Runs one store operation inside a span named for it. Without a tracer
   registered, as in the tests, the span is a no-op. */
function traced<T>(name: string, run: (span: Span, db: Redis | null) => Promise<T>) {
  return tracer.startActiveSpan(name, async (span) => {
    const db = redis();
    span.setAttribute("sync.store", db ? "redis" : "memory");
    try {
      return await run(span, db);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function readEntry(id: string): Promise<Entry | null> {
  return traced("sync.read", async (span, db) => {
    const raw = db ? await command(db, ["GET", entryKey(id)]) : memory.get(entryKey(id));
    span.setAttribute("sync.found", typeof raw === "string");
    if (typeof raw !== "string") return null;
    const entry = JSON.parse(raw) as Entry;
    span.setAttributes({ "sync.version": entry.v, "sync.data_bytes": entry.data.length });
    return entry;
  });
}

/* Compare and set in one step, so two devices writing at once cannot both
   succeed. Returns the new version, or the negative of the one that is there. */
const PUT_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local v = 0
if current then v = cjson.decode(current).v end
if v ~= tonumber(ARGV[1]) then return -v end
redis.call('SET', KEYS[1], cjson.encode({ v = v + 1, data = ARGV[2] }))
return v + 1
`;

/** The new version, or `{ conflict }` with the version another device wrote. */
export function writeEntry(
  id: string,
  expected: number,
  data: string,
): Promise<{ v: number } | { conflict: number }> {
  return traced("sync.write", async (span, db) => {
    span.setAttributes({ "sync.expected_version": expected, "sync.data_bytes": data.length });
    const result = await compareAndSet(db, id, expected, data);
    /* A conflict is the store doing its job, not an error: the device reads,
       merges and writes again, in a request of its own. */
    span.setAttribute("sync.conflict", "conflict" in result);
    span.setAttribute("sync.version", "conflict" in result ? result.conflict : result.v);
    return result;
  });
}

async function compareAndSet(
  db: Redis | null,
  id: string,
  expected: number,
  data: string,
): Promise<{ v: number } | { conflict: number }> {
  if (db) {
    const result = Number(await command(db, ["EVAL", PUT_SCRIPT, 1, entryKey(id), expected, data]));
    return result > 0 ? { v: result } : { conflict: -result };
  }
  const current = memory.get(entryKey(id));
  const v = current ? (JSON.parse(current) as Entry).v : 0;
  if (v !== expected) return { conflict: v };
  memory.set(entryKey(id), JSON.stringify({ v: v + 1, data }));
  return { v: v + 1 };
}

export function deleteEntry(id: string) {
  return traced("sync.delete", async (_span, db) => {
    if (db) await command(db, ["DEL", entryKey(id)]);
    else memory.delete(entryKey(id));
  });
}

const COUNT_SCRIPT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
`;

const counts = new Map<string, { n: number; until: number }>();

/**
 * Counts one more request against a limit for this address and says whether it
 * is still under it. A fixed window: simple, and a burst at the edge of two
 * windows gets twice the limit, which is fine for what these guard.
 */
export function underLimit(bucket: string, address: string, limit: number, seconds: number) {
  return traced("sync.limit", async (span, db) => {
    span.setAttributes({ "sync.limit.bucket": bucket, "sync.limit.max": limit });
    const n = await count(db, `limit:${bucket}:${address}`, seconds);
    span.setAttributes({ "sync.limit.count": n, "sync.limit.allowed": n <= limit });
    return n <= limit;
  });
}

async function count(db: Redis | null, key: string, seconds: number) {
  if (db) return Number(await command(db, ["EVAL", COUNT_SCRIPT, 1, key, seconds]));
  const now = Date.now();
  const entry = counts.get(key);
  if (!entry || entry.until < now) {
    counts.set(key, { n: 1, until: now + seconds * 1000 });
    return 1;
  }
  entry.n += 1;
  return entry.n;
}
