/*
 * The two voices. Every entry in the table has both, of the same kind, and
 * they differ, or the entry has no business being there. The phrases other
 * tests pin, and the provider errors people act on, still say what they say in
 * Swearengen's voice. And the cookie is read the way the pre-paint script
 * writes it.
 */
import { COPY, pick, say, type CopyKey } from "./copy";
import { explainGemini } from "./llm/gemini";
import { explainOpenAI } from "./llm/openai";
import { keyProblem } from "./llm/providers";
import { setVoiceForTests, voiceFromCookie } from "./voice";

const ANTHROPIC_KEY = "sk-ant-api03-" + "a".repeat(80);
const OPENAI_KEY = "sk-proj-" + "b".repeat(60);
const GEMINI_KEY = "AIza" + "c".repeat(35);

/* Something to fill each template in with. Numbers where a template counts,
   words where it names; every template here takes one or the other, and a
   boolean for the one that picks between two phrasings. */
function sample(fn: (...args: never[]) => string): string {
  const args = Array.from({ length: fn.length }, (_, i) => (i === 0 ? 2 : "x"));
  return (fn as unknown as (...args: unknown[]) => string)(...args);
}

function inSwearengen<T>(run: () => T): T {
  setVoiceForTests("swearengen");
  try {
    return run();
  } finally {
    setVoiceForTests(null);
  }
}

const keys = Object.keys(COPY) as CopyKey[];

const cases: Array<[string, () => boolean]> = [
  [
    "every entry has both voices, of the same kind",
    () =>
      keys.every((key) => {
        const { plain, swearengen } = COPY[key] as { plain: unknown; swearengen: unknown };
        if (typeof plain === "string") return typeof swearengen === "string" && plain !== "" && swearengen !== "";
        return (
          typeof plain === "function" &&
          typeof swearengen === "function" &&
          plain.length === swearengen.length
        );
      }),
  ],
  [
    "and the two voices differ, since a line that reads the same belongs where it is used",
    () =>
      keys.every((key) => {
        const { plain, swearengen } = COPY[key] as {
          plain: string | ((...args: never[]) => string);
          swearengen: string | ((...args: never[]) => string);
        };
        const a = typeof plain === "string" ? plain : sample(plain);
        const b = typeof swearengen === "string" ? swearengen : sample(swearengen);
        if (a === b) console.log(`       same in both: ${key}`);
        return a !== b;
      }),
  ],
  [
    "plain is the default, and say follows the voice",
    () =>
      say("reviewer.turnOver") === "Turn card over" &&
      inSwearengen(() => say("reviewer.turnOver")) === "Turn the fucker over" &&
      pick("index.blurbAll", "swearengen", 12) === "All 12 decks, dealt in together",
  ],
  [
    "the cookie is read the way the pre-paint script writes it",
    () =>
      voiceFromCookie("voice=swearengen") === "swearengen" &&
      voiceFromCookie("theme=dark; voice=swearengen; other=1") === "swearengen" &&
      voiceFromCookie("voice=") === "plain" &&
      voiceFromCookie("myvoice=swearengen") === "plain" &&
      voiceFromCookie(null) === "plain",
  ],
  [
    "a key under the wrong provider still names the right one, in either voice",
    () =>
      inSwearengen(
        () =>
          /Anthropic key\. Choose Claude/.test(keyProblem("openai", ANTHROPIC_KEY) ?? "") &&
          /Google key\. Choose Gemini/.test(keyProblem("anthropic", GEMINI_KEY) ?? "") &&
          /OpenAI key\. Choose OpenAI/.test(keyProblem("gemini", OPENAI_KEY) ?? "") &&
          /start with AQ\. or AIza/.test(keyProblem("gemini", "hello") ?? ""),
      ),
  ],
  [
    "the provider errors keep the words a reader acts on",
    () =>
      inSwearengen(() => {
        const scope = (missing: string) => ({
          error: { message: `You have insufficient permissions for this operation. Missing scopes: ${missing}.` },
        });
        return (
          explainOpenAI(401, { error: { message: "Incorrect API key provided", code: "invalid_api_key" } }).startsWith(
            "That key was rejected",
          ) &&
          explainOpenAI(429, { error: { code: "insufficient_quota" } }).includes("out of credit") &&
          explainOpenAI(404, { error: { code: "model_not_found" } }).includes("Pick another model") &&
          explainOpenAI(401, scope("api.model.request")).includes("set Model capabilities to Request") &&
          explainOpenAI(403, scope("api.model.read")).includes("set List models to Read") &&
          explainOpenAI(401, scope("api.files.read")).includes("missing a permission") &&
          explainGemini(429, { error: { status: "RESOURCE_EXHAUSTED", message: "quota" } }).includes("quota is used up")
        );
      }),
  ],
];

let failed = 0;
for (const [name, check] of cases) {
  let ok = false;
  try {
    ok = check();
  } catch (error) {
    ok = false;
    console.log(`       threw: ${String(error)}`);
  }
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
}
console.log(failed === 0 ? `\nall ${keys.length} entries, both voices` : `\n${failed} failing`);

if (failed > 0) process.exitCode = 1;
