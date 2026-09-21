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
 * OpenAI, called with `fetch` from the browser: Chat Completions, streamed.
 *
 * No SDK. The generator needs streamed text and why it stopped, which is two
 * endpoints and one event shape, and the SDK would add to what a page ships for
 * that. Chat Completions rather than the newer Responses API because it is the
 * shape a dozen other providers copy, so the next one can reuse this adapter
 * with a different base URL.
 */

const BASE = "https://api.openai.com/v1";

function headers(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

type OpenAIModel = { id: string; created?: number };

/* What the models list mixes in with the models that write text. The list says
   nothing about what a model does, so this goes by name: embeddings, speech,
   images, moderation, and the models only the Responses API serves. A new kind
   of model can get past it until it is named here; picking one fails with a
   message that says to pick another. */
const WRITES_TEXT = /^(gpt-|o\d|chatgpt-)/;
const NOT_CHAT =
  /(embedding|tts|whisper|transcribe|dall-e|image|audio|realtime|-live(?:-|$)|moderation|search|instruct|codex|computer-use|deep-research|sora|-pro(?:-|$))/;

/* What OpenAI says when a model on the list cannot be used through Chat
   Completions: "This is not a chat model and thus not supported in the
   v1/chat/completions endpoint", or that it only works through Responses. */
const NOT_CHAT_MESSAGE = /not a chat model|v1\/responses|v1\/completions|only supported in/i;
const SNAPSHOT = /-(?:\d{4}-\d{2}-\d{2}|\d{4})$/;

/**
 * The models that can write a deck, newest first. A dated snapshot is left out
 * when its undated name is in the list too — `gpt-4o-2024-08-06` beside `gpt-4o`
 * is the same choice twice.
 */
export function openAIOptions(models: OpenAIModel[]): ModelOption[] {
  const chat = models.filter((m) => WRITES_TEXT.test(m.id) && !NOT_CHAT.test(m.id));
  const names = new Set(chat.map((m) => m.id));
  return chat
    .filter((m) => !(SNAPSHOT.test(m.id) && names.has(m.id.replace(SNAPSHOT, ""))))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0) || a.id.localeCompare(b.id))
    .map((m) => ({ id: m.id, label: m.id }));
}

/** What went wrong, from the status and OpenAI's error body. */
export function explainOpenAI(status: number, body: unknown): string {
  const { message, code } = errorFields(body);

  // A restricted key without a scope this page needs. It arrives as a 401 like
  // a revoked key, so it has to be told apart first: the key is fine, it only
  // needs a permission, and "rejected" sent people to make a new one.
  const missing = /missing scopes?:\s*([\w., ]+)/i.exec(message)?.[1] ?? "";
  if (missing || /insufficient permissions/i.test(message)) {
    if (/model\.request/.test(missing)) {
      return say("llm.openaiNoModels");
    }
    if (/model\.read/.test(missing)) {
      return say("llm.openaiNoList");
    }
    return say("llm.openaiMissingPermission");
  }

  if (status === 401 || code === "invalid_api_key") {
    return say("llm.rejectedRevoked");
  }
  if (code === "insufficient_quota") {
    return say("llm.openaiCredit");
  }
  if (status === 429) {
    return say("llm.rateLimited");
  }
  if (code === "unsupported_country_region_territory") {
    return say("llm.openaiRegion");
  }
  // Before the 404 below, which is the status this arrives with: read as "not
  // available" it told the reader the key lacked access, when no key could use
  // the model here.
  if (NOT_CHAT_MESSAGE.test(message)) {
    return say("llm.cannotWrite");
  }
  if (status === 404 || code === "model_not_found") {
    return say("llm.modelUnavailable");
  }
  if (status === 403) {
    return say("llm.openaiNoAccess");
  }
  if (status >= 500) {
    return say("llm.openaiTrouble");
  }
  if (status === 400 && message) return say("llm.rejectedRequest", message);
  return say("llm.openaiError", message ? `: ${message}` : ` (${status})`);
}

/** Whether the failure is the model's own: not a chat model, or not one this
    key can reach. Either way the next attempt with it fails the same way. */
export function unusableOpenAI(status: number, body: unknown): boolean {
  const { message, code } = errorFields(body);
  return NOT_CHAT_MESSAGE.test(message) || status === 404 || code === "model_not_found";
}

function openAIError(status: number, body: unknown) {
  return new GenerateError(explainOpenAI(status, body), unusableOpenAI(status, body));
}

const unreachable = () => say("llm.openaiUnreachable");

export async function listOpenAIModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<ModelOption[]> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/models`, { headers: headers(apiKey), signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GenerateError(unreachable());
  }
  const body = await jsonBody(response);
  if (!response.ok) throw new GenerateError(explainOpenAI(response.status, body));
  const data = (body as { data?: unknown } | null)?.data;
  return openAIOptions(Array.isArray(data) ? (data as OpenAIModel[]) : []);
}

type Chunk = {
  error?: unknown;
  choices?: Array<{
    delta?: { content?: string | null; refusal?: string | null };
    finish_reason?: string | null;
  }>;
};

export async function generateWithOpenAI(options: GenerateOptions): Promise<string> {
  let full = "";
  let refusal = "";
  let finish: string | null | undefined;

  try {
    const response = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: headers(options.apiKey),
      signal: options.signal,
      // No output limit: the model's own ceiling is the most room a deck can
      // have, and the ceilings differ too much across the list to pick one.
      body: JSON.stringify({
        model: options.model.id,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(options) },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      throw openAIError(response.status, await jsonBody(response));
    }

    for await (const data of readEvents(response.body)) {
      if (data === "[DONE]") break;
      let chunk: Chunk;
      try {
        chunk = JSON.parse(data) as Chunk;
      } catch {
        continue;
      }
      if (chunk.error) throw openAIError(0, chunk);
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      if (choice.delta?.content) {
        full += choice.delta.content;
        options.onText(cleanDeck(full));
      }
      if (choice.delta?.refusal) refusal += choice.delta.refusal;
      if (choice.finish_reason) finish = choice.finish_reason;
    }
  } catch (error) {
    if (error instanceof GenerateError) throw error;
    if (options.signal?.aborted) return cleanDeck(full).trim();
    throw new GenerateError(unreachable());
  }

  if ((refusal && !full.trim()) || finish === "content_filter") {
    throw new GenerateError(declined());
  }
  if (finish === "length") throw new GenerateError(cutOff());
  return cleanDeck(full).trim();
}
