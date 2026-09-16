import type { StudyCard } from "@/lib/types";
import PrintPreview from "@/components/PrintPreview";
import { toSheets, type Sheet, type Slot } from "@/lib/print";

export default function PrintSheets({
  cards,
  title,
}: {
  cards: StudyCard[];
  title: string;
}) {
  return (
    <PrintPreview>
      {toSheets(cards).map((sheet, i) => (
        <SheetPair key={sheet.first} sheet={sheet} number={i + 1} title={title} />
      ))}
    </PrintPreview>
  );
}

function SheetPair({
  sheet,
  number,
  title,
}: {
  sheet: Sheet;
  number: number;
  title: string;
}) {
  const range = `cards ${sheet.first}-${sheet.last}`;

  return (
    <>
      {/* `data-label` names the page above it on screen, and never prints;
          see `.sheet::before` in `app/globals.css`. */}
      <section className="sheet" data-label={`Sheet ${number} · front`}>
        <header className="sheet-head">
          <span>
            {title} flashcards — questions ({range})
          </span>
          <span>
            Print double-sided, flip on long edge, cut along dashed lines
          </span>
        </header>
        <div className="sheet-grid">
          {sheet.questions.map((slot, i) => (
            <PrintCard key={i} slot={slot} side="question" />
          ))}
        </div>
      </section>

      <section className="sheet" data-label={`Sheet ${number} · back`}>
        <header className="sheet-head">
          <span>
            {title} flashcards — answers ({range})
          </span>
          <span>Columns mirrored so answers align with question backs</span>
        </header>
        <div className="sheet-grid">
          {sheet.answers.map((slot, i) => (
            <PrintCard key={i} slot={slot} side="answer" />
          ))}
        </div>
      </section>
    </>
  );
}

function PrintCard({ slot, side }: { slot: Slot; side: "question" | "answer" }) {
  if (!slot) return <div className="pcard" />;

  const isQuestion = side === "question";

  return (
    <div className="pcard">
      <span className="pcard-tri" style={{ background: slot.deck.tint }} />
      <span
        className="pcard-label"
        style={{
          color: isQuestion
            ? "var(--color-question)"
            : "var(--color-answer)",
        }}
      >
        CARD {slot.index + 1} · {isQuestion ? "QUESTION" : "ANSWER"}
      </span>
      <p className={isQuestion ? "pcard-q" : "pcard-a"}>
        {isQuestion ? slot.q : slot.a}
      </p>
    </div>
  );
}
