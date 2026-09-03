/**
 * Deck colours.
 *
 * A tint is the pastel on the card corner; an ink is the darker shade at the
 * same hue used for text and progress bars. Built-in decks carry both in their
 * front matter, taken from the original print spec. Decks you add get one
 * picked here.
 *
 * Colours are chosen by *spread*, not from a list: the new hue is the one
 * furthest from every hue already on screen. A fixed palette runs out and then
 * repeats, and indexing it by deck count — which is what this used to do —
 * reassigns colours whenever a deck is deleted.
 */

/** Pastels sit in a narrow band; only the hue is worth varying. */
const TINT_SATURATION = 60;
const TINT_LIGHTNESS = 87;

/** Inks across the built-in decks run roughly S 47-70, L 30-49. */
const INK_SATURATION = 60;
const INK_LIGHTNESS = 38;

/** Where the wheel starts when nothing is on it yet. */
const FIRST_HUE = 210;

type Hsl = { h: number; s: number; l: number };

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

/**
 * The reading colour for a tint, at the tint's own hue.
 *
 * Replaces a flat multiply of the RGB channels, which desaturates as it
 * darkens and produced inks noticeably duller than the hand-picked ones.
 */
export function shadeForTint(tint: string): string {
  const { h } = hexToHsl(tint);
  return hslToHex(h, INK_SATURATION, INK_LIGHTNESS);
}

/**
 * A tint and ink for a new deck, as far as possible from the ones in use.
 *
 * Sorts the hues already taken, finds the widest gap between neighbours around
 * the wheel, and lands in the middle of it. Deterministic, so two decks added
 * in a row cannot collide the way random picks can.
 */
export function nextTint(taken: string[]): { tint: string; ink: string } {
  const hues = taken
    .filter((t) => /^#[0-9a-f]{6}$/i.test(t))
    .map((t) => hexToHsl(t))
    // A grey has no meaningful hue and would distort the gaps.
    .filter((c) => c.s > 5)
    .map((c) => c.h)
    .sort((a, b) => a - b);

  let hue = FIRST_HUE;

  if (hues.length === 1) {
    hue = (hues[0] + 180) % 360;
  } else if (hues.length > 1) {
    let widest = -1;
    for (let i = 0; i < hues.length; i += 1) {
      const from = hues[i];
      const to = i === hues.length - 1 ? hues[0] + 360 : hues[i + 1];
      const gap = to - from;
      if (gap > widest) {
        widest = gap;
        hue = (from + gap / 2) % 360;
      }
    }
  }

  return {
    tint: hslToHex(hue, TINT_SATURATION, TINT_LIGHTNESS),
    ink: hslToHex(hue, INK_SATURATION, INK_LIGHTNESS),
  };
}
