import Link from "next/link";
import PrintButton from "@/components/PrintButton";

export default function PrintIntro({
  title,
  slug,
  cardCount,
  sheetCount,
}: {
  title: string;
  slug: string;
  cardCount: number;
  sheetCount: number;
}) {
  const blanks = sheetCount * 8 - cardCount;

  return (
    <div className="no-print">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight">Print · {title}</h1>
        <Link href={`/study/${slug}`} className="label text-muted hover:text-ink">
          Back to study
        </Link>
      </div>

      <div className="cut mb-6 rounded-sm bg-card px-5 py-4">
        <p className="text-sm leading-relaxed">
          {cardCount} cards · {sheetCount}{" "}
          {sheetCount === 1 ? "sheet" : "sheets"} · {sheetCount * 2} pages.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Print double-sided, flipping on the <strong>long edge</strong>, at 100%
          scale with no margins added by the browser. Answer columns are already
          mirrored, so each answer lands on the back of its own question. Cut
          along the dashed lines.
          {blanks > 0 && (
            <>
              {" "}
              The last sheet has {blanks} blank{" "}
              {blanks === 1 ? "cell" : "cells"}, since this deck is not a
              multiple of eight.
            </>
          )}
        </p>
        <div className="mt-4">
          <PrintButton />
        </div>
      </div>

      <p className="label mb-2 text-muted">Preview</p>
    </div>
  );
}
