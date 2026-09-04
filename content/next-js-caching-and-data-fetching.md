# Next.js caching and data fetching
tint: #C7DDF0
blurb: The caching layers, the use cache model, and fetching patterns from 15 to 16.3.

id: a3b1d931-696c-42d7-a4fd-e5c695f4e374
Q: Name the four caching layers of the App Router.
A: Request memoization, the Data Cache, the Full Route Cache, and the client-side Router Cache.
id: ea06e171-c0c8-48ab-adc3-c97f335c593b
Q: What is request memoization?
A: React dedupes identical fetches within a single render pass, so shared components can each fetch what they need.
id: a7ef8893-81c9-4394-b0f8-ba63fa142f68
Q: What is the Data Cache?
A: A persistent server-side store of fetch results that survives requests and deploys until revalidated.
id: 934eae2b-099e-43e8-9c80-aa6d6a393fc2
Q: What is the Full Route Cache?
A: The prerendered HTML and RSC payload for a static route, held on the server and served without rendering.
id: 11212494-5b2d-4da7-aa11-4aa317c298f2
Q: What is the Router Cache?
A: An in-memory client cache of RSC payloads for visited and prefetched routes, so back-navigation is instant.
id: c159d16a-2e9c-4514-8050-64653f105394
Q: Is fetch cached by default?
A: No. Since 15 fetch defaults to no-store; you opt in with force-cache, next.revalidate, or use cache.
id: 53dcfceb-ffa4-4a8b-a3b9-06299ceddfa6
Q: What does the 'use cache' directive do?
A: Marks a file, component or function as cacheable, so its result is stored and reused rather than recomputed.
id: aa451521-2c38-4943-9c6e-dfe9898743fa
Q: What do cacheTag and cacheLife add to 'use cache'?
A: cacheTag labels an entry for targeted invalidation; cacheLife sets how long it stays fresh and stale.
id: 19c872cf-615e-45fd-91c9-77ca1299c341
Q: What does the cacheComponents flag change?
A: It switches the app to the explicit model: nothing is cached unless you mark it, and dynamic is the default.
id: abb3bd9a-58f0-4b11-9999-5ae0bc6c829e
Q: revalidatePath vs revalidateTag?
A: revalidatePath busts everything for a route; tags bust just the entries you labelled, across every route.
id: ab6622d9-23da-4b32-aba1-cb9f101c8893
Q: How do you handle on-demand invalidation from a CMS?
A: Expose a route handler, verify the webhook signature, then call revalidateTag for the affected content tags.
id: 0e981e8e-bb42-47fd-8e6e-bd01cfc65fbe
Q: What is ISR in App Router terms?
A: Time-based revalidation of a prerendered route: serve the cached version, regenerate in the background.
id: 650de55e-a972-4985-8584-c925cddc310a
Q: What does the segment export revalidate = 60 mean?
A: The route's cached output is considered fresh for 60 seconds, then regenerated on the next request after that.
id: c12987b2-3c77-4a1a-b894-38168d644bc2
Q: How do you force a route static or dynamic?
A: The segment config dynamic = 'force-static' or 'force-dynamic', overriding what Next.js infers.
id: c84268bf-fb1c-42b7-ac12-d69cbee29cb1
Q: What silently makes a route dynamic?
A: Reading cookies, headers, searchParams or connection — any request-time input opts the whole segment out.
id: 4c628480-1b00-423a-98e1-1a4db8915386
Q: How do you avoid a request waterfall between fetches?
A: Start independent fetches together and await them with Promise.all, rather than awaiting each in sequence.
id: d983c381-bcb4-4daf-a4a8-01daee5feddc
Q: What is the preload pattern?
A: Kick off a data fetch in the parent before rendering a child, so the request is already in flight on render.
id: 78375417-4401-4937-8de3-5ec09d695ba8
Q: When do you reach for React's cache() function?
A: To dedupe non-fetch work like a database query across one render pass, since only fetch is memoized natively.
id: 8c1ead4c-5307-4b6c-ae6b-d74681da1985
Q: Where does client-side data fetching still belong?
A: Anything request-specific and interactive — polling, infinite scroll, optimistic UI — via SWR or TanStack Query.
id: c5f5d873-da69-429c-87b7-c1db6a691080
Q: How do you cache a Route Handler response?
A: Set Cache-Control headers yourself, or use cache inside it; GET handlers stopped caching by default in 15.
id: 4ccfdf9d-4ffb-45a7-afb6-e0e15114f9c1
Q: What did 16.3 add to the caching story?
A: 'use cache' gained client-side caching, letting a route serve a prefetched shell before its data arrives.
id: c6fc6f69-9293-4bd6-a912-16dad7991ffe
Q: What is partial prefetching?
A: Per-link control over how much of a target route to prefetch, instead of all-or-nothing prefetch={true}.
id: b4156d56-2bf2-4f36-99b6-a8e86f8fb065
Q: How does the CDN relate to these caches?
A: It sits in front of them, caching full responses by URL; a stale CDN entry survives a revalidateTag.
id: 85ff2982-2790-4ae7-8fe9-03481770172d
Q: Interview one-liner: how would you explain the caching model to a sceptic?
A: It moved from four implicit layers you fought against to one explicit directive you opt into, per unit of work.
