import { opensWithKey, scrubUrlAttributes } from "./lib/webScrub";

/**
 * Telemetry from the reader's browser, which Next.js runs before the page
 * hydrates: page views, web vitals, errors, and the browser's own requests, to
 * Dash0's Websites view. The counterpart of `instrumentation.ts`, which traces
 * the server; a request to `/api/sync` is same-origin, so the SDK carries its
 * trace context there and the two halves join into one trace.
 *
 * The token is public — it ships in this script — so it is one that can only
 * ingest. With either variable unset, as in development, nothing starts.
 *
 * The SDK is imported dynamically, so it is its own chunk rather than 25 kB on
 * every page's first load: pages ship JavaScript for their interactive parts
 * and nothing else. Starting a moment later loses little, since navigation
 * timing and web vitals are read from the browser's buffered entries.
 *
 * Neither a join link's key nor a sync id reaches Dash0: a page opened from a
 * join link is not observed at all, and every address that is recorded passes
 * through `scrubUrlAttributes` first; see `lib/webScrub.ts`. Session recording stays off: the sync panel shows the key
 * as text, and a replay would carry it.
 */

const url = process.env.NEXT_PUBLIC_DASH0_ENDPOINT;
const authToken = process.env.NEXT_PUBLIC_DASH0_WEB_TOKEN;

if (url && authToken && !opensWithKey(window.location.href)) {
  import("@dash0/sdk-web").then(({ init }) => init({
    serviceName: "verso-web",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    endpoint: { url, authToken },
    enabledInstrumentations: [
      "@dash0/navigation",
      "@dash0/web-vitals",
      "@dash0/error",
      "@dash0/fetch",
      "@dash0/xhr",
      "@dash0/frustration-signals",
    ],
    urlAttributeScrubber: scrubUrlAttributes,
  }));
}
