/*
 * Deck generation across providers, without a network or a key.
 *
 * What goes wrong here goes wrong on accounts nobody else can see, so each
 * adapter runs against a fetch that answers in its provider's documented shape:
 * a stream that finishes, one cut off, one declined, and the errors that need a
 * message saying what to do. The Gemini key error is the body the API really
 * returns for a bad key.
 */
import {
  KEY_STORAGE,
  chooseModel,
  clearApiKey,
  hideModel,
  loadLlmStore,
  restoreModels,
  saveApiKey,
} from "../apiKey";
import { preferredModel } from "../generateDeck";
import { anthropicOption, generateWithClaude } from "./anthropic";
import {
  explainGemini,
  geminiOptions,
  generateWithGemini,
  listGeminiModels,
  unusableGemini,
} from "./gemini";
import { explainOpenAI, generateWithOpenAI, openAIOptions, unusableOpenAI } from "./openai";
import { keyProblem } from "./providers";
import {
  CUT_OFF,
  DECLINED,
  GenerateError,
  cleanDeck,
  readEvents,
  type GenerateOptions,
  type ModelOption,
} from "./shared";

const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

const ANTHROPIC_KEY = "sk-ant-api03-" + "a".repeat(40);
const OPENAI_KEY = "sk-proj-" + "b".repeat(40);
const GEMINI_KEY = "AIza" + "c".repeat(35);

/* A fetch that records what it was asked and answers with the given response. */
type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];
function answer(respond: (call: Call) => Response) {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const call = { url, init };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
}

