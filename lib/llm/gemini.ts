import {
  cutOff,
  declined,
  GenerateError,
  SYSTEM,
  buildPrompt,
  cleanDeck,
  errorFields,
  jsonBody,
  readEvents,
  type GenerateOptions,
  type ModelOption,
} from "./shared";
import { say } from "../copy";

/**
 * Gemini, called with `fetch` from the browser: the Gemini API's
 * `streamGenerateContent`, as server-sent events. No SDK, for the same reason as
 * OpenAI's adapter.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiModel = {
  name: string;
  displayName?: string;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
};

/* Gemini's list does say what each model does, in `supportedGenerationMethods`,
   so the first test is exact. The names are a second pass for models that
   generate content but not text a deck can be made of. `omni` and `transcribe`
   came off after a real list offered them: Gemini Omni 1.1 Flash answered
   "This model only supports Interactions API", and a transcription model wants
   audio. A model the names miss still fails into `NOT_HERE` below and is hidden
   then. */
const NOT_TEXT =
  /(embedding|image|tts|live|audio|transcribe|omni|robotics|computer-use|aqa|veo|imagen)/;

/* What Gemini says when a model on the list cannot be called this way: "This
   model only supports Interactions API", or that `generateContent` is not
   supported for it. */
const NOT_HERE = /only supports .*api|not supported for generatecontent/i;
const TIERS = ["pro", "flash", "flash-lite"];

function version(id: string) {
  const match = /^gemini-(\d+(?:\.\d+)?)/.exec(id);
  return match ? Number(match[1]) : 0;
}

function tier(id: string) {
  const found = [...TIERS].reverse().find((t) => id.includes(`-${t}`));
  return found ? TIERS.indexOf(found) : TIERS.length;
}

/**
 * The models that can write a deck. The list has no dates, so newest first is
 * read off the name: the highest version first, a stable model before its
 * previews, then pro, flash and flash-lite. Two models with the same display
 * name, which aliases and previews often share, carry their ids to tell them
 * apart.
 */
export function geminiOptions(models: GeminiModel[]): ModelOption[] {
  const usable = models
    .map((m) => ({ ...m, id: m.name.replace(/^models\//, "") }))
    .filter(
      (m) =>
        m.id.startsWith("gemini-") &&
        (m.supportedGenerationMethods ?? []).includes("generateContent") &&
        !NOT_TEXT.test(m.id),
    )
    .sort(
      (a, b) =>
        version(b.id) - version(a.id) ||
        Number(/preview|exp/.test(a.id)) - Number(/preview|exp/.test(b.id)) ||
        tier(a.id) - tier(b.id) ||
        a.id.localeCompare(b.id),
    );

  const seen = new Map<string, number>();
  for (const m of usable) {
    const label = m.displayName || m.id;
    seen.set(label, (seen.get(label) ?? 0) + 1);
  }
  return usable.map((m) => {
    const label = m.displayName || m.id;
    return {
      id: m.id,
      label: (seen.get(label) ?? 0) > 1 ? `${label} · ${m.id}` : label,
      maxOutput: m.outputTokenLimit,
    };
  });
}

/** What went wrong, from the status and Google's error body. */
export function explainGemini(status: number, body: unknown): string {
  const { message, status: code, reason } = errorFields(body);

  if (reason === "API_KEY_INVALID" || status === 401) {
    return say("llm.rejectedDeleted");
  }
  // Before the 400 below, which is the status this arrives with: shown raw it
  // read as a problem with the request, when it is the model that cannot be used.
  if (NOT_HERE.test(message)) {
    return say("llm.cannotWrite");
  }
  if (code === "FAILED_PRECONDITION" || /location is not supported/i.test(message)) {
    return say("llm.geminiRegion");
  }
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return say("llm.geminiQuota");
  }
  if (status === 404 || code === "NOT_FOUND") {
    return say("llm.modelUnavailable");
  }
  if (status === 403 || code === "PERMISSION_DENIED") {
    return say("llm.geminiForbidden");
  }
  if (status >= 500) {
    return say("llm.geminiTrouble");
  }
  if (status === 400 && message) return say("llm.rejectedRequest", message);
  return say("llm.geminiError", message ? `: ${message}` : ` (${status})`);
}

/** Whether the failure is the model's own: one the key cannot reach, or one
    that cannot be called through `generateContent`. Trying it again fails the
    same way. */
export function unusableGemini(status: number, body: unknown): boolean {
  const { message, status: code } = errorFields(body);
  return status === 404 || code === "NOT_FOUND" || NOT_HERE.test(message);
}

const unreachable = () => say("llm.geminiUnreachable");

export async function listGeminiModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<ModelOption[]> {
  const models: GeminiModel[] = [];
  let pageToken = "";
  // Pages until the list says there are no more. A few dozen models fit on one.
  do {
    const url = `${BASE}/models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { "x-goog-api-key": apiKey }, signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new GenerateError(unreachable());
    }
    const body = (await jsonBody(response)) as
      | { models?: GeminiModel[]; nextPageToken?: string }
      | null;
    if (!response.ok) throw new GenerateError(explainGemini(response.status, body));
    models.push(...(body?.models ?? []));
    pageToken = body?.nextPageToken ?? "";
  } while (pageToken);
  return geminiOptions(models);
}

/** The finish reasons that mean the model, or Google's filters, would not
    write it, rather than that it ran out of room. */
const DECLINES = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"]);

type Chunk = {
  error?: unknown;
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
};

export async function generateWithGemini(options: GenerateOptions): Promise<string> {
  const { model } = options;
  let full = "";
  let finish: string | undefined;
  let blocked = false;

  try {
    const response = await fetch(
      `${BASE}/models/${encodeURIComponent(model.id)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "x-goog-api-key": options.apiKey, "Content-Type": "application/json" },
        signal: options.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: buildPrompt(options) }] }],
          // The model's own ceiling, from the list, since thinking counts
          // against it and a lower default can cut a long deck short.
          ...(model.maxOutput ? { generationConfig: { maxOutputTokens: model.maxOutput } } : {}),
        }),
      },
    );

    if (!response.ok || !response.body) {
      const body = await jsonBody(response);
      // A 404 is the model: the key cannot reach it, however many times it is
      // asked.
      throw new GenerateError(explainGemini(response.status, body), unusableGemini(response.status, body));
    }

    for await (const data of readEvents(response.body)) {
      let chunk: Chunk;
      try {
        chunk = JSON.parse(data) as Chunk;
      } catch {
        continue;
      }
      if (chunk.error) throw new GenerateError(explainGemini(0, chunk));
      if (chunk.promptFeedback?.blockReason) blocked = true;
      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;
      // Thought summaries are only sent when asked for, which this does not
      // do; skipped anyway, since they are not part of the deck.
      const text = (candidate.content?.parts ?? [])
        .filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join("");
      if (text) {
        full += text;
        options.onText(cleanDeck(full));
      }
      if (candidate.finishReason) finish = candidate.finishReason;
    }
  } catch (error) {
    if (error instanceof GenerateError) throw error;
    if (options.signal?.aborted) return cleanDeck(full).trim();
    throw new GenerateError(unreachable());
  }

  if (blocked || (finish && DECLINES.has(finish))) throw new GenerateError(declined());
  if (finish === "MAX_TOKENS") throw new GenerateError(cutOff());
  return cleanDeck(full).trim();
}
