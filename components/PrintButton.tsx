"use client";

export default function PrintButton({ label = "Print these sheets" }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-sm border border-ink px-4 py-2 text-sm font-medium hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {label}
    </button>
  );
}
