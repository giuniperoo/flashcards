import Anthropic from "@anthropic-ai/sdk";

/**
 * Writes a deck in the `Q:` / `A:` format `lib/parseDeck.ts` already reads.
 *
 * The model produces *text*, not cards. That is deliberate: the output lands in
 * the importer's textarea, where it is parsed, previewed and edited before
 * anything is saved. A generated card is a claim about the world that a person
 * is about to memorise, so the review step is the feature, not friction.
 *
 * Runs in the browser against the user's own key. Anthropic supports this
 * directly — `dangerouslyAllowBrowser` makes the SDK send the
 * `anthropic-dangerous-direct-browser-access` header, which is what opens CORS.
 * There is no server in this path, and no key of ours anywhere.
 */

const MODEL = "claude-opus-5";

/** The format rules, kept in step with the guide on `/new` and CLAUDE.md. */
const SYSTEM = `You write flashcard decks for a printed-and-studied flashcard app. Output the deck as plain text in exactly this format, and nothing else — no preamble, no commentary, no code fences:

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
- Do not emit a \`tint:\` line. The app picks a colour from its own palette.
- Cover the subject in a sensible order: definitions and vocabulary first, then mechanisms, then trade-offs and the questions an interviewer would actually ask.
- No two cards should test the same fact.`;

export type GenerateOptions = {
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

function buildPrompt({ subject, count, previous, note }: GenerateOptions) {
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

/** Turns an SDK error into something that says what to do about it. Every one
    of these failures happens on an account we cannot see, so the message has to
    carry the diagnosis. */
function explain(error: unknown): string {
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
    return "That key doesn't have access to this model. Check the key's permissions in the Anthropic console.";
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
      return "That key isn't tied to a workspace — its scope was left as \"Same as linked account\". Make another key in the console with Scope set to a workspace such as \"Default\", and paste that one.";
    }
    return `The request was rejected: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Could not reach the API. Check your connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `The API returned an error: ${error.message}`;
  }
  return "Generation failed. Try again.";
}

/**
 * Drops a `tint:` or `ink:` line the model wrote anyway.
 *
 * The prompt asks for neither, but asking is not the same as guaranteeing, and
 * `saveCustomDeck` honours any tint it is handed — so one invented hex quietly
 * bypasses the palette that `CLAUDE.md` says every new deck draws from. Only
 * front matter is touched, and only on the generated path: a tint someone
 * types or pastes is theirs, and the format guide documents it.
 */
function stripTint(text: string) {
  const lines = text.split("\n");
  const firstCard = lines.findIndex((l) =>
    /^\s*(?:q|question)\s*[:.)-]/i.test(l),
  );
  const end = firstCard === -1 ? lines.length : firstCard;
  const head = lines
    .slice(0, end)
    .filter((l) => !/^\s*(?:tint|colour|color|ink)\s*:/i.test(l));
  return [...head, ...lines.slice(end)].join("\n");
}

export class GenerateError extends Error {}

export async function generateDeck(options: GenerateOptions): Promise<string> {
  const client = new Anthropic({
    apiKey: options.apiKey,
    dangerouslyAllowBrowser: true,
  });

  let full = "";

  try {
    const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(options) }],
    },
    { signal: options.signal },
  );

    stream.on("text", (chunk) => {
      full += chunk;
      options.onText(stripTint(full));
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new GenerateError(
        "The model declined to write this deck. Try a different subject.",
      );
    }
    if (message.stop_reason === "max_tokens") {
      throw new GenerateError(
        "The deck was cut off before it finished. Try asking for fewer cards.",
      );
    }
  } catch (error) {
    if (error instanceof GenerateError) throw error;
    if (options.signal?.aborted) return full;
    throw new GenerateError(explain(error));
  }

  return stripTint(full).trim();
}
