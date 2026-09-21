import Anthropic from "@anthropic-ai/sdk";
import {
  CUT_OFF,
  DECLINED,
  GenerateError,
  SYSTEM,
  buildPrompt,
  cleanDeck,
  type GenerateOptions,
  type ModelOption,
} from "./shared";

/**
 * Claude, through the Anthropic SDK in the browser. `dangerouslyAllowBrowser`
 * makes the SDK send the `anthropic-dangerous-direct-browser-access` header,
 * which is what opens CORS. There is no server in this path, and no key of ours
 * anywhere.
 *
 * Loaded only when Claude is the provider, so the SDK stays out of the bundle
 * for everyone else.
 */

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** Room for a long deck, and for thinking on the models that think; capped by
    the model's own ceiling, which the models list reports. */
const MAX_TOKENS = 64000;

/** The models that take `fallbacks: "default"`, which reruns a request the
    model's safety classifiers decline on another model, server-side. A flashcard
    deck on a security subject can trip them. Named rather than assumed, since
    the parameter is not accepted everywhere. */
const FALLBACK_DEFAULT = new Set(["claude-opus-5", "claude-fable-5-1"]);

/** What the models list says a model accepts. The capability tree is reported
    for every current model; an older response without it gets the plainest
    request, which every model takes. */
export function anthropicOption(model: Anthropic.ModelInfo): ModelOption {
  const caps = model.capabilities;
  return {
    id: model.id,
    label: model.display_name,
    maxOutput: model.max_tokens ?? undefined,
    adaptiveThinking: caps?.thinking?.types?.adaptive?.supported === true,
    mediumEffort:
      caps?.effort?.supported === true && caps.effort.medium?.supported === true,
  };
}

/** Every model the key can use, newest first, which is the order the API
    returns them in. */
export async function listAnthropicModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<ModelOption[]> {
  try {
    const models: ModelOption[] = [];
    for await (const model of client(apiKey).models.list({ limit: 1000 }, { signal })) {
      models.push(anthropicOption(model));
    }
    return models;
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GenerateError(explainAnthropic(error));
  }
}

/** Turns an SDK error into something that says what to do about it. Every one
    of these failures happens on an account we cannot see, so the message has to
    carry the diagnosis. */
export function explainAnthropic(error: unknown): string {
  // Checked before any status-specific branch below. A credit failure arrives
  // as a 400, so testing it after `BadRequestError` — which is what this used
  // to do — made it unreachable and reported the raw body instead.
  if (
    error instanceof Anthropic.APIError &&
    /credit balance|billing|quota/i.test(error.message)
  ) {
    return "Your Anthropic account is out of credit. Add some under Plans and billing in the console, then try again.";
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "That key was rejected. Check it hasn't been revoked, or paste a new one.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "That key doesn't have access to this model. Pick another model, or check the key's permissions in the Anthropic console.";
  }
  if (error instanceof Anthropic.NotFoundError) {
    return "That model isn't available to this key. Pick another model.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Your account hit its rate limit. Wait a minute and try again.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    // A key whose Scope is "Same as linked account" is not bound to a
    // workspace, so the API wants one named on every request. A browser cannot
    // look one up — the organizations endpoints send no CORS headers — so the
    // only fix is a key scoped to a workspace when it was created.
    if (/anthropic-workspace-id/i.test(error.message)) {
      return "That key isn't tied to a workspace, because its scope was left as \"Same as linked account\". Make another key in the console with Scope set to a workspace such as \"Default\", and paste that one.";
    }
    return `The request was rejected: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Could not reach Anthropic. Check your connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Anthropic returned an error: ${error.message}`;
  }
  return "Generation failed. Try again.";
}

export async function generateWithClaude(options: GenerateOptions): Promise<string> {
  const { model } = options;
  let full = "";

  try {
    const stream = client(options.apiKey).beta.messages.stream(
      {
        model: model.id,
        max_tokens: Math.min(MAX_TOKENS, model.maxOutput ?? MAX_TOKENS),
        // Only what this model accepts. Adaptive thinking and effort are
        // rejected by the older models someone can now pick from the list.
        ...(model.adaptiveThinking ? { thinking: { type: "adaptive" as const } } : {}),
        ...(model.mediumEffort ? { output_config: { effort: "medium" as const } } : {}),
        ...(FALLBACK_DEFAULT.has(model.id)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
        system: SYSTEM,
        messages: [{ role: "user", content: buildPrompt(options) }],
      },
      { signal: options.signal },
    );

    // A fallback partway through keeps the text already streamed and continues
    // from it on the same stream, so appending every delta stays correct.
    stream.on("text", (chunk) => {
      full += chunk;
      options.onText(cleanDeck(full));
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") throw new GenerateError(DECLINED);
    if (message.stop_reason === "max_tokens") throw new GenerateError(CUT_OFF);
  } catch (error) {
    if (error instanceof GenerateError) throw error;
    if (options.signal?.aborted) return cleanDeck(full).trim();
    throw new GenerateError(explainAnthropic(error), error instanceof Anthropic.NotFoundError);
  }

  return cleanDeck(full).trim();
}
