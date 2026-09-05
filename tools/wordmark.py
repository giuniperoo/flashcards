#!/usr/bin/env python3
"""Regenerates public/logo.svg — the FLASH-bolt-CARDS wordmark.

Run it only to change the mark; the SVG it writes is the artefact the app and
anything else uses, and it is checked in.

    pip install fonttools brotli      # brotli is what reads a .woff2
    pnpm run build                    # puts IBM Plex Mono where this can find it
    python3 tools/wordmark.py

Two things are worth knowing before editing.

The letters are outlines, not <text>. An SVG that reaches a machine without IBM
Plex Mono would otherwise fall back to some other mono, and the frame — whose
width is baked in — would no longer fit the words inside it.

The spacing is measured on ink, not on advance widths. A browser's getBBox on
an SVG <text> returns the advance box, which in a monospace face is a good deal
wider than the letters: spacing the bolt that way leaves it visibly closer to
one word than the other. Every position here comes from a BoundsPen.
"""
from pathlib import Path
import sys

from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

OUT = Path("public/logo.svg")

# 19px with 0.14em of tracking is what the .label class sets, so the mark and
# the interface are lettered in the same voice.
SIZE, TRACK = 19.0, 3.4
GAP, PAD = 15.0, 34.0            # ink either side of the bolt; ink to the frame
HEIGHT = 76.0
FRAME_STROKE, RADIUS = 4.2, 16.0

# The ink gap to hold between each pair of letters.
#
# Monospace gives every glyph the same advance, which leaves FLASH opening on
# its widest gap (F.L, 7.01) and closing on its tightest (A.S, 4.83) — twice as
# uneven as CARDS, and visible as FLASH looking looser than CARDS. These are
# 5.6, the mean of CARDS, then eased by eye: F.L and L.A get less than their
# share because the letters' open counters face each other and the eye adds the
# two voids together, and A.S gets more because A's apex and S's spine already
# lean apart.
TARGET_GAPS = {
    "FLASH": [4.90, 5.35, 5.95, 5.60],
    "CARDS": [5.70, 5.45, 5.40, 5.60],
}
BOLT_STROKE = 2.0
BOLT = "M18 0 L0 42 H12 L9 72 L30 26 H16 Z"      # ink 30 wide, 72 tall
BOLT_W, BOLT_H = 30.0, 72.0

# The frame and the bolt are named for their role, not their hue: they were a
# saturated red and gold, and the mark was then the only mid-light, heavily
# saturated field on the site. Every deck tint sits at L 83-90% and every deck
# ink at S 33-51%/L 30-59%, so the two hot colours were moved into that ink
# register, taking the warm hue SOLID already uses (tint #FAD9BE, ink #B87A3C).
# They stay inks rather than tints because the frame is a 4.2/76 hairline and
# has to hold the mark together at favicon size; a pastel frame on the cream
# ground is 5 points of lightness apart and disappears there.
CREAM, FRAME, BOLT_FILL, INK = "#E0D4BF", "#B87A3C", "#D9B77D", "#2C2C2A"


def find_font(family="IBM Plex Mono Regular", needed="FLASHCARDS"):
    """The font next/font downloaded during the last build.

    next/font splits a face into per-unicode-range subsets that all carry the
    same name, so the name alone will happily hand back a file with no Latin
    letters in it. The glyphs have to be there too.
    """
    for path in sorted(Path(".next/static/media").glob("*.woff2")):
        try:
            font = TTFont(path)
        except Exception:
            continue
        if font["name"].getDebugName(4) != family:
            continue
        cmap = font.getBestCmap()
        if all(ord(ch) in cmap for ch in needed):
            return font
    sys.exit(
        f"Could not find {family} under .next/static/media.\n"
        "Run `pnpm run build` first — next/font fetches it at build time."
    )


