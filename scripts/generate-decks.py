import json, re, importlib.util
spec = importlib.util.spec_from_file_location("sc", "/home/claude/solid_cards.py")
sc = importlib.util.module_from_spec(spec); spec.loader.exec_module(sc)

data = json.load(open("/home/claude/extracted.json"))
data["solid"] = [[q, a] for q, a in sc.CARDS]

META = [
 ("gigs",    "Gigs",         "Embedded telecom, Connect, and the product surface", "#CBDDF2", "#5E86AE"),
 ("react19", "React 19",     "Actions, Server Components, and the 19.2 additions", "#DCD6F3", "#7A6DBE"),
 ("cap",     "CAP theorem",  "Partitions, trade-offs, and PACELC",                 "#F7C7D6", "#B84268"),
 ("acid",    "ACID",         "Transactions, isolation levels, and MVCC",           "#BDE8D2", "#17805E"),
 ("solid",   "SOLID",        "Design principles, and where they cost more than they pay", "#FAD9BE", "#B87A3C"),
]

def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

out = ["export type Card = { q: string; a: string };","",
"export type Deck = {","  slug: string;","  name: string;","  blurb: string;",
"  tint: string;","  ink: string;","  cards: Card[];","};","",
"export const decks: Deck[] = ["]

for slug, name, blurb, tint, ink in META:
    out.append("  {")
    out.append(f'    slug: "{slug}",')
    out.append(f'    name: "{esc(name)}",')
    out.append(f'    blurb: "{esc(blurb)}",')
    out.append(f'    tint: "{tint}",')
    out.append(f'    ink: "{ink}",')
    out.append("    cards: [")
    for q, a in data[slug]:
        out.append("      {")
        out.append(f'        q: "{esc(q)}",')
        out.append(f'        a: "{esc(a)}",')
        out.append("      },")
    out.append("    ],")
    out.append("  },")

out += ["];","",
"export const totalCards = decks.reduce((n, d) => n + d.cards.length, 0);","",
"export function getDeck(slug: string): Deck | undefined {",
"  return decks.find((d) => d.slug === slug);","}","",
"export type StudyCard = Card & { deck: Deck; index: number };","",
"export function studySet(slug: string): StudyCard[] {",
"  const source = slug === \"all\" ? decks : decks.filter((d) => d.slug === slug);",
"  return source.flatMap((deck) =>",
"    deck.cards.map((card, index) => ({ ...card, deck, index })),",
"  );","}",""]

open("/home/claude/flashcards/lib/decks.ts","w").write("\n".join(out))
print("wrote lib/decks.ts —", sum(len(data[s]) for s,_,_,_,_ in META), "cards")