/** A body that arrives in the chunks given, split wherever they are split. */
function streamOf(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function sse(events: unknown[], trailer = "") {
  return new Response(
    streamOf([...events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`), trailer]),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const DECK = "# CAP\nblurb: The trade-off\n\nQ: What is C?\nA: Consistency.\n";

function options(provider: GenerateOptions["provider"], model: ModelOption, seen: string[] = []): GenerateOptions {
  return {
    provider,
    model,
    subject: "CAP",
    count: 8,
    apiKey: { anthropic: ANTHROPIC_KEY, openai: OPENAI_KEY, gemini: GEMINI_KEY }[provider],
    onText: (text) => seen.push(text),
  };
}

async function failsWith(run: () => Promise<unknown>, message: string | RegExp) {
  try {
    await run();
    return false;
  } catch (error) {
    if (!(error instanceof GenerateError)) return false;
    return typeof message === "string" ? error.message === message : message.test(error.message);
  }
}

const cases: Array<[string, () => boolean | Promise<boolean>]> = [
  // Keys.
  [
    "each provider's key shape passes under its own provider",
    () =>
      keyProblem("anthropic", ANTHROPIC_KEY) === null &&
      keyProblem("openai", OPENAI_KEY) === null &&
      keyProblem("gemini", ` ${GEMINI_KEY} `) === null &&
      keyProblem("gemini", "AQ." + "Ab8RN6" + "d".repeat(40)) === null,
  ],
  [
    "a key pasted under the wrong provider names the right one",
    () =>
      /Anthropic key\. Choose Claude/.test(keyProblem("openai", ANTHROPIC_KEY) ?? "") &&
      /Google key\. Choose Gemini/.test(keyProblem("anthropic", GEMINI_KEY) ?? "") &&
      /Google key\. Choose Gemini/.test(keyProblem("openai", "AQ." + "e".repeat(40)) ?? "") &&
      /OpenAI key\. Choose OpenAI/.test(keyProblem("gemini", OPENAI_KEY) ?? ""),
  ],
  [
    "an Anthropic key is not mistaken for an OpenAI one, though both start sk-",
    () => keyProblem("anthropic", OPENAI_KEY)?.includes("an OpenAI key") === true,
  ],
  [
    "a key that is nobody's says what the provider's keys look like",
    () => /start with AQ\. or AIza/.test(keyProblem("gemini", "hello") ?? ""),
  ],

  // The store.
  [
    "a version 1 store becomes the Anthropic key, and is written back as version 2",
    () => {
      store.clear();
      store.set(KEY_STORAGE, JSON.stringify({ version: 1, key: ANTHROPIC_KEY }));
      const read = loadLlmStore();
      const written = JSON.parse(store.get(KEY_STORAGE)!);
      return (
        read.provider === "anthropic" &&
        read.keys.anthropic === ANTHROPIC_KEY &&
        written.version === 2 &&
        written.keys.anthropic === ANTHROPIC_KEY
      );
    },
  ],
  [
    "a key and a model per provider, and forgetting one leaves the others",
    () => {
      store.clear();
      saveApiKey("anthropic", ANTHROPIC_KEY);
      chooseModel("anthropic", "claude-sonnet-5");
      saveApiKey("openai", OPENAI_KEY);
      chooseModel("openai", "gpt-4o");
      const both = loadLlmStore();
      clearApiKey("openai");
      const after = loadLlmStore();
      return (
        both.provider === "openai" &&
        both.keys.anthropic === ANTHROPIC_KEY &&
        both.models.openai === "gpt-4o" &&
        after.keys.openai === undefined &&
        after.models.openai === undefined &&
        after.keys.anthropic === ANTHROPIC_KEY &&
        after.models.anthropic === "claude-sonnet-5"
      );
    },
  ],
  [
    "a mangled store reads as empty rather than as someone else's choices",
    () => {
      store.clear();
      store.set(KEY_STORAGE, JSON.stringify({ version: 2, provider: "mistral", keys: { openai: 7, llama: "x" } }));
      const read = loadLlmStore();
      return read.provider === "anthropic" && Object.keys(read.keys).length === 0;
    },
  ],

  // Model lists.
  [
    "OpenAI's list keeps the models that write text, newest first, without repeated snapshots",
    () => {
      const ids = openAIOptions([
        { id: "gpt-4o", created: 100 },
        { id: "gpt-4o-2024-08-06", created: 90 },
        { id: "gpt-4.1-mini-2025-04-14", created: 150 },
        { id: "o3", created: 300 },
        { id: "chatgpt-4o-latest", created: 120 },
        { id: "text-embedding-3-large", created: 400 },
        { id: "gpt-4o-mini-tts", created: 410 },
        { id: "whisper-1", created: 1 },
        { id: "dall-e-3", created: 2 },
        { id: "gpt-image-1", created: 420 },
        { id: "gpt-4o-realtime-preview", created: 430 },
        { id: "omni-moderation-latest", created: 440 },
        { id: "gpt-4o-search-preview", created: 450 },
        { id: "gpt-3.5-turbo-instruct", created: 3 },
        { id: "o3-pro", created: 460 },
        { id: "gpt-5-codex", created: 470 },
        { id: "babbage-002", created: 4 },
        { id: "gpt-live-1", created: 480 },
      ]).map((m) => m.id);
      return ids.join() === "o3,gpt-4.1-mini-2025-04-14,chatgpt-4o-latest,gpt-4o";
    },
  ],
  [
    "Gemini's list keeps text models, highest version and stable first, and tells shared names apart",
    () => {
      const generate = ["generateContent", "countTokens"];
      const models = geminiOptions([
        { name: "models/gemini-2.0-flash", displayName: "Gemini 2.0 Flash", supportedGenerationMethods: generate },
        { name: "models/gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash-Lite", supportedGenerationMethods: generate },
        { name: "models/gemini-2.5-flash", displayName: "Gemini 2.5 Flash", supportedGenerationMethods: generate, outputTokenLimit: 65536 },
        { name: "models/gemini-2.5-flash-preview-09-2025", displayName: "Gemini 2.5 Flash", supportedGenerationMethods: generate },
        { name: "models/gemini-2.5-pro", displayName: "Gemini 2.5 Pro", supportedGenerationMethods: generate },
        { name: "models/gemini-2.5-flash-image", displayName: "Nano Banana", supportedGenerationMethods: generate },
        { name: "models/gemini-2.5-flash-preview-tts", displayName: "TTS", supportedGenerationMethods: generate },
        { name: "models/gemini-embedding-001", displayName: "Embedding", supportedGenerationMethods: ["embedContent"] },
        { name: "models/imagen-4.0-generate-001", displayName: "Imagen", supportedGenerationMethods: ["predict"] },
        { name: "models/gemini-omni-1.1-flash", displayName: "Gemini Omni 1.1 Flash", supportedGenerationMethods: generate },
        { name: "models/gemini-3.5-transcribe", displayName: "Gemini 3.5 Transcribe", supportedGenerationMethods: generate },
      ]);
      return (
        models.map((m) => m.id).join() ===
          "gemini-2.5-pro,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.5-flash-preview-09-2025,gemini-2.0-flash" &&
        models[1].label === "Gemini 2.5 Flash · gemini-2.5-flash" &&
        models[0].label === "Gemini 2.5 Pro" &&
        models[1].maxOutput === 65536
      );
    },
  ],
  [
    "a Claude model's capabilities decide what its request carries",
    () => {
      const supported = { supported: true };
      const unsupported = { supported: false };
      const current = anthropicOption({
        id: "claude-opus-5",
        display_name: "Claude Opus 5",
        max_tokens: 128000,
        capabilities: {
          thinking: { supported: true, types: { adaptive: supported, enabled: unsupported } },
          effort: { supported: true, low: supported, medium: supported, high: supported, max: supported },
        },
      } as unknown as Parameters<typeof anthropicOption>[0]);
      const older = anthropicOption({
        id: "claude-3-haiku-20240307",
        display_name: "Claude Haiku 3",
        max_tokens: 4096,
        capabilities: null,
      } as unknown as Parameters<typeof anthropicOption>[0]);
      return (
        current.adaptiveThinking === true &&
        current.mediumEffort === true &&
        older.adaptiveThinking === false &&
        older.mediumEffort === false &&
        older.maxOutput === 4096
      );
    },
  ],
  [
    "the model picked last is kept while the key can use it, then the default, then the newest",
    () => {
      const list = [{ id: "claude-sonnet-5", label: "" }, { id: "claude-opus-5", label: "" }];
      return (
        preferredModel("anthropic", list, "claude-sonnet-5") === "claude-sonnet-5" &&
        preferredModel("anthropic", list, "claude-gone") === "claude-opus-5" &&
        preferredModel("openai", [{ id: "o3", label: "" }], "gpt-gone") === "o3" &&
        preferredModel("gemini", [], undefined) === null
      );
    },
  ],

  [
    "OpenAI preselects its main text families rather than whatever is newest",
    () =>
      preferredModel(
        "openai",
        [{ id: "gpt-live-1", label: "" }, { id: "gpt-4.1-mini", label: "" }, { id: "o3", label: "" }],
        undefined,
      ) === "gpt-4.1-mini",
  ],
  [
    "a model that failed for good is hidden and unchosen, and a new key or restoring brings it back",
    () => {
      store.clear();
      saveApiKey("openai", OPENAI_KEY);
      chooseModel("openai", "gpt-live-1");
      hideModel("openai", "gpt-live-1");
      hideModel("openai", "gpt-live-1");
      const hidden = loadLlmStore();
      restoreModels("openai");
      const restored = loadLlmStore();
      hideModel("openai", "gpt-live-1");
      saveApiKey("openai", OPENAI_KEY.replace("b", "c"));
      const rekeyed = loadLlmStore();
      return (
        hidden.hidden.openai?.join() === "gpt-live-1" &&
        hidden.models.openai === undefined &&
        restored.hidden.openai === undefined &&
        rekeyed.hidden.openai === undefined
      );
    },
  ],

  // Cleanup and streaming.
  [
    "fences and a preamble come off, and so does an invented tint",
    () =>
      cleanDeck("Here is your deck:\n\n```text\n# CAP\ntint: #ff0000\nQ: What?\nA: That.\n```") ===
      "# CAP\nQ: What?\nA: That.",
  ],
  [
    "a deck that opens on front matter keeps it, and a tint on a card is left alone",
    () => cleanDeck("blurb: Short\n\nQ: tint: which?\nA: Pink.") === "blurb: Short\n\nQ: tint: which?\nA: Pink.",
  ],
  [
    "text still streaming in is not thrown away before it can become a deck",
    () => cleanDeck("Here is") === "Here is",
  ],
  [
    "events split across chunks, in CRLF, and one without a closing blank line all arrive whole",
    async () => {
      const events: string[] = [];
      for await (const data of readEvents(streamOf(['data: {"a"', ':1}\r\n\r\ndata: two\n\ndata: thr', "ee"]))) {
        events.push(data);
      }
      return events.join("|") === '{"a":1}|two|three';
    },
  ],

  // OpenAI.
  [
    "OpenAI streams a deck, and sends the prompt as system and user",
    async () => {
      answer(() =>
        sse([
          { choices: [{ delta: { content: "# CAP\nQ: What" } }] },
          { choices: [{ delta: { content: " is C?\nA: Consistency." } }] },
          { choices: [{ delta: {}, finish_reason: "stop" }] },
          "[DONE]",
        ]),
      );
      const seen: string[] = [];
      const text = await generateWithOpenAI(options("openai", { id: "gpt-4o", label: "gpt-4o" }, seen));
      const body = JSON.parse(String(calls[0].init?.body));
      const auth = (calls[0].init?.headers as Record<string, string>).Authorization;
      return (
        text === "# CAP\nQ: What is C?\nA: Consistency." &&
        seen.length === 2 &&
        calls[0].url === "https://api.openai.com/v1/chat/completions" &&
        auth === `Bearer ${OPENAI_KEY}` &&
        body.model === "gpt-4o" &&
        body.stream === true &&
        body.messages[0].role === "system" &&
        body.messages[1].content === "Write a deck of 8 cards on: CAP"
      );
    },
  ],
  [
    "OpenAI running out of room says the deck was cut off",
    async () => {
      answer(() => sse([{ choices: [{ delta: { content: "# CAP" }, finish_reason: "length" }] }, "[DONE]"]));
      return failsWith(() => generateWithOpenAI(options("openai", { id: "gpt-4o", label: "" })), CUT_OFF);
    },
  ],
  [
    "an OpenAI refusal says the model declined",
    async () => {
      answer(() => sse([{ choices: [{ delta: { refusal: "I can't help with that." }, finish_reason: "stop" }] }, "[DONE]"]));
      return failsWith(() => generateWithOpenAI(options("openai", { id: "gpt-4o", label: "" })), DECLINED);
    },
  ],
  [
    "OpenAI out of credit, a bad key, and a model the key cannot use each say what to do",
    async () =>
      (await (async () => {
        answer(() => json(429, { error: { message: "You exceeded your current quota", code: "insufficient_quota" } }));
        return failsWith(() => generateWithOpenAI(options("openai", { id: "gpt-4o", label: "" })), /out of credit/);
      })()) &&
      explainOpenAI(401, { error: { message: "Incorrect API key provided: sk-invalid.", code: "invalid_api_key" } }).startsWith(
        "That key was rejected",
      ) &&
      explainOpenAI(404, { error: { code: "model_not_found" } }).includes("Pick another model"),
  ],
  [
    "OpenAI's real not-a-chat-model response says so, and marks the model unusable",
    async () => {
      const notChat = {
        error: {
          message:
            "This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?",
          type: "invalid_request_error",
          param: "model",
          code: null,
        },
      };
      answer(() => json(404, notChat));
      let unusable = false;
      let message = "";
      try {
        await generateWithOpenAI(options("openai", { id: "gpt-live-1", label: "gpt-live-1" }));
      } catch (error) {
        unusable = error instanceof GenerateError && error.unusableModel;
        message = error instanceof Error ? error.message : "";
      }
      return (
        unusable &&
        message.startsWith("That model can't write a deck from here") &&
        explainOpenAI(400, notChat).startsWith("That model can't write a deck from here") &&
        unusableOpenAI(404, { error: { code: "model_not_found" } }) &&
        !unusableOpenAI(429, { error: { code: "rate_limit_exceeded" } }) &&
        !unusableOpenAI(401, { error: { code: "invalid_api_key" } })
      );
    },
  ],
  [
    "a restricted OpenAI key missing a scope says which permission to set, not that it was rejected",
    async () => {
      const scope = (missing: string) => ({
        error: {
          message: `You have insufficient permissions for this operation. Missing scopes: ${missing}. Check that you have the correct role in your organization (Reader, Writer, Owner) and project (Member, Owner), and if you're using a restricted API key, that it has the necessary scopes.`,
          type: "invalid_request_error",
          param: null,
          code: null,
        },
      });
      answer(() => json(401, scope("model.request")));
      let unusable = true;
      let message = "";
      try {
        await generateWithOpenAI(options("openai", { id: "gpt-3.5-turbo", label: "gpt-3.5-turbo" }));
      } catch (error) {
        unusable = error instanceof GenerateError && error.unusableModel;
        message = error instanceof Error ? error.message : "";
      }
      return (
        !unusable &&
        message.includes("set Model capabilities to Request") &&
        explainOpenAI(403, scope("api.model.read")).includes("set List models to Read") &&
        explainOpenAI(401, scope("api.files.read")).includes("missing a permission")
      );
    },
  ],
  [
    "OpenAI unreachable says to check the connection",
    async () => {
      globalThis.fetch = (async () => {
        throw new TypeError("Failed to fetch");
      }) as typeof fetch;
      return failsWith(() => generateWithOpenAI(options("openai", { id: "gpt-4o", label: "" })), /Could not reach OpenAI/);
    },
  ],

  // Gemini.
  [
    "Gemini streams a deck, leaves out thoughts, and asks for the model's own output ceiling",
    async () => {
      answer(() =>
        sse([
          { candidates: [{ content: { parts: [{ text: "thinking about it", thought: true }, { text: "# CAP\n" }] } }] },
          { candidates: [{ content: { parts: [{ text: "Q: What is C?\nA: Consistency." }] }, finishReason: "STOP" }] },
        ]),
      );
      const text = await generateWithGemini(
        options("gemini", { id: "gemini-2.5-flash", label: "", maxOutput: 65536 }),
      );
      const body = JSON.parse(String(calls[0].init?.body));
      const key = (calls[0].init?.headers as Record<string, string>)["x-goog-api-key"];
      return (
        text === "# CAP\nQ: What is C?\nA: Consistency." &&
        calls[0].url ===
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse" &&
        key === GEMINI_KEY &&
        body.generationConfig.maxOutputTokens === 65536 &&
        body.systemInstruction.parts[0].text.startsWith("You write flashcard decks")
      );
    },
  ],
  [
    "Gemini running out of room is cut off, and a safety stop is declined",
    async () => {
      const model = { id: "gemini-2.5-flash", label: "" };
      answer(() => sse([{ candidates: [{ content: { parts: [{ text: "# CAP" }] }, finishReason: "MAX_TOKENS" }] }]));
      const cut = await failsWith(() => generateWithGemini(options("gemini", model)), CUT_OFF);
      answer(() => sse([{ candidates: [{ finishReason: "SAFETY" }] }]));
      const declined = await failsWith(() => generateWithGemini(options("gemini", model)), DECLINED);
      answer(() => sse([{ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } }]));
      const blocked = await failsWith(() => generateWithGemini(options("gemini", model)), DECLINED);
      return cut && declined && blocked;
    },
  ],
  [
    "Gemini's real bad-key response says the key was rejected, and quota says to wait",
    async () => {
      const badKey = {
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "API_KEY_INVALID",
              domain: "googleapis.com",
              metadata: { service: "generativelanguage.googleapis.com" },
            },
          ],
        },
      };
      answer(() => json(400, badKey));
      const rejected = await failsWith(
        () => generateWithGemini(options("gemini", { id: "gemini-2.5-flash", label: "" })),
        /^That key was rejected/,
      );
      return (
        rejected &&
        explainGemini(429, { error: { status: "RESOURCE_EXHAUSTED", message: "quota" } }).includes("quota is used up")
      );
    },
  ],
  [
    "a Gemini or Claude model the key cannot reach is marked unusable, and a quota error is not",
    async () => {
      const unusableFrom = async (run: () => Promise<unknown>) => {
        try {
          await run();
          return null;
        } catch (error) {
          return error instanceof GenerateError ? error.unusableModel : null;
        }
      };
      answer(() => json(404, { error: { code: 404, status: "NOT_FOUND", message: "models/gemini-9 is not found" } }));
      const gemini404 = await unusableFrom(() => generateWithGemini(options("gemini", { id: "gemini-9", label: "" })));
      answer(() => json(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "quota" } }));
      const gemini429 = await unusableFrom(() => generateWithGemini(options("gemini", { id: "gemini-2.5-flash", label: "" })));
      answer(() => json(404, { type: "error", error: { type: "not_found_error", message: "model: claude-gone" } }));
      const claude404 = await unusableFrom(() => generateWithClaude(options("anthropic", { id: "claude-gone", label: "" })));
      return gemini404 === true && gemini429 === false && claude404 === true;
    },
  ],
  [
    "a Gemini model that only supports the Interactions API says so, and is marked unusable",
    async () => {
      const interactions = {
        error: { code: 400, message: "This model only supports Interactions API.", status: "INVALID_ARGUMENT" },
      };
      answer(() => json(400, interactions));
      let unusable = false;
      let message = "";
      try {
        await generateWithGemini(options("gemini", { id: "gemini-omni-flash-preview", label: "" }));
      } catch (error) {
        unusable = error instanceof GenerateError && error.unusableModel;
        message = error instanceof Error ? error.message : "";
      }
      return (
        unusable &&
        message === "That model can't write a deck from here. Pick another model." &&
        explainGemini(400, interactions) === message &&
        !unusableGemini(400, { error: { status: "INVALID_ARGUMENT", message: "Request contains an invalid argument." } })
      );
    },
  ],
  [
    "Gemini's model list is read across pages",
    async () => {
      const generate = ["generateContent"];
      answer((call) =>
        call.url.includes("pageToken=next")
          ? json(200, { models: [{ name: "models/gemini-2.5-pro", supportedGenerationMethods: generate }] })
          : json(200, {
              models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: generate }],
              nextPageToken: "next",
            }),
      );
      const models = await listGeminiModels(GEMINI_KEY);
      return calls.length === 2 && models.map((m) => m.id).join() === "gemini-2.5-pro,gemini-2.5-flash";
    },
  ],

  // Claude.
  [
    "Claude's request carries adaptive thinking, effort and fallbacks only where the model takes them",
    async () => {
      const events = [
        { type: "message_start", message: { id: "m", type: "message", role: "assistant", model: "x", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } },
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: DECK } },
        { type: "content_block_stop", index: 0 },
        { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 10 } },
        { type: "message_stop" },
      ];
      const stream = () =>
        new Response(streamOf(events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });

      answer(stream);
      const text = await generateWithClaude(
        options("anthropic", { id: "claude-opus-5", label: "", maxOutput: 128000, adaptiveThinking: true, mediumEffort: true }),
      );
      const current = JSON.parse(String(calls[0].init?.body));
      const beta = new Headers(calls[0].init?.headers).get("anthropic-beta") ?? "";

      answer(stream);
      await generateWithClaude(options("anthropic", { id: "claude-3-haiku-20240307", label: "", maxOutput: 4096 }));
      const older = JSON.parse(String(calls[0].init?.body));

      return (
        text === DECK.trim() &&
        current.thinking?.type === "adaptive" &&
        current.output_config?.effort === "medium" &&
        current.fallbacks === "default" &&
        beta.includes("server-side-fallback-2026-07-01") &&
        current.max_tokens === 64000 &&
        older.thinking === undefined &&
        older.output_config === undefined &&
        older.fallbacks === undefined &&
        older.max_tokens === 4096
      );
    },
  ],
];

// The runner compiles to CommonJS, which has no top-level await.
void (async () => {
  let failed = 0;
  for (const [name, check] of cases) {
    let ok = false;
    try {
      ok = await check();
    } catch (error) {
      ok = false;
      console.log(`       threw: ${String(error)}`);
    }
    if (!ok) failed++;
    console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
  }
  console.log(failed === 0 ? "\nall llm cases pass" : `\n${failed} failing`);

  if (failed > 0) process.exitCode = 1;
})();
