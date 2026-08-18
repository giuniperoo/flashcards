# React 19
order: 2
tint: #DCD6F3
ink: #7A6DBE
blurb: Actions, Server Components, and the 19.2 additions

id: b122d58d-4dea-4338-b8fe-721c092bdffe
Q: What is the latest React version, and is 'React 20' real?
A: React 19.2 (19.0 shipped Dec 2024; 19.2 landed Oct 2025). No React 20 exists. React is now stewarded by the independent React Foundation under the Linux Foundation.

id: 49e1ac33-f41a-414a-8a51-51311ce27f82
Q: What are Actions in React 19?
A: Async functions passed to a transition or form. React automatically manages the pending state, error handling, optimistic updates, and form resets you used to hand-write.

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
A: Nothing is needed anymore: in React 19, ref is a regular prop on function components. forwardRef is deprecated and codemods remove it.

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

id: cc64e2ec-ab6a-4b9c-94c0-3fb6ccb798f1
Q: Name three smaller React 19 quality-of-life changes.
A: Context used directly as a provider (<MyContext> instead of .Provider), ref callbacks can return cleanup functions, and hydration errors now show a single readable diff.

id: f1604993-898a-4907-9718-6774d854dca8
Q: Which headline features are still NOT stable in 19.2?
A: View Transitions and Fragment Refs — real and demoed, but only in Canary/Experimental channels. Saying they're stable in an interview is a red flag.

id: 1ae833df-e286-4a1f-81f0-88cd12e1ab04
Q: Interview one-liner: what's the architectural theme of React 19?
A: Work moves off the client and out of your hands: RSC shifts rendering to the server, Actions absorb form boilerplate, and the Compiler absorbs memoization — less JS shipped, less code to maintain.
