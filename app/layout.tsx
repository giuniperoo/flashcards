import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import SyncAgent from "@/components/SyncAgent";
import { Say } from "@/components/Voice";
import { decks } from "@/lib/loadDecks";
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

/* A page names itself first, so a row of tabs reads "ACID", "Kafka", "Add a
   deck" rather than "Flashcards" several times over. */
export const metadata: Metadata = {
  title: { default: "Flashcards", template: "%s · Flashcards" },
  description: "Interview flashcard decks, drilled by recall.",
};

/*
 * The browser's own bar on a phone takes this color, so it runs into the page
 * rather than sitting above it in white. It is `--color-paper` from
 * `app/globals.css`, duplicated because a meta tag cannot read a CSS variable:
 * change it there first, then here. One value, because the app has one scheme;
 * a phone in dark mode still shows the paper.
 *
 * Next still writes `width=device-width, initial-scale=1` alongside it.
 */
export const viewport: Viewport = {
  themeColor: "#f6f4ef",
};

/*
 * Marks the page's mode before it paints, on the study routes, so the sage mark
 * is there from the first frame instead of the cream one flashing first. It
 * only has to answer from the address: a study route is free study unless it
 * carries `?scheduled`, `/study/all` included.
 *
 * "schedule" is set too, not left to the reviewer, because the page is
 * prerendered without the address and so draws the free study reviewer; on a
 * schedule that frame is hidden until the session is dealt. See `data-pending`
 * in `app/globals.css`. The
 * reviewer then keeps the attribute in step — "Study anyway" drops into free
 * study without a page load — and removes it when it goes. On the index the
 * mode is a stored preference instead; see below.
 *
 * `suppressHydrationWarning` on `<html>` is for this attribute: it is set
 * before React arrives, so React would otherwise report it as a mismatch.
 */
/*
 * On the index it does two more things, both from storage. It sets the mode
 * from the stored preference, by the rule `loadPrefs` in `lib/prefs.ts` uses:
 * only a `false` from version 4 on is free study. The import screen, the print
 * pages and any other page, a missing one included, get the same stored mode,
 * since they have none of their own and
 * should still look like the app the reader is in; `useStoredMode` keeps it
 * there on a client navigation. And on the index it marks the page
 * `data-index-pending`, which keeps the index's content out of sight until
 * `DeckIndex` has read the preferences and the imported decks and taken the
 * mark off, so the first thing drawn is the reader's own index rather than the
 * server's defaults. Two seconds on, the mark comes off regardless, so a page
 * whose scripts failed after this one ran is never left blank.
 */
/*
 * Before any of that, on every page, the voice. `?swearengen` in the address
 * turns Al Swearengen's voice on and `?swearengen=off` turns it off, and
 * either is written to the `voice` cookie for a year, so it holds without every
 * link carrying it; then the cookie decides whether `<html>` gets
 * `data-voice="swearengen"`. Plain is the absence of both. See `lib/voice.ts`.
 */
const MODE_BEFORE_PAINT = `(function(){try{var d=document.documentElement,p=location.pathname;try{var v=new URLSearchParams(location.search).get("swearengen");if(v!==null)document.cookie=v==="off"?"voice=; path=/; max-age=0; samesite=lax":"voice=swearengen; path=/; max-age=31536000; samesite=lax";if(/(?:^|;\\s*)voice=swearengen(?:;|$)/.test(document.cookie))d.setAttribute("data-voice","swearengen")}catch(e){}function stored(){var s=JSON.parse(localStorage.getItem("prefs:index")||"null");return s&&typeof s.version==="number"&&s.version>=4&&s.scheduled===false?"free":"schedule"}if(p==="/"){d.setAttribute("data-index-pending","");setTimeout(function(){d.removeAttribute("data-index-pending")},2000);d.setAttribute("data-mode",stored());return}if(p==="/new"||p.indexOf("/print/")===0){d.setAttribute("data-mode",stored());return}if(p.indexOf("/study/")!==0){d.setAttribute("data-mode",stored());return}d.setAttribute("data-mode",new URLSearchParams(location.search).has("scheduled")?"schedule":"free")}catch(e){}})()`;

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
              className="inline-flex cursor-pointer rounded-sm opacity-90 transition-opacity select-none hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              {/*
                next/image has nothing to optimize in a 4KB vector already at
                its final size, and would need dangerouslyAllowSVG turned on to
                serve it at all. 132x38 puts the mark's letters at about 9.5px
                against the 11px label opposite; smaller reads weedy beside it.
                The alt text carries the name the link used to spell out.

                cursor-pointer, select-none and draggable={false} make the mark
                behave as one clickable object rather than as content sitting
                inside a link: no text caret over it, no drag ghost, and the
                pointer does not depend on a browser's default for a link.

                Two marks, and CSS shows one: sage while the page is in free
                study, cream otherwise, keyed off `data-mode` on <html>. Every
                page sets it: a study page from its address, the index, the
                import screen and the print pages from the saved mode. Both come out of `tools/wordmark.py`.
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
            <span className="label text-muted">
              <Say k="layout.tagline" />
            </span>
          </header>
          <main className="flex-1">{children}</main>
          <SyncAgent slugs={decks.map((deck) => deck.slug)} />
        </div>
      </body>
    </html>
  );
}
