import {
  CUT_OFF,
  DECLINED,
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
   generate content but not text a deck can be made of. */
const NOT_TEXT = /(embedding|image|tts|live|audio|robotics|computer-use|aqa|veo|imagen)/;
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
    return "That key was rejected. Check it hasn't been deleted, or paste a new one.";
  }
  if (code === "FAILED_PRECONDITION" || /location is not supported/i.test(message)) {
    return "The Gemini API isn't available where you are on the free tier. Turn on billing for the key's project in Google AI Studio, or use another provider.";
  }
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return "Your Gemini quota is used up for now. Wait a minute, or check the project's limits and billing in Google AI Studio.";
  }
  if (status === 404 || code === "NOT_FOUND") {
    return "That model isn't available to this key. Pick another model.";
  }
  if (status === 403 || code === "PERMISSION_DENIED") {
    return "That key can't use the Gemini API. Check the key's restrictions, or make a new one in Google AI Studio.";
  }
  if (status >= 500) {
    return "Gemini is overloaded or having trouble. Try again in a moment.";
  }
  if (status === 400 && message) return `The request was rejected: ${message}`;
  return `Gemini returned an error${message ? `: ${message}` : ` (${status})`}.`;
}

const UNREACHABLE = "Could not reach Gemini. Check your connection and try again.";

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
      throw new GenerateError(UNREACHABLE);
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
      throw new GenerateError(
        explainGemini(response.status, body),
        response.status === 404 || errorFields(body).status === "NOT_FOUND",
      );
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
    throw new GenerateError(UNREACHABLE);
  }

  if (blocked || (finish && DECLINES.has(finish))) throw new GenerateError(DECLINED);
  if (finish === "MAX_TOKENS") throw new GenerateError(CUT_OFF);
  return cleanDeck(full).trim();
}
