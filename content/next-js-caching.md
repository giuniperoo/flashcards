# Next.js caching
tint: #CBF2CA
blurb: From four implicit caches to explicit 'use cache', invalidation, and 16.3 prefetching.

id: a3b1d931-696c-42d7-a4fd-e5c695f4e374
Q: Name the four caching layers of the App Router.
A: Request memoization, the Data Cache, the Full Route
Cache, and the client-side Router Cache — the implicit
model Cache Components replaces.

id: a7ef8893-81c9-4394-b0f8-ba63fa142f68
Q: What is the Data Cache?
A: A persistent server-side store of fetch results that
survives requests and deploys until revalidated.

id: 934eae2b-099e-43e8-9c80-aa6d6a393fc2
Q: What is the Full Route Cache?
A: The prerendered HTML and RSC payload for a static
route, held on the server and served without rendering.

id: 11212494-5b2d-4da7-aa11-4aa317c298f2
Q: What is the Router Cache?
A: An in-memory client cache of RSC payloads for
visited and prefetched routes, so back-navigation is
instant.

id: c159d16a-2e9c-4514-8050-64653f105394
Q: Is fetch cached by default, and how did that change
across 14 → 15 → 16?
A: 14 cached fetch and GET handlers implicitly, 15 made
them uncached by default, and 16's Cache Components
make caching explicit. Trap: an uncached fetch in a
route prerendered at build still freezes into the Full
Route Cache.

id: 650de55e-a972-4985-8584-c925cddc310a
Q: What does the segment export revalidate = 60 mean?
A: Output is fresh for 60 seconds; the first request
after that still gets the stale page but triggers a
background regeneration. Under Cache Components,
cacheLife replaces it.

id: 19c872cf-615e-45fd-91c9-77ca1299c341
Q: What are Cache Components, and what does the
cacheComponents flag change?
A: The opt-in model from 16: nothing is cached unless
marked with 'use cache', and dynamic is the default.
Segment configs like dynamic and revalidate give way to
Suspense and cacheLife.

id: 53dcfceb-ffa4-4a8b-a3b9-06299ceddfa6
Q: What does the 'use cache' directive do?
A: Marks a file, component or function as cacheable, so
its result is stored and reused rather than recomputed.

id: 7f153849-5f2f-4f02-9924-493c59367527
Q: What makes up a 'use cache' entry's key?
A: The build, the function's identity, and its
serialisable arguments and closed-over values.
Non-serialisable props like children pass through
without joining the key.

id: aa451521-2c38-4943-9c6e-dfe9898743fa
Q: What do cacheTag and cacheLife add to 'use cache'?
A: cacheTag labels an entry for targeted invalidation;
cacheLife sets how long it stays fresh and stale.

id: 82142f3e-098a-4ace-9c37-3bbd2d7612a6
Q: What do cacheLife's stale, revalidate and expire
control?
A: stale is how long the browser reuses an entry
without asking (30s minimum); revalidate is when the
server refreshes it in the background; expire is when
an idle entry must be recomputed.

id: e0a96bec-607b-49b4-b8d5-8897dc4801ef
Q: 'use cache' vs 'use cache: remote' vs 'use cache:
private'?
A: Plain 'use cache' caches shared data in static
contexts; remote caches shared data after request APIs,
in a server cache handler. Private (experimental) can
read cookies() but lives only in browser memory.

id: f41b6055-83c7-4a52-bf7f-d1811697d363
Q: How do you keep per-user data out of a shared cache?
A: 'use cache' can't read cookies() or headers(), so
read them outside and pass the user ID in as an
argument, making it part of the key. Never cache a
session-derived result under a key that omits the user.

id: 21ed2d23-ff7f-48e4-b385-8e4fb9134e21
Q: What is Partial Prerendering, and where did it land?
A: Serving a static shell with dynamic holes streamed
into Suspense boundaries. It shipped in 16 as part of
Cache Components rather than as a separate flag.

id: abb3bd9a-58f0-4b11-9999-5ae0bc6c829e
Q: How do you invalidate on demand — revalidatePath vs
revalidateTag?
A: Call them from a Server Action or Route Handler.
revalidatePath busts everything for one route;
revalidateTag busts only entries labelled with
cacheTag, across every route.

id: a2b146fe-7f40-44f0-9df3-5a76e5e9d740
Q: What changed about revalidateTag in Next 16?
A: It takes a cacheLife profile as a second argument —
revalidateTag('plans', 'max') — for
stale-while-revalidate; the one-argument form is
deprecated. Use updateTag when users must see their own
write at once.

id: ab6622d9-23da-4b32-aba1-cb9f101c8893
Q: How do you handle on-demand invalidation from a CMS
or partner webhook?
A: Expose a Route Handler, verify the webhook
signature, then call revalidateTag for the affected
content tags.

id: 0e981e8e-bb42-47fd-8e6e-bd01cfc65fbe
Q: What is ISR in App Router terms?
A: Serve a prerendered page from cache and regenerate
it in the background. In 16.3, pages skipped by
generateStaticParams serve an instant loading shell
first, then upgrade to the prerendered page for later
visitors.

id: e3946fed-ed3f-4ef1-aa3c-7230c2162313
Q: What are Instant Navigations (16.3)?
A: An opt-in suite behind cacheComponents and
partialPrefetching that gives server-rendered apps
SPA-like clicks via prefetched loading shells, plus
Instant Insights and Navigation Inspector devtools. It
is slated to become the default in a future major.

id: c6fc6f69-9293-4bd6-a912-16dad7991ffe
Q: What is partial prefetching?
A: Next extracts reusable loading shells from any
route, and <Link prefetch={true}> can pull in as much
or as little of the target page as you choose. It
replaces the old choice between loading.tsx-only and
full-page prefetch.

id: 4ccfdf9d-4ffb-45a7-afb6-e0e15114f9c1
Q: What caching changes did 16.3 ship for every app,
flags or not?
A: Small prefetches are bundled into fewer requests
(prefetch inlining), and immutable static assets can be
reused across deploys without version-skew risk.

id: b4156d56-2bf2-4f36-99b6-a8e86f8fb065
Q: How does the CDN relate to these caches?
A: It sits in front, caching whole responses by URL. On
Vercel revalidateTag purges it too; self-hosted behind
your own CDN, stale entries survive until purged or
expired.

id: 781b2f3b-9a15-48ac-b4e4-81c2624e2abc
Q: What breaks when you self-host on several instances,
e.g. Docker on Cloud Run?
A: The default cache is in memory per instance, so
replicas disagree and a revalidateTag reaches only one.
Configure cacheHandlers (and cacheHandler for ISR)
against shared storage like Redis.

id: 85ff2982-2790-4ae7-8fe9-03481770172d
Q: Interview one-liner: how would you explain the
caching model to a skeptic?
A: It moved from four implicit layers you fought
against to one explicit directive you opt into, per
unit of work.
