#!/usr/bin/env python3
"""Regenerates app/icon.png and app/apple-icon.png: the wordmark's frame and
bolt, with the words taken out. Next picks both up by file convention.

    pip install pillow
    python3 tools/app-icons.py

The proportions come from public/logo.svg so the icon and the wordmark read as
the same object, with one deliberate exception noted below.
"""
from PIL import Image, ImageDraw

CREAM, RED, GOLD = (224, 212, 191), (183, 38, 34), (218, 173, 59)
SS = 8                       # supersample, then downsample for clean edges

# Everything as a fraction of the mark's 76-unit height, and these are the
# wordmark's own numbers — see FRAME_STROKE and BOLT_STROKE in tools/wordmark.py.
# The icon is that mark with the words taken out, so the two stay in step: change
# one, change the other.
RADIUS = 16 / 76
STROKE = 4.2 / 76
BOLT_H = 72 / 76
BOLT_W = 30 / 76
BOLT_STROKE = 2 / 76
BOLT = [(18, 0), (0, 42), (12, 42), (9, 72), (30, 26), (16, 26)]


def draw_icon(size, opaque):
    n = size * SS
    im = Image.new("RGBA", (n, n), CREAM + (255,) if opaque else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    r = RADIUS * n
    stroke = max(1, round(STROKE * n))

    if not opaque:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=r, fill=CREAM)
    # Same band as the SVG: the frame sits on the outer edge of the cream.
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=r, outline=RED, width=stroke)

    # The bolt keeps its aspect and its overshoot: as tall relative to the mark
    # as it is in the wordmark, so it meets the frame top and bottom.
    h = BOLT_H * n
    w = h * (BOLT_W / BOLT_H)
    sx, sy = w / 30, h / 72
    ox, oy = (n - w) / 2, (n - h) / 2
    pts = [(ox + x * sx, oy + y * sy) for x, y in BOLT]
    d.polygon(pts, fill=GOLD)
    # Not polygon(outline=...): that strokes each edge separately and leaves a
    # notch at every concave corner, which is where this bolt has four of them.
    # A closed line with rounded joins is also what the SVG does — the wordmark
    # sets stroke-linejoin="round" — so the two bolts come out the same shape.
    d.line(pts + [pts[0]], fill=RED, width=max(1, round(BOLT_STROKE * n)),
           joint="curve")

    im = im.resize((size, size), Image.LANCZOS)
    return im.convert("RGB") if opaque else im


# icon.png keeps its transparent corners: it sits on whatever a browser tab or
# a bookmark bar happens to be. apple-icon.png is painted to the edges, because
# iOS masks the corners itself and renders alpha as black.
draw_icon(512, opaque=False).save("app/icon.png")
draw_icon(180, opaque=True).save("app/apple-icon.png")
print("wrote app/icon.png (512, alpha) and app/apple-icon.png (180, opaque)")
