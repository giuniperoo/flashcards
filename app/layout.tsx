import type { Metadata } from "next";
import Link from "next/link";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const label = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-label",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Interview flashcard decks, drilled by recall.",
};

/*
 * Marks the page as free study before it paints, on the study routes, so the
 * sage mark is there from the first frame instead of the cream one flashing
 * first. It only has to answer from the address: a study route is free study
 * unless it carries `?scheduled`, `/study/all` included. The
 * reviewer then keeps the attribute in step — "Study anyway" drops into free
 * study without a page load — and removes it when it goes. On the index the
 * mode is a stored preference instead, and `LogoSun` sets it; that is the same
 * trade the built-in decks already make there, appearing on hydration.
 *
 * `suppressHydrationWarning` on `<html>` is for this attribute: it is set
 * before React arrives, so React would otherwise report it as a mismatch.
 */
const MODE_BEFORE_PAINT = `(function(){try{var p=location.pathname;if(p.indexOf("/study/")!==0)return;if(!new URLSearchParams(location.search).has("scheduled"))document.documentElement.setAttribute("data-mode","free")}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${label.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_BEFORE_PAINT }} />
      </head>
      <body className="bg-paper font-sans antialiased">
        {/* `relative z-10` opens a stacking context, which is what lets the
            index's `LogoSun` sit behind this on a negative z-index without
            disappearing behind the body's own background. */}
        <div className="shell relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-8 sm:py-8 min-[1300px]:max-w-[75%] print:max-w-none print:p-0">
          <header className="no-print mb-8 flex items-center justify-between border-b border-rule pb-4 sm:mb-10">
            <Link
              href="/"
              className="inline-flex cursor-pointer rounded-sm opacity-90 transition-opacity select-none hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              {/*
                next/image has nothing to optimise in a 4KB vector already at
                its final size, and would need dangerouslyAllowSVG turned on to
                serve it at all. 132x38 puts the mark's letters at about 9.5px
                against the 11px label opposite; smaller reads weedy beside it.
                The alt text carries the name the link used to spell out.

                cursor-pointer, select-none and draggable={false} make the mark
                behave as one clickable object rather than as content sitting
                inside a link: no text caret over it, no drag ghost, and the
                pointer does not depend on a browser's default for a link.

                Two marks, and CSS shows one: cream on a schedule and anywhere
                else, sage while the page is in free study, keyed off
                `data-mode` on <html>. Both come out of `tools/wordmark.py`.
                `data-wordmark` sits on the wrapper because `LogoSun` measures
                it, and a hidden image measures as nothing.
              */}
              <span data-wordmark className="inline-flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="wordmark-schedule"
                  src="/logo.svg"
                  alt="Flashcards"
                  width={132}
                  height={38}
                  draggable={false}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="wordmark-free"
                  src="/logo-free.svg"
                  alt="Flashcards"
                  width={132}
                  height={38}
                  draggable={false}
                />
              </span>
            </Link>
            <span className="label text-muted">Recall, then flip</span>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
