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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${label.variable}`}>
      <head>
        {/*
          Applies the reader's deck preferences before paint, so decks they
          have hidden never flash up while the page hydrates — the server has
          no way to know which those are. Same storage key as `lib/prefs.ts`;
          `DeckIndex` removes this tag once React is rendering the truth.
          Slugs are checked against the shape a slug can have before going into
          a selector, so a hand-edited storage value cannot inject CSS.
        */}
        <script
          id="deck-prefs-script"
          dangerouslySetInnerHTML={{
            __html:
              'try{var p=JSON.parse(localStorage.getItem("prefs:index")||"{}"),r=[];' +
              'if(p.showBuiltIns===false)r.push(".built-ins");' +
              'else if(p.hiddenDecks&&p.hiddenDecks.length)p.hiddenDecks.forEach(function(s){' +
              'if(/^[a-z0-9-]+$/.test(s))r.push("[data-deck="+JSON.stringify(s)+"]")});' +
              'if(r.length){var t=document.createElement("style");t.id="deck-prefs";' +
              't.textContent=r.join(",")+"{display:none}";document.head.appendChild(t)}}catch(e){}',
          }}
        />
      </head>
      <body className="bg-paper font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-8 sm:py-8 print:max-w-none print:p-0">
          <header className="no-print mb-8 flex items-baseline justify-between border-b border-rule pb-4 sm:mb-10">
            <Link href="/" className="label text-muted hover:text-ink">
              Flashcards
            </Link>
            <span className="label text-muted">Recall, then flip</span>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
