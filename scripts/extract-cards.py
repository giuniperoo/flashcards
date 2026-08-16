import re, json, sys
import pdfplumber

MARGIN, HEADER = 36, 24
COLS, ROWS = 2, 4

def cells(page):
    W, H = page.width, page.height
    top0 = MARGIN + HEADER
    card_h = (H - top0 - MARGIN) / ROWS
    card_w = (W - 2 * MARGIN) / COLS
    out = []
    for r in range(ROWS):
        for c in range(COLS):
            out.append((
                MARGIN + c * card_w,
                top0 + r * card_h,
                MARGIN + (c + 1) * card_w,
                top0 + (r + 1) * card_h,
            ))
    return out

LABEL = re.compile(r"^CARD\s+(\d+)\s*[\u00b7·]\s*(QUESTION|ANSWER)", re.I)

def read_cell(page, box):
    txt = page.crop(box).extract_text(x_tolerance=1.5, y_tolerance=3) or ""
    lines = [l.strip() for l in txt.split("\n") if l.strip()]
    if not lines:
        return None
    m = LABEL.match(lines[0])
    if not m:
        return None
    body = " ".join(lines[1:])
    body = re.sub(r"\s+", " ", body).strip()
    return int(m.group(1)), m.group(2).upper(), body

def extract(path):
    found = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for box in cells(page):
                got = read_cell(page, box)
                if not got:
                    continue
                n, kind, body = got
                found.setdefault(n, {})[kind] = body
    cards = []
    for n in sorted(found):
        rec = found[n]
        if "QUESTION" not in rec or "ANSWER" not in rec:
            print(f"  !! card {n} incomplete in {path}", file=sys.stderr)
            continue
        cards.append([rec["QUESTION"], rec["ANSWER"]])
    return cards

if __name__ == "__main__":
    result = {}
    for slug, path in [
        ("gigs", "/mnt/project/gigsembeddedtelecomflashcards.pdf"),
        ("react19", "/mnt/project/react19featuresflashcards.pdf"),
        ("cap", "/mnt/project/captheoremflashcards.pdf"),
        ("acid", "/mnt/project/acidpropertiesflashcards.pdf"),
    ]:
        cards = extract(path)
        result[slug] = cards
        print(f"{slug}: {len(cards)} cards")
    with open("/home/claude/extracted.json", "w") as f:
        json.dump(result, f, indent=1)
    print("\nspot check —", result["cap"][8][0], "=>", result["cap"][8][1][:90])
