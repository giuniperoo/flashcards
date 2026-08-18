/** Darken a pastel enough to read as the progress-bar and pill colour. */
export function shadeForTint(tint: string) {
  const n = parseInt(tint.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.55);
  const g = Math.round(((n >> 8) & 255) * 0.55);
  const b = Math.round((n & 255) * 0.55);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
