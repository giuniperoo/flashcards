import type { Card } from "./types";
import { newCardId } from "./cardId";

export type ParseIssue = { line: number; message: string };

export type ParseResult = {
  title: string;
  blurb: string;
  tint: string | null;
  ink: string | null;
  order: number | null;
  cards: Card[];
  errors: ParseIssue[];
  warnings: ParseIssue[];
};

const QUESTION = /^(?:q|question)\s*[:.)-]\s*(.*)$/i;
const ANSWER = /^(?:a|answer)\s*[:.)-]\s*(.*)$/i;
const TITLE = /^#\s+(.*)$/;
const META = /^(tint|colour|color|ink|blurb|order)\s*:\s*(.*)$/i;
const CARD_ID = /^id\s*[:.)-]\s*(.+)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADING = /^##+\s+(.*)$/;
const TABLE_RULE = /^\|?[\s:|-]+\|[\s:|-]*$/;

function tidy(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normaliseTint(value: string): string | null {
  const hex = value.trim().replace(/^#?/, "#");
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : null;
}

/**
 * Accepts three shapes, in order of preference:
 *   1. `Q:` / `A:` blocks, answers may run over several lines
 *   2. `## question` headings followed by the answer as body text
 *   3. One pair per line, split on a tab or a pipe
 * Anything before the first card is treated as front matter.
 */
export function parseDeck(input: string): ParseResult {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");

  const result: ParseResult = {
    title: "",
    blurb: "",
    tint: null,
    ink: null,
    order: null,
    cards: [],
    errors: [],
    warnings: [],
  };

  const hasQA = lines.some((l) => QUESTION.test(l.trim()));
  const hasHeadings = lines.some((l) => HEADING.test(l.trim()));

  let pendingQ: { text: string; line: number } | null = null;
  let pendingA: string[] = [];
  let pendingId: string | null = null;
  let field: "q" | "a" | null = null;

  const flush = () => {
    if (!pendingQ) return;
    const answer = tidy(pendingA.join(" "));
    if (!answer) {
      result.errors.push({
        line: pendingQ.line,
        message: `Question has no answer: "${pendingQ.text.slice(0, 48)}"`,
      });
    } else {
      result.cards.push({
        id: pendingId ?? newCardId(),
        q: tidy(pendingQ.text),
        a: answer,
      });
    }
    pendingId = null;
    pendingQ = null;
    pendingA = [];
    field = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const lineNo = i + 1;

    if (!line) {
      if (field === "a") field = null;
      return;
    }

    // An `id:` line belongs to the card below it, so the card above is closed
    // out first.
    //
    // Mid-answer it has to be a uuid to count. The guard used to be `field !==
    // "a"` alone, on the reasoning that an answer happening to begin "id:" is
    // still an answer — but a deck written without a blank line between its
    // cards is still mid-answer when the next card's id arrives, and every id
    // after the first was swallowed into the answer above it and replaced with
    // a fresh one. That silently rekeys a card on each parse, and progress is
    // kept by card id.
    const idLine = CARD_ID.exec(line);
    if (idLine) {
      const value = idLine[1].trim();
      const isId = UUID.test(value);
      if (isId || field !== "a") {
        flush();
        pendingId = isId ? value.toLowerCase() : null;
        if (!isId) {
          result.warnings.push({
            line: lineNo,
            message: `Not a uuid, so a new id was generated: "${value.slice(0, 40)}"`,
          });
        }
        return;
      }
    }

    const title = TITLE.exec(line);
    if (title && result.cards.length === 0 && !pendingQ) {
      result.title = tidy(title[1]);
      return;
    }

    const meta = META.exec(line);
    if (meta && result.cards.length === 0 && !pendingQ) {
      const bareKey = meta[1].toLowerCase();
      if (bareKey === "blurb") {
        result.blurb = tidy(meta[2]);
      } else if (bareKey === "order") {
        const parsed = Number.parseInt(meta[2].trim(), 10);
        if (Number.isFinite(parsed)) result.order = parsed;
      } else if (bareKey === "ink") {
        result.ink = normaliseTint(meta[2]);
      } else {
        const tint = normaliseTint(meta[2]);
        if (tint) {
          result.tint = tint;
        } else {
          result.warnings.push({
            line: lineNo,
            message: `Not a six-digit hex colour, so a tint was picked for you: "${meta[2]}"`,
          });
        }
      }
      return;
    }

    if (hasQA) {
      const q = QUESTION.exec(line);
      if (q) {
        flush();
        pendingQ = { text: q[1], line: lineNo };
        field = "q";
        return;
      }

      const a = ANSWER.exec(line);
      if (a) {
        if (!pendingQ) {
          result.errors.push({
            line: lineNo,
            message: "Answer with no question above it",
          });
          return;
        }
        pendingA.push(a[1]);
        field = "a";
        return;
      }

      if (field === "q" && pendingQ) {
        pendingQ.text += ` ${line}`;
      } else if (pendingQ) {
        pendingA.push(line);
        field = "a";
      } else {
        result.warnings.push({
          line: lineNo,
          message: `Ignored, no Q: above it: "${line.slice(0, 40)}"`,
        });
      }
      return;
    }

    if (hasHeadings) {
      const heading = HEADING.exec(line);
      if (heading) {
        flush();
        pendingQ = { text: heading[1], line: lineNo };
        field = "a";
        return;
      }
      if (pendingQ) pendingA.push(line);
      return;
    }

    if (TABLE_RULE.test(line)) return;

    const parts = line.includes("\t") ? line.split("\t") : line.split("|");
    const cells = parts.map((p) => p.trim()).filter((p) => p.length > 0);

    if (cells.length >= 2) {
      const [q, ...rest] = cells;
      if (/^(question|q)$/i.test(q) && /^(answer|a)$/i.test(rest[0] ?? "")) {
        return;
      }
      result.cards.push({
        id: pendingId ?? newCardId(),
        q: tidy(q),
        a: tidy(rest.join(" ")),
      });
      pendingId = null;
    } else {
      result.warnings.push({
        line: lineNo,
        message: `Could not find a question and answer on this line: "${line.slice(0, 40)}"`,
      });
    }
  });

  flush();

  if (!result.title) result.title = "Untitled deck";
  if (result.cards.length === 0 && result.errors.length === 0) {
    result.errors.push({
      line: 1,
      message: "No cards found — check the format guide below",
    });
  }

  return result;
}

export const EXAMPLE_DECK = `# Kubernetes basics
tint: #D6E8F7
blurb: Pods, services, and what the scheduler actually does

Q: What is a pod?
A: The smallest deployable unit in Kubernetes — one or more containers
that share a network namespace and storage, scheduled together on one node.

Q: What does a Service do?
A: Gives a stable virtual IP and DNS name in front of a changing set of pods,
load balancing across whichever ones currently pass their readiness check.
`;
