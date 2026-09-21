# React 19
order: 2
tint: #DCD6F3
ink: #7A6DBE
blurb: Actions, Server Components, and what 19.2 and 19.3 added

id: f9cb5111-9439-4220-a5e1-d1d7867472ee
Q: What is the latest React version, and is 'React 20' real?
A: React 19.3, released September 9, 2026 (19.0 shipped December 2024 and 19.2 October 2025). There is no React 20. React is stewarded by the independent React Foundation under the Linux Foundation.

id: 49e1ac33-f41a-414a-8a51-51311ce27f82
Q: What are Actions in React 19?
A: Async functions passed to a transition or form. React automatically manages the pending state, error handling, optimistic updates, and form resets you used to hand-write.

id: 992512e0-db10-4ab5-bb55-3add9e3dae06
Q: What changed about startTransition in React 19?
A: It accepts async functions, so isPending covers the awaited work and the updates after it. That is the mechanism under Actions: a form action is an async transition.

id: a2778f4b-7bc6-4496-bfec-64cfbb4dcd3f
Q: What does useActionState do?
A: Wraps an action and returns [state, formAction, isPending] — replacing hand-rolled loading/error/result state for submissions. Pass formAction straight to <form action={...}>.

id: ac76bfe9-ed5c-43b8-b154-cf957f28e6ec
Q: What does useFormStatus do?
A: Lets a child component read the status (pending, data) of its nearest parent <form> — like context for forms. Classic use: a submit button that disables itself.

id: a60ba84e-a39f-4c1d-bd86-de7aa1f1c68d
Q: What does useOptimistic do?
A: Shows a temporary 'optimistic' value while an async action is in flight, then automatically reverts to the real state when the action completes or fails.

id: c91ec6a5-7dfc-4ba6-bc60-7ad616e07426
Q: What is the use() API?
A: Reads a promise or context during render, suspending until the promise resolves. Unlike hooks, use() can be called conditionally and inside loops.

id: 0b9a20f3-c464-49aa-af66-d12a616a0bf5
Q: What are React Server Components (RSC)?
A: Components that run only on the server and send serialized UI — not JavaScript — to the client. Zero bundle cost. 'use client' marks where the client-side world begins.

id: 8f5b43e2-13c1-4e19-9860-ae3a0b405df7
Q: 'use client' vs 'use server' — what does each mark?
A: 'use client': the boundary where components ship to the browser. 'use server': marks Server Functions callable from the client — NOT server components (those are the default, no directive).

id: b3410866-4534-4e8c-9639-42d702d8d83b
Q: What replaced forwardRef?
A: Nothing is needed anymore: in React 19, ref is a regular prop on function components. forwardRef still works, React has said it will be deprecated, and a codemod removes it.

id: 53272e2f-fc1b-4c3b-81a9-b5a7f8bb3505
Q: How does React 19 handle <title> and <meta> tags?
A: Render them anywhere in a component and React hoists them to <head> automatically — native document metadata support, plus stylesheet and async script precedence handling.

id: 6677258c-84d1-49d0-a37e-b29af3d8698f
Q: What is the React Compiler?
A: A build-time compiler (stable 1.0, late 2025) that auto-memoizes components and values by understanding the Rules of React — retiring most manual useMemo, useCallback, and React.memo.

id: 2663d270-18df-4796-9b82-40f8870c3808
Q: What is the <Activity> component (19.2)?
A: Wraps UI with modes 'visible' and 'hidden'. Hidden trees keep their state but unmount effects and render at low priority — ideal for tabs or pre-rendering likely-next screens.

id: 90611cf3-b857-4bdf-9ce4-1caf37da0135
Q: What does useEffectEvent do (19.2)?
A: Extracts the 'event' part of an effect so it always reads the latest props/state without being a dependency — eliminating stale closures and effects that re-fire too often.

id: 9a827a0e-0d8a-4081-a805-69c3363189e6
Q: What are Performance Tracks (19.2)?
A: Custom tracks in Chrome DevTools' Performance panel showing React's scheduler priorities and the component work in each render, so a profile shows what React did and why.

id: 9b03df23-5926-41c5-be3b-c1ce032cff50
Q: What is Partial Pre-rendering in React 19.2?
A: prerender a static shell ahead of time with react-dom/static, then resume it at request time to fill in the dynamic parts. It is the primitive frameworks use for a static shell with dynamic holes.

id: cbd4d5f6-7077-437d-a824-c0011fa11aa5
Q: What is cacheSignal for (19.2)?
A: In Server Components, cacheSignal() returns an AbortSignal that fires when the cache() lifetime ends, so a fetch or query started for a render can be cancelled once its result can no longer be used.

id: cc64e2ec-ab6a-4b9c-94c0-3fb6ccb798f1
Q: Name three smaller React 19 quality-of-life changes.
A: Context used directly as a provider (<MyContext> instead of .Provider), ref callbacks can return cleanup functions, and hydration errors now show a single readable diff.

id: 29055888-0f06-4212-9db4-26b1d8245eab
Q: What did React 19.3 make stable?
A: The <ViewTransition> component and Fragment Refs, both Canary-only through 19.2. Calling them experimental is now the out-of-date answer.

id: de5505d2-bdec-4c6e-b1a2-f2f461867b47
Q: What does the <ViewTransition> component do (19.3)?
A: Animates what it wraps as it enters, exits, updates or moves, using the browser's View Transition API. It fires on updates marked as transitions, and addTransitionType lets one update pick a different animation, like a carousel's direction.

id: a468abbf-e7f0-45c0-bbf6-7897771e6b50
Q: What are Fragment Refs (19.3)?
A: <Fragment ref> gives a FragmentInstance for a group of sibling elements with no wrapper: add event listeners, move focus, observe intersection or size, and scroll, without touching the children's markup.

id: dfeee9c4-6383-431e-b37b-71ecab6191c5
Q: What is browser() for (19.3)?
A: use(browser()), from react-dom, keeps a component out of server rendering: on the server it suspends to the nearest fallback, and in the browser it renders after hydration. For code that needs window, localStorage or the user's time zone.

id: 40b89c95-cb08-4656-a876-a4a4bb90814e
Q: What changed for Context in Server Components in 19.3?
A: A Server Component can render a Context imported from a 'use client' module directly, as <ThemeContext value={...}>, without writing a client wrapper component just to provide it.

id: 1ae833df-e286-4a1f-81f0-88cd12e1ab04
Q: Interview one-liner: what's the architectural theme of React 19?
A: Work moves off the client and out of your hands: RSC shifts rendering to the server, Actions absorb form boilerplate, and the Compiler absorbs memoization — less JS shipped, less code to maintain.
