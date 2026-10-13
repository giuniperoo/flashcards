import { NextResponse, type NextRequest } from "next/server";
import { pick, type PlainKey } from "@/lib/copy";
import { configured, deleteEntry, readEntry, release, underLimit, writeEntry } from "@/lib/syncStore";
import { voiceFromCookie } from "@/lib/voice";

/**
 * One sync key's data, by the id derived from it: read it, write it, delete it.
 *
 * The server never sees a key and never sees progress: the id is one half of
 * what the key stretches into and the data is sealed with the other half, both
 * in the browser. See `lib/syncCrypto.ts`. So there is nothing here to check a
 * request against. Anyone holding an id can read its ciphertext or replace it,
 * and an id is only held by someone who holds the key.
 *
 * What this does guard is guessing. Asking for an id that is not there is how
 * someone trying keys would find out they were wrong, so misses are limited
 * much harder than everything else. A write is asking too: it succeeds at
 * version 0 only where nothing is stored, and a refusal names the version that
 * is, which is 0 where nothing is. Both count as misses the same way a read does.
 *
 * The limit is taken before looking and handed back on a hit. Checked only
 * after a miss, it would refuse misses and answer hits, and the refusal would
 * itself say "wrong": the guessing would go on at the rate of everything else.
 */

const ID = /^[0-9a-f]{64}$/;

/** Well above a few hundred cards with long drafts, and under Upstash's
    request limit on its free plan. */
const MAX_DATA = 900_000;

function address(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function answer(body: object | null, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/* A refusal in the reader's voice, which their cookie carries. See `lib/voice.ts`. */
function refuse(request: NextRequest, key: PlainKey, status: number) {
  return answer({ error: pick(key, voiceFromCookie(request.headers.get("cookie"))) }, status);
}

async function guard(request: NextRequest, id: string) {
  if (!configured()) {
    return refuse(request, "api.notSetUp", 503);
  }
  if (!ID.test(id)) return refuse(request, "api.notAnId", 400);
  if (!(await underLimit("all", address(request), 300, 600))) return refuse(request, "api.busy", 429);
  return null;
}

const MISSES = 20;
const MISS_WINDOW = 3600;

const takeMiss = (request: NextRequest) => underLimit("miss", address(request), MISSES, MISS_WINDOW);
const giveMissBack = (request: NextRequest) => release("miss", address(request));

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const refused = await guard(request, id);
  if (refused) return refused;

  if (!(await takeMiss(request))) return refuse(request, "api.tooManyKeys", 429);
  const entry = await readEntry(id);
  if (!entry) return refuse(request, "api.nothingStored", 404);
  await giveMissBack(request);
  return answer(entry, 200);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const refused = await guard(request, id);
  if (refused) return refused;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(request, "api.notJson", 400);
  }
  const { v, data } = (body ?? {}) as { v?: unknown; data?: unknown };
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || typeof data !== "string") {
    return refuse(request, "api.needsVersion", 400);
  }
  if (data.length > MAX_DATA) {
    return refuse(request, "api.tooBig", 413);
  }

  if (!(await takeMiss(request))) return refuse(request, "api.tooManyKeys", 429);
  const result = await writeEntry(id, v, data);
  // Whether something was stored before this write: what the answer gives away.
  const found = "conflict" in result ? result.conflict > 0 : v > 0;
  if (found) await giveMissBack(request);
  return "conflict" in result ? answer({ v: result.conflict }, 409) : answer(result, 200);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const refused = await guard(request, id);
  if (refused) return refused;
  await deleteEntry(id);
  return answer(null, 200);
}