def main():
    font = find_font()
    cmap, glyphs = font.getBestCmap(), font.getGlyphSet()
    scale = SIZE / font["head"].unitsPerEm

    def measure(ch):
        """Ink bounds of one glyph, at its own origin."""
        bounds = BoundsPen(glyphs)
        glyphs[cmap[ord(ch)]].draw(
            TransformPen(bounds, Transform(scale, 0, 0, -scale, 0.0, 0.0)))
        return bounds.bounds[0], bounds.bounds[2]

    def word(text, baseline):
        """A draw() placing `text` so its ink starts at a given x, plus width.

        Each glyph is set from the previous glyph's ink, not from an advance,
        which is what makes TARGET_GAPS mean what it says.
        """
        gaps = TARGET_GAPS[text]

        def draw(pen, ink_start):
            x0, x1 = measure(text[0])
            origin, ink_end = ink_start - x0, ink_start + (x1 - x0)
            glyphs[cmap[ord(text[0])]].draw(
                TransformPen(pen, Transform(scale, 0, 0, -scale, origin, baseline)))
            for ch, gap in zip(text[1:], gaps):
                x0, x1 = measure(ch)
                origin = ink_end + gap - x0
                glyphs[cmap[ord(ch)]].draw(
                    TransformPen(pen, Transform(scale, 0, 0, -scale, origin, baseline)))
                ink_end = origin + x1
            return ink_end

        bounds = BoundsPen(glyphs)
        end = draw(bounds, 0.0)
        return draw, (0.0, bounds.bounds[1], end, bounds.bounds[3])

    # Centre the letters by their ink rather than trusting the baseline, so the
    # words sit in the middle of the frame however the face is drawn.
    _, probe = word("FLASH", 45.0)
    baseline = 45.0 + (HEIGHT / 2 - (probe[1] + probe[3]) / 2)

    draw_flash, (fx0, _, fx1, _) = word("FLASH", baseline)
    draw_cards, (cx0, _, cx1, _) = word("CARDS", baseline)

    # Left to right, on ink. The bolt's stroke straddles its path, so half of it
    # counts as ink on each side.
    flash_right = PAD + (fx1 - fx0)
    bolt_x = flash_right + GAP + BOLT_STROKE / 2
    bolt_right = bolt_x + BOLT_W + BOLT_STROKE / 2
    cards_right = bolt_right + GAP + (cx1 - cx0)
    width = round(cards_right + PAD, 2)

    flash = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}")
    draw_flash(flash, PAD)
    cards = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}")
    draw_cards(cards, bolt_right + GAP)

    OUT.write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:g} {HEIGHT:g}" width="{width:g}" height="{HEIGHT:g}" role="img" aria-label="Flashcards">
  <title>Flashcards</title>
  <!--
    The wordmark, on a transparent ground. Generated by tools/wordmark.py —
    edit that, not this. The letters are outlines so the mark cannot fall back
    to another mono and pull the spacing out from under the frame, and the
    spacing is measured on ink: {GAP:g} either side of the bolt, {PAD:g} to the frame.
  -->
  <rect x="0" y="0" width="{width:g}" height="{HEIGHT:g}" rx="{RADIUS:g}" fill="{CREAM}"/>
  <rect x="{FRAME_STROKE / 2:g}" y="{FRAME_STROKE / 2:g}" width="{width - FRAME_STROKE:g}" height="{HEIGHT - FRAME_STROKE:g}" rx="{RADIUS - FRAME_STROKE / 2:g}" fill="none" stroke="{FRAME}" stroke-width="{FRAME_STROKE:g}"/>
  <path d="{flash.getCommands()}" fill="{INK}"/>
  <g transform="translate({bolt_x:.2f},{(HEIGHT - BOLT_H) / 2:g})">
    <path d="{BOLT}" fill="{BOLT_FILL}" stroke="{FRAME}" stroke-width="{BOLT_STROKE:g}" stroke-linejoin="round"/>
  </g>
  <path d="{cards.getCommands()}" fill="{INK}"/>
</svg>
''')
    print(f"{OUT}: {width:g}x{HEIGHT:g}, gaps {GAP:g}/{GAP:g} on ink")


if __name__ == "__main__":
    main()
