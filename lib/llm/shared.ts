import type { Provider } from "./providers";

/**
 * What every provider's adapter shares: the prompt, the options a generation
 * takes, the cleanup its text gets, the error it throws, and the reader for a
 * streamed response.
 *
 * The model produces *text*, not cards. That is deliberate: the output lands in
 * the importer's textarea, where it is parsed, previewed and edited before
 * anything is saved. A generated card is a claim about the world that a person
 * is about to memorize, so the review step is the feature, not friction.
 */

/** The format rules, kept in step with the guide on `/new` and CLAUDE.md. The
    same prompt goes to every provider; `cleanDeck` absorbs the habits the
    others have that Claude does not. */
export const SYSTEM = `You write flashcard decks for a printed-and-studied flashcard app. Output the deck as plain text in exactly this format, and nothing else — no preamble, no commentary, no code fences:

# Deck title
blurb: One short line saying what the deck covers

Q: The question?
A: The answer.

Q: The next question?
A: The next answer.

Rules, all of which matter:

- Every card is one \`Q:\` line and one \`A:\` line, with a blank line between cards.
- Answers are one or two sentences, and never longer than about 300 characters. These cards get printed on paper at a fixed size — a long answer overflows the card and there is no scrollbar on paper. This is the constraint people most often break.
- Questions are specific enough to have a right answer. "Explain caching" is a bad card; "What does a cache-aside read do on a miss?" is a good one.
- Sentence case throughout. No title case, no exclamation marks.
- Write the answer someone should be able to produce from memory, not a paragraph of background.
- Do not emit \`id:\` lines. The app assigns card ids itself.
- Do not emit a \`tint:\` line. The app picks a color from its own palette.
- Cover the subject in a sensible order: definitions and vocabulary first, then mechanisms, then trade-offs and the questions an interviewer would actually ask.
- No two cards should test the same fact.`;

/**
 * A model someone can pick, as the provider's own list describes it. The fields
 * past `label` are only what an adapter needs to shape its request: an output
 * ceiling, and for Claude, which thinking and effort settings it accepts.
 */
export type ModelOption = {
  id: string;
  label: string;
  maxOutput?: number;
  adaptiveThinking?: boolean;
  mediumEffort?: boolean;
};

export type GenerateOptions = {
  provider: Provider;
  model: ModelOption;
  subject: string;
  count: number;
  apiKey: string;
  /** A previous generation to revise, when the user asks for an adjustment. */
  previous?: string;
  /** What to change about it, e.g. "fewer definitions, more scenarios". */
  note?: string;
  /** Called with the text so far, so the textarea fills as it streams. */
  onText: (full: string) => void;
  signal?: AbortSignal;
};

export function buildPrompt({ subject, count, previous, note }: GenerateOptions) {
  if (previous && note) {
    return [
      `Here is a deck you wrote:`,
      ``,
      previous,
      ``,
      `Revise it: ${note}`,
      ``,
      `Return the complete revised deck in the same format, still about ${count} cards. Keep the cards that are working; change the ones the note is about.`,
    ].join("\n");
  }
  return `Write a deck of ${count} cards on: ${subject}`;
}

/** A failure with a message written for the reader: what went wrong, on whose
    account, and what to do about it. `unusableModel` marks the failures that
    are about the model rather than the moment: it is not one that writes text
    this way, or the key cannot reach it after all. The generator hides those
    from the list, since trying again will not help. */
export class GenerateError extends Error {
  constructor(
    message: string,
    readonly unusableModel = false,
  ) {
    super(message);
  }
}

export const DECLINED =
  "The model declined to write this deck. Try a different subject, or another model.";
export const CUT_OFF =
  "The deck was cut off before it finished. Try asking for fewer cards, or another model.";

const CARD_LINE = /^\s*(?:q|question)\s*[:.)-]/i;
const FENCE = /^\s*```/;

/**
 * Takes what a model wrote as far as the importer is concerned.
 *
 * - A `tint:` or `ink:` line is dropped. The prompt asks for neither, but asking
 *   is not guaranteeing, and `saveCustomDeck` honors any tint it is handed — so
 *   one invented hex quietly bypasses the palette that `CLAUDE.md` says every
 *   new deck draws from. Only front matter is touched: a tint someone types or
 *   pastes is theirs.
 * - Code fence lines go. Models other than Claude wrap plain text in them often,
 *   whatever the prompt says, and the parser would read the fence as a line of
 *   the deck.
 * - Anything before the deck itself goes: the "Here is your deck:" line. The deck
 *   starts at its title, a front matter line like `blurb:`, or its first card,
 *   whichever comes first. Only once one of those has arrived, so text still
 *   streaming in is not thrown away before it has a chance to become one.
 */
export function cleanDeck(text: string) {
  const lines = text.split("\n").filter((line) => !FENCE.test(line));

  const start = lines.findIndex(
    (l) => /^\s*#\s/.test(l) || /^\s*[a-z][a-z-]*\s*:/i.test(l) || CARD_LINE.test(l),
  );
  const body = start > 0 ? lines.slice(start) : lines;

  const firstCard = body.findIndex((l) => CARD_LINE.test(l));
  const end = firstCard === -1 ? body.length : firstCard;
  const head = body
    .slice(0, end)
    .filter((l) => !/^\s*(?:tint|color|ink)\s*:/i.test(l));
  return [...head, ...body.slice(end)].join("\n");
}

/**
 * The `data:` payloads of a server-sent event stream, one per event, as they
 * arrive. OpenAI and Gemini both stream this way. A chunk can end partway
 * through a line, so the tail is held until the next one completes it.
 */
export async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];

  const flush = function* () {
    if (data.length) yield data.join("\n");
    data = [];
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line === "") yield* flush();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }

      if (done) {
        if (buffer.startsWith("data:")) data.push(buffer.slice(5).replace(/^ /, ""));
        yield* flush();
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** A response body as JSON, or null if it is not JSON — an error page from a
    proxy, say, rather than the API's own error shape. */
export async function jsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** The message and code out of an OpenAI- or Google-shaped error body. */
export function errorFields(body: unknown): {
  message: string;
  code: string;
  status: string;
  reason: string;
} {
  const error = (body as { error?: Record<string, unknown> } | null)?.error ?? {};
  const details = Array.isArray(error.details) ? error.details : [];
  const reason = details
    .map((d) => (d as { reason?: unknown })?.reason)
    .find((r): r is string => typeof r === "string");
  return {
    message: typeof error.message === "string" ? error.message : "",
    code: typeof error.code === "string" ? error.code : "",
    status: typeof error.status === "string" ? error.status : "",
    reason: reason ?? "",
  };
}
