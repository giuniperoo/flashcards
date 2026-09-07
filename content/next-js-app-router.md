# Next.js App Router
tint: #F2F0CA
blurb: Routing, rendering and file conventions in the App Router, weighted to 15→16.3.

id: 42575223-35e4-4cf8-b145-3a8bd3112785
Q: When did the App Router become stable, and what is the current Next.js version?
A: Stable in 13.4 (May 2023). The current line is 16.3, released August 2026; there is no Next.js 17.

id: 32ca8c2c-7c0d-4335-bb8a-aec348f17396
Q: What is the default component type in the App Router?
A: Server Components. They run only on the server, can be async, and ship no JavaScript to the browser.

id: 7c8b40b4-95c1-4677-8963-bed88a552f34
Q: What does 'use client' actually mark?
A: The boundary where the client bundle begins. Every module imported below it becomes client code too.

id: 29070b96-b8f1-4766-9c37-50803e7df536
Q: Name the special files that define a route segment.
A: layout, page, loading, error, not-found, template, route, and default (for parallel route slots).

id: e1beb9a1-ba1a-40b4-ac42-62cee4415382
Q: layout.tsx vs template.tsx?
A: Layouts persist across navigation and keep state; templates remount and reset state on every navigation.

id: 71b81f07-cc59-4cf9-b191-cf4304a05257
Q: What are route groups and private folders?
A: (marketing) groups routes without adding a URL segment; _lib opts a folder out of routing entirely.

id: 5091e51d-4fae-4aed-a483-24d7aab50906
Q: How do you write dynamic, catch-all and optional catch-all segments?
A: [id], [...slug] and [[...slug]] — the last also matches the parent path with no segments at all.

id: 61daaf88-4538-402f-a676-63245add0129
Q: What does generateStaticParams do?
A: Lists the dynamic params to prerender at build time — the App Router replacement for getStaticPaths.

id: 055c1eaf-5abc-4147-9915-c8b3eeae5d1c
Q: What changed about params, searchParams, cookies() and headers()?
A: They became async in Next 15 and must be awaited. This is the most common upgrade break from 14.

id: c1d4da39-292c-46c6-8241-914bed8ebdf8
Q: How does streaming work in the App Router?
A: A loading.tsx or <Suspense> boundary lets the shell flush immediately while slower data streams in after.

id: 31112f6b-35e3-42ce-8605-85d2e3f63dff
Q: Route Handler vs Server Action — when do you use each?
A: Route Handlers expose a real HTTP endpoint for external callers; Server Actions are RPC for your own UI.

id: 879b33d3-9a13-4683-85c2-920874376b11
Q: What replaced middleware.ts in Next 16?
A: proxy.ts, renamed to make it clear the file is a network-boundary concern, not general app middleware.

id: b89e1761-7b29-4d86-941f-8d94cba01938
Q: What are Cache Components and 'use cache'?
A: An opt-in model (cacheComponents: true) where nothing caches unless a function or component is marked cacheable.

id: 43818909-a4a9-4a0c-9570-48ca378335c5
Q: How did caching defaults shift across 14 → 15 → 16?
A: 14 cached fetch and GET handlers implicitly; 15 turned those off by default; 16 makes caching explicit opt-in.

id: 6e385274-c2f9-4209-881a-56e8dc11e801
Q: How do you invalidate cached data on demand?
A: revalidatePath and revalidateTag from a Server Action or Route Handler, with cacheTag marking what to bust.

id: d189eb16-3379-474f-940e-f5a7746e8156
Q: What makes a route render dynamically?
A: Reading request data — cookies, headers, searchParams — or opting out via dynamic = 'force-dynamic'.

id: 21ed2d23-ff7f-48e4-b385-8e4fb9134e21
Q: What is Partial Prerendering, and where did it land?
A: Serving a static shell with dynamic holes streamed in. It shipped folded into the Cache Components model in 16.

id: e3946fed-ed3f-4ef1-aa3c-7230c2162313
Q: What are Instant Navigations (16.3)?
A: An opt-in suite — partial prefetching, extracted loading shells, Instant Insights — for SPA-feel routing.

id: 0ee4bd31-3505-4894-8400-9e4344ac5493
Q: What problem do root params (16.3) solve?
A: Reading a root-level param like [lang] from any Server Component, instead of prop-drilling it down the tree.

id: 6ab944e9-1bb1-426d-a7a8-dcf7f2e32abe
Q: How does error handling work in the App Router?
A: error.tsx catches a segment's render errors, global-error wraps the root, notFound() renders 404.

id: f09b5d3b-4045-43bb-9f71-1315ca05f623
Q: What are parallel and intercepting routes?
A: @slot folders render several pages into one layout; (.) and (..) intercept a route to show it as a modal.

id: 94dd7854-9bf5-43e8-8afe-a317bee7fc60
Q: How do you set page metadata?
A: Export a static metadata object or an async generateMetadata from a layout or page.

id: 33f43377-f78a-4f79-9c89-428d9f5a7840
Q: What is the bundler story in Next 16?
A: Turbopack is the default for dev and build; webpack config is deprecated with a temporary --webpack fallback.

id: 9bee220e-0bbc-4757-973d-6bf2a9473b5d
Q: Interview one-liner: what is the App Router's architectural theme?
A: Rendering moves to the server by default and caching moves from implicit to explicit, opt-in and per-component.
