# Next.js data, mutations and production
tint: #EACDEA
blurb: Fetching patterns, Server Actions, security and shipping, weighted to 15 → 16.3.

id: 31112f6b-35e3-42ce-8605-85d2e3f63dff
Q: Route Handler vs Server Action — when do you use
each?
A: Route Handlers expose a real HTTP endpoint for
external callers; Server Actions are RPC for your own
UI.

id: 43bf6f4c-d510-47a2-b256-42d33473b432
Q: How do Server Actions plug into forms?
A: Pass the action to <form action> and the form works
before JavaScript loads. Wrap it in useActionState for
[state, formAction, isPending], returning validation
errors as state rather than throwing.

id: 44e0fe2f-e146-42a2-8954-ad9ea2eacecd
Q: Why must every Server Action check authorization
itself?
A: Each action is a public POST endpoint anyone can
call with any arguments, whatever your UI shows.
Validate input and verify the session inside the action
or the data layer it calls.

id: 52aa59c7-bd85-4bd2-94c1-0ee505da962d
Q: Where should auth checks live in the App Router?
A: In a data access layer next to the data, not in
layouts: layouts don't re-render on every navigation,
and proxy only sees the request. Check the session on
every read and mutation.

id: 04811bef-509d-45e1-b37b-824e2151e9bb
Q: How do you stop server-only code or data leaking to
the client?
A: import 'server-only' fails the build if a client
module imports the file; return minimal DTOs, never
whole records. React's experimental taint APIs add a
runtime backstop.

id: aff62cd2-2d67-47b6-96b0-458960f5ad23
Q: updateTag vs refresh() — when do you use each?
A: Both are Server Action–only in 16. updateTag expires
a tag immediately so users see their own writes;
refresh() re-renders uncached data without touching the
cache.

id: ea06e171-c0c8-48ab-adc3-c97f335c593b
Q: What is request memoization?
A: Identical GET fetches are deduped within a single
server render pass, so shared components can each fetch
what they need.

id: 78375417-4401-4937-8de3-5ec09d695ba8
Q: When do you reach for React's cache() function?
A: To dedupe non-fetch work like a database query
across one render pass, since only fetch is memoized
natively.

id: 4c628480-1b00-423a-98e1-1a4db8915386
Q: How do you avoid a request waterfall between
fetches?
A: Start independent fetches together and await them
with Promise.all, rather than awaiting each in
sequence.

id: d983c381-bcb4-4daf-a4a8-01daee5feddc
Q: What is the preload pattern?
A: Kick off a data fetch in the parent before rendering
a child, so the request is already in flight on render.

id: 8c1ead4c-5307-4b6c-ae6b-d74681da1985
Q: Where does client-side data fetching still belong?
A: Anything request-specific and interactive — polling,
infinite scroll, optimistic UI — via SWR or TanStack
Query.

id: c5f5d873-da69-429c-87b7-c1db6a691080
Q: How do you cache a Route Handler response?
A: Set Cache-Control headers yourself, or call a 'use
cache' function inside it; GET handlers stopped caching
by default in 15.

id: 879b33d3-9a13-4683-85c2-920874376b11
Q: What replaced middleware.ts in Next 16, and what
belongs in it?
A: proxy.ts, renamed to mark it as a network-boundary
concern that runs before routing. Keep it to redirects,
rewrites and cheap gating; real authorization belongs
next to the data.

id: f725e95e-adf6-48c1-ad2c-3b4aef6ef38a
Q: Which environment variables reach the browser?
A: Only those prefixed NEXT_PUBLIC_, which are inlined
into the client bundle at build time. Changing one
therefore needs a rebuild, not just a restart.

id: 33f43377-f78a-4f79-9c89-428d9f5a7840
Q: What is the bundler story in Next 16?
A: Turbopack is the default for dev and build, with
webpack behind --webpack. In 16.3 its disk cache speeds
up repeat builds and memory eviction cuts dev RAM by up
to 90%.

id: add3d45e-a93e-4e29-b4eb-1c3aacae7539
Q: How do you test async Server Components?
A: Jest and Testing Library can't render them yet, so
unit-test the logic they call and cover pages with
Playwright or Cypress E2E tests. 16.3 adds an instant()
Playwright helper to assert what shows immediately on
navigation.
