"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/*
 * The printed pages, drawn to fit the column on screen.
 *
 * A sheet is A4 at its real size, 210mm, which a browser draws 794px wide.
 * Below the widest shell the column has about 670px, so the preview used to
 * scroll sideways and cut the right-hand column of cards off. Here the pages
 * are zoomed to fit instead, and on a column wide enough a sheet's front and
 * back sit side by side, which is where the mirroring can be checked: card 1
 * top left on the front, its answer top right on the back.
 *
 * Screen only. `zoom` and the layout live in `@media screen` in
 * `app/globals.css`, so the pages print at exactly the size they always did;
 * the geometry there is load-bearing, and this does not touch it.
 *
 * A client component because the fit has to be measured: CSS cannot yet divide
 * a column's width by 210mm in every browser. It is hidden until the first
 * measurement, which lands before paint on a client render, so the full-size
 * pages never show; `<noscript>` shows them unzoomed without scripts.
 */

/** 210mm at the 96 pixels to the inch CSS draws millimeters at. */
const SHEET_WIDTH = (210 / 25.4) * 96;

/** Between a front and its back when they sit side by side. */
const GAP = 24;

/** Side by side only while each page keeps at least this share of its size;
    below it the two stack and each gets the whole width. */
const PAIR_FLOOR = 0.6;

type Fit = { zoom: number; pairs: boolean };

function fitFor(width: number): Fit {
  const paired = (width - GAP) / 2 / SHEET_WIDTH;
  if (paired >= PAIR_FLOOR) return { zoom: Math.min(1, paired), pairs: true };
  return { zoom: Math.min(1, width / SHEET_WIDTH), pairs: false };
}

export default function PrintPreview({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const next = fitFor(el.clientWidth);
      // The zoom changes the frame's height, which the observer also reports;
      // keeping the same object when nothing changed stops that re-rendering.
      setFit((current) =>
        current && current.zoom === next.zoom && current.pairs === next.pairs
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frame}
      className="sheet-frame"
      data-fit={fit ? (fit.pairs ? "pairs" : "stack") : undefined}
      style={fit ? ({ "--sheet-zoom": fit.zoom } as CSSProperties) : undefined}
    >
      <noscript>
        <style>{`.sheet-frame { visibility: visible !important; }`}</style>
      </noscript>
      {children}
    </div>
  );
}
