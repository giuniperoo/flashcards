import {
  deckParamFor,
  parseDeckParam,
  slugsToStudy,
} from "./deckFilter";
import { DEFAULT_PREFS, type IndexPrefs } from "./prefs";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`);
  }
}

const all = ["acid", "cap", "kafka", "solid"];
const prefs = (over: Partial<IndexPrefs> = {}): IndexPrefs => ({
  ...DEFAULT_PREFS,
  ...over,
});

check("no parameter is not an empty list", parseDeckParam(null), null);
check("a comma-separated value splits", parseDeckParam("acid,cap"), ["acid", "cap"]);
check("a repeated parameter collects", parseDeckParam(["acid", "cap"]), ["acid", "cap"]);
check("blanks and padding are dropped", parseDeckParam(" acid , ,cap "), ["acid", "cap"]);

check(
  "the parameter wins over the preferences",
  slugsToStudy(all, ["kafka"], prefs({ hiddenDecks: ["kafka"] })),
  ["kafka"],
);
check(
  "a slug that is not a deck is dropped",
  slugsToStudy(all, ["kafka", "nonsense"], prefs()),
  ["kafka"],
);
check(
  "without a parameter, hidden decks are left out",
  slugsToStudy(all, null, prefs({ hiddenDecks: ["cap", "solid"] })),
  ["acid", "kafka"],
);
check(
  "the master switch empties the shuffle",
  slugsToStudy(all, null, prefs({ showBuiltIns: false })),
  [],
);
check("nothing hidden means every deck", slugsToStudy(all, null, prefs()), all);
check(
  "deck order follows the decks, not the parameter",
  slugsToStudy(all, ["solid", "acid"], prefs()),
  ["acid", "solid"],
);

check("no parameter is needed when nothing is excluded", deckParamFor(all, all), null);
check(
  "a parameter names what is left",
  deckParamFor(["acid", "kafka"], all),
  "acid,kafka",
);

if (failures > 0) {
  console.log(`\n${failures} deck filter case(s) failed`);
  process.exit(1);
}
console.log("\nall deck filter cases pass");
