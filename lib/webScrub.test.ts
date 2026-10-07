import { JOIN_HASH } from "./sync";
import { opensWithKey, REDACTED, scrubUrl, scrubUrlAttributes } from "./webScrub";

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

const origin = "https://f.lash.cards";
const key = encodeURIComponent("brave otter singing");
const id = "ab".repeat(32);

check(
  "a join link's key is redacted, as joinLink writes it",
  scrubUrl(`${origin}/${JOIN_HASH}${key}`),
  `${origin}/#sync=${REDACTED}`,
);
check(
  "the key never survives in any form",
  scrubUrl(`${origin}/${JOIN_HASH}${key}`).includes("otter"),
  false,
);
check(
  "a sync id in a request's path is redacted",
  scrubUrl(`${origin}/api/sync/${id}`),
  `${origin}/api/sync/${REDACTED}`,
);
check(
  "an address with neither is left alone",
  scrubUrl(`${origin}/study/kafka?scheduled#interval`),
  `${origin}/study/kafka?scheduled#interval`,
);
check(
  "a fragment that merely contains the letters is left alone",
  scrubUrl(`${origin}/#resync=1`),
  `${origin}/#resync=1`,
);
check(
  "a sync id outside the API's path is left alone",
  scrubUrl(`${origin}/study/${id}`),
  `${origin}/study/${id}`,
);

const page = scrubUrlAttributes({
  "url.full": `${origin}/${JOIN_HASH}${key}`,
  "url.path": "/",
  "url.domain": "f.lash.cards",
  "url.scheme": "https",
  "url.fragment": `sync=${key}`,
});
check(
  "a page view's fragment attribute is redacted, with or without its #",
  [page["url.fragment"], scrubUrlAttributes({ "url.full": "", "url.fragment": `#sync=${key}` })["url.fragment"]],
  [`sync=${REDACTED}`, `#sync=${REDACTED}`],
);
check("a page view keeps the parts that say which page", [page["url.path"], page["url.domain"]], ["/", "f.lash.cards"]);
check(
  "no attribute of a page view holds the key",
  Object.values(page).some((v) => v?.includes("otter")),
  false,
);

const request = scrubUrlAttributes({
  "url.full": `${origin}/api/sync/${id}`,
  "url.path": `/api/sync/${id}`,
});
check(
  "no attribute of a sync request holds the id",
  Object.values(request).some((v) => v?.includes(id)),
  false,
);

const ignored = opensWithKey;
check(
  "a page whose address holds a key is not observed, wherever the key sits",
  [ignored(`${origin}/${JOIN_HASH}${key}`), ignored(`${origin}/new#a=1&sync=${key}`)],
  [true, true],
);
check(
  "every other page is",
  [ignored(`${origin}/`), ignored(`${origin}/#interval`), ignored(`${origin}/#resync=1`), ignored(`${origin}/api/sync/${id}`)],
  [false, false, false, false],
);

if (failures > 0) {
  console.log(`\n${failures} web scrub case(s) failed`);
  process.exit(1);
}
console.log("\nall web scrub cases pass");
