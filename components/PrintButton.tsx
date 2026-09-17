"use client";

export default function PrintButton({ label = "Print these sheets" }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="press min-h-11 pointer-fine:min-h-9 rounded-sm border border-ink px-4 py-2 pointer-fine:py-1.5 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {label}
    </button>
  );
}
