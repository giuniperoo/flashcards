import { NextResponse, type NextRequest } from "next/server";
import { configured, deleteEntry, readEntry, underLimit, writeEntry } from "@/lib/syncStore";

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

const busy = () =>
  answer({ error: "Too many requests from this network. Wait a few minutes and try again." }, 429);

async function guard(request: NextRequest, id: string) {
  if (!configured()) {
    return answer({ error: "Sync isn’t set up on this server yet." }, 503);
  }
  if (!ID.test(id)) return answer({ error: "That isn’t a sync id." }, 400);
  if (!(await underLimit("all", address(request), 300, 600))) return busy();
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
      return answer(
        { error: "Too many keys tried from this network. Wait an hour and try again." },
        429,
      );
    }
    return answer({ error: "Nothing is stored under that key." }, 404);
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
    return answer({ error: "The request wasn’t JSON." }, 400);
  }
  const { v, data } = (body ?? {}) as { v?: unknown; data?: unknown };
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || typeof data !== "string") {
    return answer({ error: "The request needs a version and the data." }, 400);
  }
  if (data.length > MAX_DATA) {
    return answer({ error: "There’s more progress here than sync can hold." }, 413);
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
