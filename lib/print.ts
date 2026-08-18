import type { StudyCard } from "./types";

export const CARDS_PER_SHEET = 8;
const COLS = 2;

export type Slot = StudyCard | null;

export type Sheet = {
  first: number;
  last: number;
  questions: Slot[];
  answers: Slot[];
};

/**
 * The answer page is printed on the back of the question page, so with a
 * long-edge flip the columns arrive reversed. Swapping each row left-to-right
 * puts every answer behind its own question.
 */
export function mirrorRows(slots: Slot[]): Slot[] {
  const out: Slot[] = [];
  for (let i = 0; i < slots.length; i += COLS) {
    out.push(...slots.slice(i, i + COLS).reverse());
  }
  return out;
}

export function toSheets(cards: StudyCard[]): Sheet[] {
  const sheets: Sheet[] = [];

  for (let i = 0; i < cards.length; i += CARDS_PER_SHEET) {
    const group = cards.slice(i, i + CARDS_PER_SHEET);
    const padded: Slot[] = [...group];
    while (padded.length < CARDS_PER_SHEET) padded.push(null);

    sheets.push({
      first: i + 1,
      last: i + group.length,
      questions: padded,
      answers: mirrorRows(padded),
    });
  }

  return sheets;
}
