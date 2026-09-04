# React in Practice
tint: #CAF2EF
blurb: Patterns and conventions for senior React work

id: ff487b75-ae21-40c9-a7fc-0faf4cb364da
Q: Composition over prop drilling: what's the first tool you reach for?
A: Pass JSX as children or as a prop instead of threading data down. The component that owns the state renders the leaf and hands it over, so the components in between never see the prop at all.
id: 3b3733de-b24f-49db-8389-d4b4d98fb3b2
Q: When do you NOT need a useEffect?
A: Whenever the value can be derived during render or computed in an event handler. Effects are for synchronising with something outside React — the DOM, a subscription, the network — not for reacting to your own state changes.
id: 5ce50e43-231c-4489-8b63-c699e8ce79ba
Q: A prop changes and you want the component's state to reset. What's the idiomatic fix?
A: Give the component a key tied to that prop so React remounts it with fresh state. Mirroring the prop into state and resetting it in an effect renders stale values first and is the classic anti-pattern.
id: bce9ddb8-a165-4035-8ee3-81211d9f58a3
Q: Why is array index a bad key, and when is it fine?
A: Index keys make React reuse the wrong instance when items are inserted, removed or reordered, so state and DOM stick to the wrong row. Fine only for a static list that is never reordered and holds no state.
id: a9b08119-0a28-477c-ac59-e4577582e9e5
Q: What does "colocate state" mean, and what's the rule for lifting it?
A: Keep state in the lowest component that uses it, and lift it only as far as the closest common ancestor of the components that need it. Lifting higher than necessary re-renders half the tree for no reason.
id: cdfff9b7-7010-49c0-b442-8245d47d99cc
Q: Controlled vs uncontrolled inputs — when do you pick each?
A: Controlled when you need to react to every keystroke: live validation, formatting, dependent fields. Uncontrolled with defaultValue plus a ref or FormData when you only care at submit time — cheaper and the default for Actions.
id: 6efacdec-267a-4798-b45f-334451780ee4
Q: What are the two main costs of Context, and how do you mitigate them?
A: Every consumer re-renders whenever the value identity changes, and consumers become coupled to a provider being present. Split contexts by update frequency, memoise the value, and prefer passing children through over pushing everything into context.
id: f6e93796-f76a-4ab7-a015-e6659eddfa00
Q: Server state vs client state: why treat them differently?
A: Server state is a cache of data you do not own — it goes stale and needs fetching, deduping, revalidation and error states, so use RSC or a query library. Client state is UI state you do own, where useState or the URL is enough.
id: 9c66eb52-2596-4c77-8de2-59c0ae5849a5
Q: useState vs useReducer — where's the line?
A: Reach for useReducer once several pieces of state change together, or when the next state depends on what happened rather than on one new value. It moves transitions into a single pure function you can test and read in one place.
id: e82642cb-4fe7-4886-8444-2c486f4c2f6e
Q: What makes a good custom hook, and what are the Rules of Hooks?
A: It names one behaviour, composes other hooks, and returns values rather than JSX. Hooks must be called unconditionally at the top level of a component or another hook — never inside loops, conditions, or callbacks.
id: 71cb2ffa-f40e-4964-a2f5-532bac15daa7
Q: An effect fetches data and the props change mid-flight. What goes wrong and how do you fix it?
A: Responses can resolve out of order and the stale one overwrites the fresh one. Fix it in the cleanup function: abort with an AbortController or flip an ignore flag — or hand fetching to a library that already does this.
id: dfdd9ee1-bb3b-46b1-a69f-df8d1f421178
Q: Why does StrictMode run effects twice in development?
A: It mounts, unmounts and remounts to surface effects that are not safely repeatable, so a missing or wrong cleanup fails loudly. It is development-only, and the fix is correct cleanup rather than a "has run" guard.
id: ee89d004-f770-438a-86eb-0d401f6bbafe
Q: useRef vs useState — what belongs in a ref?
A: A ref holds a mutable value that does not affect the rendered output: DOM nodes, timer and subscription ids, previous values. Writing to it does not re-render, and you should not read or write it during render.
id: ec530534-eb3b-4fbd-ba6e-982c7d1fd9cf
Q: When should you still hand-write useMemo, useCallback and memo?
A: For genuinely expensive computations, for stable identities crossing a boundary you do not control such as effect dependencies or a third-party library, and for re-render problems you have actually measured. The React Compiler covers the routine cases.
id: da6c1495-1b16-496a-9fb6-3f63cc1af25c
Q: What is an error boundary, and what does it NOT catch?
A: A component that catches errors thrown while rendering its subtree and shows a fallback instead of unmounting the app. It does not catch errors in event handlers, async callbacks, or ones thrown by itself.
id: 079a4fc6-5a88-44ac-9010-3232fada356b
Q: What does Suspense actually do, and what triggers it?
A: It renders a fallback while something below it suspends — a lazily loaded component, or a promise read with use() or a Suspense-aware data source. On the server it also marks the boundary where streaming can flush.
id: 8ac7f30b-1768-4e77-af72-6af244cae02b
Q: Server Components vs Client Components: where does the boundary go?
A: Server is the default: data access, secrets and heavy dependencies stay there and ship no JavaScript. Push 'use client' down to the leaves that need state, effects or event handlers, and pass server data in as serialisable props.
id: 50dc249f-4a8b-496e-9c0f-e6bcc7d3691d
Q: How do you build a form with Server Actions in React 19?
A: Pass an async function to form action. Wrap it in useActionState to get state, formAction and isPending, read the pending state inside children with useFormStatus, and add useOptimistic when you want instant feedback.
id: 38eef364-ec5a-4fea-b595-f1bdc986d2a9
Q: What is the compound component pattern, and when is it worth it?
A: Related parts such as Tabs, TabList and TabPanel share implicit state through context, so the consumer controls the markup and ordering. Worth it when a component has many valid arrangements that would otherwise become a pile of configuration props.
id: 8e51b0ce-ddb0-46ef-b7b0-b918b33335cb
Q: What does "headless" mean for a UI component, and how do you build one?
A: Behaviour, state and accessibility with no styling: expose a hook or prop getters and let the caller render the markup. It is how Radix, Headless UI and TanStack work, and it has largely replaced render props.
id: 9bf2a456-ced1-452e-8366-0e0873802cee
Q: How should you type component props in TypeScript today?
A: Declare a props type and annotate the parameter rather than using React.FC. Inherit native props with ComponentProps<'button'>, type children as ReactNode, and use discriminated unions so impossible prop combinations will not compile.
id: 3415e1ca-554d-464d-995d-f3d9dc565581
Q: You're wrapping a native button. What does the wrapper need to get right?
A: Spread the remaining props through, forward ref — a plain prop in React 19 — default type to "button", and merge className instead of overwriting it, typically with clsx plus tailwind-merge.
id: 2f17606d-90f5-4886-9422-c60edb36ad5e
Q: What accessibility basics does a custom interactive component owe the user?
A: A real semantic element where one exists, full keyboard operation with visible focus, an accessible name, ARIA state that tracks reality such as aria-expanded, and focus management for overlays including returning focus on close.
id: 869efde8-8eb7-49d9-b4a2-5ed3405cf6fe
Q: What are the conventions for testing React components with Testing Library?
A: Query the way a user would — role, then label, then text, with test ids as the last resort — drive interactions with user-event, assert on rendered output rather than state or props, and use findBy queries for anything async.
