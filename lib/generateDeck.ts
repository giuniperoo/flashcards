import type { Provider } from "./llm/providers";
import type { GenerateOptions, ModelOption } from "./llm/shared";

/**
 * Writes a deck, or lists the models that can, with whichever provider the
 * reader chose. The adapters live in `lib/llm/` and are loaded on demand: the
 * Anthropic SDK stays out of the bundle for everyone who uses another provider,
 * and all three stay out for everyone who only came to paste a deck.
 *
 * Browser only. Every call goes straight from the page to the provider with the
 * reader's own key; there is no server in this path, and no key of ours
 * anywhere.
 */

export { GenerateError, type GenerateOptions, type ModelOption } from "./llm/shared";

export async function generateDeck(options: GenerateOptions): Promise<string> {
  switch (options.provider) {
    case "anthropic":
      return (await import("./llm/anthropic")).generateWithClaude(options);
    case "openai":
      return (await import("./llm/openai")).generateWithOpenAI(options);
    case "gemini":
      return (await import("./llm/gemini")).generateWithGemini(options);
  }
}

export async function listModels(
  provider: Provider,
  apiKey: string,
  signal?: AbortSignal,
): Promise<ModelOption[]> {
  switch (provider) {
    case "anthropic":
      return (await import("./llm/anthropic")).listAnthropicModels(apiKey, signal);
    case "openai":
      return (await import("./llm/openai")).listOpenAIModels(apiKey, signal);
    case "gemini":
      return (await import("./llm/gemini")).listGeminiModels(apiKey, signal);
  }
}

/** Which model to preselect: the one this reader picked last for the provider,
    if the key can still use it; otherwise the provider's default. For OpenAI
    that is the newest of its main text families, `gpt-` with a version number
    or an `o` series model: the list puts whatever is newest on top, and on one
    key that was `gpt-live-1`, which cannot write text this way at all. Then the
    top of the list. */
export function preferredModel(
  provider: Provider,
  options: ModelOption[],
  remembered: string | undefined,
): string | null {
  const has = (id: string | undefined) => !!id && options.some((m) => m.id === id);
  if (has(remembered)) return remembered!;
  if (provider === "anthropic" && has("claude-opus-5")) return "claude-opus-5";
  if (provider === "openai") {
    const family = options.find((m) => /^(gpt-\d|o\d)/.test(m.id));
    if (family) return family.id;
  }
  return options[0]?.id ?? null;
}
