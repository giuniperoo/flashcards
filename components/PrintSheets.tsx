import type { StudyCard } from "@/lib/types";
import { toSheets, type Sheet, type Slot } from "@/lib/print";

export default function PrintSheets({
  cards,
  title,
}: {
  cards: StudyCard[];
  title: string;
}) {
  return (
    <div className="sheet-frame">
      {toSheets(cards).map((sheet) => (
        <SheetPair key={sheet.first} sheet={sheet} title={title} />
      ))}
    </div>
  );
}

function SheetPair({ sheet, title }: { sheet: Sheet; title: string }) {
  const range = `cards ${sheet.first}-${sheet.last}`;

  return (
    <>
      <section className="sheet">
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

      <section className="sheet">
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
        style={{ color: isQuestion ? "#185FA5" : "#0F6E56" }}
      >
        CARD {slot.index + 1} · {isQuestion ? "QUESTION" : "ANSWER"}
      </span>
      <p className={isQuestion ? "pcard-q" : "pcard-a"}>
        {isQuestion ? slot.q : slot.a}
      </p>
    </div>
  );
}
