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
          Runs before paint, so decks the reader has hidden never flash up
          during hydration. It reads the same key as `lib/prefs.ts` and sets the
          attribute that `globals.css` hides the grid on; React owns the element
          from hydration onwards. A constant string, not user input — see the
          note in `lib/apiKey.ts`.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var p=JSON.parse(localStorage.getItem("prefs:index")||"{}");' +
              'if(p.showBuiltIns===false)' +
              'document.documentElement.setAttribute("data-built-ins-hidden","")}catch(e){}',
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
          <footer className="no-print label mt-16 border-t border-rule pt-4 text-muted">
            Same cards as the printed decks
          </footer>
        </div>
      </body>
    </html>
  );
}
