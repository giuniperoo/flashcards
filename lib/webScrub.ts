/**
 * What the browser's telemetry may say about an address — see
 * `instrumentation-client.ts`.
 *
 * Every address the web SDK records, a page's or a request's, passes through
 * here first. Two parts of verso's addresses must not reach Dash0:
 *
 * - A join link's fragment, `#sync=<key>`. The key never leaves the browser;
 *   that is the one property that lets three words stand in for an account,
 *   and a fragment is how a QR code carries it past the server. A telemetry
 *   SDK reads `location.href`, fragment and all, so the fragment goes.
 * - The sync id in `/api/sync/<id>`. It is not the key, but whoever holds it
 *   can replace or delete that copy, and the server's spans already leave it
 *   out for the same reason (`lib/syncStore.ts`).
 *
 * Redacted rather than dropped, so a page view still says which page it was.
 *
 * Redacting attributes is not enough on its own. The SDK's navigation timing
 * event copies the browser's navigation entry into its body, and that entry's
 * `name` is the address the page was opened at, fragment included, for as
 * long as the page lives; the scrubber never sees it, and the SDK's own
 * `ignoreUrls` filters requests but not the page. So a page opened from a join
 * link is not observed at all (`opensWithKey`). That is one page load per
 * device that joins, and the next page records as usual.
 *
 * The patterns match the fragment `joinLink` writes, `JOIN_HASH` in
 * `lib/sync.ts`; that module is not imported here because it would pull sync
 * into every page's first script. `lib/webScrub.test.ts` holds the two
 * together.
 */

export const REDACTED = "REDACTED";

const KEY_IN_FRAGMENT = /#(.*&)?sync=/;

/** Whether a page opened at this address carries a key, and so must not be
    observed. */
export function opensWithKey(href: string) {
  return KEY_IN_FRAGMENT.test(href);
}

const SYNC_FRAGMENT = /(^#?|&)sync=[^&]*/;
const SYNC_ID = /\/api\/sync\/[0-9a-f]{64}/g;

type UrlAttributes = {
  "url.full": string;
  "url.path"?: string;
  "url.fragment"?: string;
  [key: string]: string | undefined;
};

function scrubFragment(fragment: string) {
  return fragment.replace(SYNC_FRAGMENT, `$1sync=${REDACTED}`);
}

function scrubPath(path: string) {
  return path.replace(SYNC_ID, `/api/sync/${REDACTED}`);
}

/** An address with any sync key and sync id replaced by `REDACTED`. */
export function scrubUrl(url: string) {
  const hash = url.indexOf("#");
  const before = hash === -1 ? url : url.slice(0, hash);
  const fragment = hash === -1 ? "" : scrubFragment(url.slice(hash));
  return scrubPath(before) + fragment;
}

/** The SDK's `urlAttributeScrubber`: the same, for each part it records. */
export function scrubUrlAttributes<T extends UrlAttributes>(attributes: T): T {
  const scrubbed: T = { ...attributes, "url.full": scrubUrl(attributes["url.full"]) };
  if (attributes["url.path"] !== undefined) {
    scrubbed["url.path"] = scrubPath(attributes["url.path"]);
  }
  if (attributes["url.fragment"] !== undefined) {
    scrubbed["url.fragment"] = scrubFragment(attributes["url.fragment"]);
  }
  return scrubbed;
}
