import { NextResponse, type NextRequest } from "next/server";
import { pick, type PlainKey } from "@/lib/copy";
import { configured, deleteEntry, readEntry, underLimit, writeEntry } from "@/lib/syncStore";
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
 * much harder than everything else.
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

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const refused = await guard(request, id);
  if (refused) return refused;

  const entry = await readEntry(id);
  if (!entry) {
    if (!(await underLimit("miss", address(request), 20, 3600))) {
      return refuse(request, "api.tooManyKeys", 429);
    }
    return refuse(request, "api.nothingStored", 404);
  }
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

  const result = await writeEntry(id, v, data);
  return "conflict" in result ? answer({ v: result.conflict }, 409) : answer(result, 200);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const refused = await guard(request, id);
  if (refused) return refused;
  await deleteEntry(id);
  return answer(null, 200);
}
