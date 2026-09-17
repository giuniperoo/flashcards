"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { DECK_PARAM } from "@/lib/deckFilter";
import { studyHref } from "@/lib/studyMode";
import { usePrefs } from "@/lib/usePrefs";
import { useStoredMode } from "@/lib/useStoredMode";

/*
 * The top of a print page: the same title row a study page has, and what to set
 * in the print dialog.
 *
 * A client component for one link. "Study" has to open the reviewer the reader
 * is using, which is the mode preference, the way the index's own study links
 * are; and on `/print/all` it has to keep the `?deck=` set this page is
 * printing. It used to be a plain `/study/{slug}`, which opened free study with
 * spaced repetition on, and every deck when a set had been printed.
 */

/** What to set, in the words the print dialogs use. */
const DIALOG: Array<[string, string]> = [
  ["Paper size", "A4"],
  ["Two-sided", "On, flip on long edge"],
  ["Scale", "100%"],
  ["Margins", "None"],
];

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
  const [prefs] = usePrefs();
  // The logo and ground in the reader's mode; a print page has none of its own.
  useStoredMode();
  const [search, setSearch] = useState("");
  useLayoutEffect(() => {
    const decks = new URLSearchParams(window.location.search).get(DECK_PARAM);
    setSearch(decks ? `?${DECK_PARAM}=${encodeURIComponent(decks)}` : "");
  }, []);

  const blanks = sheetCount * 8 - cardCount;

  return (
    <div className="no-print">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <div className="flex items-baseline gap-4">
          <Link
            href={studyHref(slug, prefs.scheduled, search)}
            className="label text-muted hover:text-ink"
          >
            Study
          </Link>
          <span aria-hidden className="label text-muted">
            ·
          </span>
          <Link href="/" className="label text-muted hover:text-ink">
            All decks
          </Link>
        </div>
      </div>

      {/* No "Preview" label under this: every page below carries its own. */}
      <div className="cut mb-8 rounded-sm bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-sm">
            {cardCount} {cardCount === 1 ? "card" : "cards"} · {sheetCount}{" "}
            {sheetCount === 1 ? "sheet" : "sheets"} · {sheetCount * 2} pages
          </p>
          <PrintButton />
        </div>

        <p className="label mt-5 text-muted">In the print dialog</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          {DIALOG.map(([setting, value]) => (
            <div key={setting} className="contents">
              <dt className="text-muted">{setting}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Answers are already mirrored, so each one lands on the back of its own
          question. Cut along the dashed lines.
          {blanks > 0 && (
            <>
              {" "}
              The last sheet has {blanks} blank{" "}
              {blanks === 1 ? "cell" : "cells"}, since this deck is not a
              multiple of eight.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
