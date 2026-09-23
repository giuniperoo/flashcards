# TypeScript in practice
tint: #F2CDCA
blurb: Type-system mechanics and applied React/Next.js typing

id: c9dbc60f-ea49-4f63-a2d9-c1ccd532014b
Q: unknown vs any vs never - when do you reach for each?
A: any switches checking off and spreads to everything it touches; unknown is the safe top type you must narrow before use; never is the empty type left after exhaustive narrowing or returned by functions that always throw. Type untrusted input as unknown, never any.

id: 674406a5-ba7e-4f01-a52f-872bdefd0aad
Q: interface vs type alias - what actually differs?
A: Interfaces support declaration merging (so they can be augmented) and give clearer errors with extends; type aliases can express unions, tuples, conditional and mapped types. Use interface for object contracts, type for anything computed.

id: d1662558-132b-47f2-936b-d997d36c7929
Q: What is structural typing, and where does it bite?
A: Compatibility is by shape, not name, so any object with the right members fits. The exception is excess-property checking on fresh object literals - an inline literal with an extra key errors, the same value via a variable does not.

id: cefb6c2b-3491-4c44-aaaf-532f235bac87
Q: How do you get nominal typing in a structural system?
A: Brand the type: type UserId = string & { readonly __brand: 'UserId' }, created only by a validating function. A plain string or an OrderId no longer assigns - useful for ids, money and unvalidated input.

id: 87669230-5bc8-49b7-9816-767f460a3f4c
Q: keyof, typeof and T[K] - what does each give you?
A: typeof lifts a value into its type, keyof gives the union of a type's keys, and T[K] is indexed access. Together: (typeof config)[keyof typeof config] is the union of config's values.

id: 58593b84-9802-488d-957f-aee3503b7b28
Q: Why does Object.keys(user) return string[] rather than (keyof User)[]?
A: Structural typing means a User value can carry extra keys at runtime, so promising only keyof User would be unsound. Cast deliberately (as (keyof T)[]) only for objects you construct, or iterate a known key list instead.

id: 0f71b44b-074f-4b71-80af-dd80460fbb46
Q: What does as const do?
A: It makes an object or array deeply readonly and infers literal types instead of widened ones, so ['a', 'b'] as const is readonly ['a', 'b']. It's the usual way to derive a union of literals from a value.

id: b8d77ea2-5677-4eb2-bd9a-d40594866c50
Q: What does satisfies do that a type annotation does not?
A: It checks a value against a type without widening it, so literal inference survives. const routes = {...} satisfies Record<string, Route> validates the shape but keeps the exact keys for autocomplete.

id: 6b647e5a-4fd6-4849-98cb-5c655d196db8
Q: Which built-in utility types do you use daily, and what's the principle behind them?
A: Partial, Required, Pick, Omit, Record, ReturnType, Parameters, Awaited, NonNullable, Extract and Exclude. The principle is derive, don't duplicate: type Plan = Awaited<ReturnType<typeof getPlan>> stays correct when getPlan changes.

id: ff3276e4-e10d-4d57-8b46-1bf3c366ad45
Q: Why does Omit<Shape, 'id'> break a discriminated union, and what's the fix?
A: Omit isn't distributive - keyof a union keeps only shared keys, so the result collapses into one object with just the common members. Distribute it yourself: type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never.

id: 2d246c29-97b8-478d-b4b5-478439e34801
Q: What are your narrowing tools, from built-in to custom?
A: typeof, instanceof, in, equality and discriminant checks, truthiness and Array.isArray, then type predicates and assertion functions. Prefer a literal discriminant field over in checks - it narrows cleanly and survives refactors.

id: f86ebffe-788b-4f48-bc68-395d13f69b00
Q: What is a user-defined type guard, and what changed in 5.5?
A: A function returning x is Foo that narrows at call sites - and a lie if its body is wrong. Since 5.5 TypeScript infers predicates for simple functions, so .filter(x => x !== null) narrows without an annotation.

id: bb6be65e-42bd-45fb-8ea3-cba1283db67d
Q: What is an assertion function, and when do you use one?
A: A function typed asserts x is T (or asserts condition) that throws when the check fails, so code after the call is narrowed - e.g. invariant(user, 'no session'). Use it for should-never-happen states where throwing is the right response.

id: 57f4a6ed-1dca-44c8-b5d1-25c8ea740e14
Q: How do you get exhaustiveness checking on a discriminated union?
A: In the default branch assign the value to never (const _x: never = value, or value satisfies never). Add a variant and the switch stops compiling instead of silently falling through.

id: 8b361f18-a860-4c5a-974f-bcf7a37467e5
Q: How do you type errors - both thrown ones and expected failures?
A: Under strict, catch (e) gives unknown, so narrow with e instanceof Error before reading message. For expected failures (card declined, port-in rejected) return a discriminated result like { ok: true; data } | { ok: false; error } so callers must handle both.

id: c514b9eb-ce9f-46a6-81a9-2cbb2f1527e0
Q: Why can index signatures lie, and what fixes it?
A: Record<string, T> claims every key exists, so obj['missing'] types as T but is undefined at runtime. noUncheckedIndexedAccess adds | undefined to indexed reads and forces a check.

id: e074cdb9-3b1f-4aea-91d6-e3b1b2a0b20a
Q: Which checks do you enable beyond strict: true, and which hurts most to adopt?
A: noUncheckedIndexedAccess, exactOptionalPropertyTypes (a?: string no longer accepts an explicit undefined), noImplicitOverride and noFallthroughCasesInSwitch. exactOptionalPropertyTypes breaks the most code, because so much existing code assigns undefined to optional props.

id: c467dcdd-5d9c-4b6e-954a-944ac94d309f
Q: What is strictFunctionTypes actually protecting you from?
A: It checks function parameters contravariantly, so a handler that needs a narrower argument can't sit where a wider one will be passed. Method-shorthand parameters stay bivariant, so the bug still slips through interfaces written with method syntax.

id: 5ff7656f-9bce-4b69-9502-a7ed65a31b15
Q: Write a typed getProp, and state the rule for when a generic is justified.
A: function getProp<T, K extends keyof T>(obj: T, key: K): T[K]. A type parameter should relate at least two things (input to output, or two inputs); one used only once is unknown in disguise and should go.

id: ffb5b613-0135-4442-b78d-58d48c085441
Q: Explain conditional types and infer in one breath.
A: T extends U ? A : B picks a branch per type, and infer names a type captured during the match: type El<T> = T extends (infer U)[] ? U : never. Over a naked type parameter the conditional distributes across union members.

id: c8183ba5-ee71-40d3-9a7e-03324002865a
Q: What is a mapped type, and what does key remapping add?
A: { [K in keyof T]: ... } rebuilds a type key by key; as in the key position renames or drops keys. E.g. { [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K] } generates getters.

id: 8c015200-4cfb-432c-9d7d-94315d7e40c7
Q: Template literal types - give a real use.
A: They build string types from other types: `on${Capitalize<'click' | 'focus'>}` gives 'onClick' | 'onFocus'. Common for event names, route paths and design-token keys.

id: 84378703-2c28-4994-ad81-6aca8a13a226
Q: What is a const type parameter, and why does it matter?
A: <const T> makes call-site arguments infer as literals without the caller writing as const. A helper can then return precise literal types from a plain inline array or object.

id: 840f1859-3b08-4bbf-9516-77414d90ff04
Q: What is NoInfer<T> for?
A: It stops a type parameter being inferred from that position, so one argument drives inference and another is only checked against it. E.g. a defaultValue that must be one of the options, rather than widening them.

id: 1a508d35-3d3e-4b6b-b38a-db9fc4ee6c05
Q: Why import type, and what do isolatedModules and verbatimModuleSyntax enforce?
A: import type marks an import as types-only so single-file transpilers (SWC, esbuild - what Next.js uses) can drop it; isolatedModules requires every file be transpilable on its own. verbatimModuleSyntax goes further: imports without type are kept exactly as written, so type-only ones must be marked.

id: 76539078-1131-4e81-a6f5-9dbfd843bfb1
Q: Why do people avoid enums, and what replaces them?
A: Enums emit runtime code, fail under Node's type stripping and --erasableSyntaxOnly, and numeric enums accept any number-typed variable (literals out of range error since 5.0). Use a const object plus (typeof obj)[keyof typeof obj], or a plain string-literal union.

id: 4768d30c-abd8-4172-aa66-a731423b1527
Q: How do you add a field to a third-party type, like your auth library's Session?
A: Module augmentation: declare module 'lib' { interface Session { userId: string } } and interface merging extends it; declare global { interface Window { ... } } does the same for globals. The file must itself be a module (have an import or export), or you declare a new module instead of augmenting.

id: 1caa3471-733e-413e-9a61-2d8265e4b2ef
Q: You inherit a large JS codebase. How do you get it to strict TS?
A: Turn on allowJs and checkJs with strict off, convert leaf modules first and type the boundaries (API, config, shared models) before internals. Then enable strict flags one at a time - strictNullChecks last and loudest.

id: c864349b-ef3b-4ac2-b06b-623a5bcbc602
Q: How should types cross a network boundary?
A: Don't assert - parse at the edge with a runtime validator (zod, valibot) and infer the static type from the schema, so one definition guards runtime and compile time. await res.json() as Plan is a claim the compiler can't check.

id: c666b203-935c-4e6a-9f03-2ce63427a44c
Q: How should process.env be typed in a Next.js app?
A: Every value is string | undefined, and augmenting ProcessEnv to claim otherwise is an unchecked lie. Parse process.env once at startup with a schema (zod or t3-env) and export the typed result, which also polices which vars may reach the client.

id: 15eea15b-a2fe-4c84-a522-89948f989efe
Q: How would you type a client for a large third-party REST API, like a carrier or payments provider?
A: Generate types from its OpenAPI spec (openapi-typescript plus a typed fetch wrapper) and regenerate in CI, rather than hand-writing them. Keep runtime validation on responses that drive money or provisioning - a spec is a promise, not a guarantee.

id: 7de8559c-2da5-4c68-ab61-8272d2576db3
Q: useState and useRef with React 19's types - where does inference need help?
A: useState(null) infers null, so write useState<User | null>(null). useRef now requires an argument and returns a mutable RefObject: useRef<HTMLInputElement>(null) gives RefObject<HTMLInputElement | null>, and useRef(0) a mutable box.

id: daed2ef5-f046-4618-b086-6c505f5d99ea
Q: How do you write a generic React component?
A: Give the props a type parameter and let inference flow from them: function List<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }). The caller gets T inferred from items.

id: 770e8699-54d3-4ec2-bf1c-354615f53b3f
Q: How do you type a Button that accepts every native button prop?
A: Extend ComponentProps<'button'>, Omit anything you redefine, and spread the rest onto the element. In React 19 ref is a normal prop, so it flows through the spread with no forwardRef.

id: 1fbdff2a-f6b4-4402-9f5a-2a1fd554781a
Q: A component takes either href (renders a link) or onClick (renders a button), never both. How do you type it?
A: A union of prop shapes that forbids the other key: { href: string; onClick?: never } | { onClick: () => void; href?: never }. Passing both fails to compile, and checking props.href !== undefined narrows to the link variant.

id: db20eed8-19ba-4c5e-bca0-3a56b9d2b6bb
Q: How do you type a React context with no sensible default value?
A: createContext<Value | null>(null), then a useX() hook that throws if the value is null and returns Value. Consumers get a non-null type and a clear error if rendered outside the provider.

id: d6fc881a-4eb2-4fd8-a8d3-755e7b8fae4d
Q: What does the Server/Client boundary mean for your types?
A: Props into a 'use client' component must be serializable: plain objects, arrays, Date, Map, Set, promises and Server Functions work; ordinary functions and class instances don't. TypeScript alone won't catch it (Next's TS plugin warns in client entry files), so keep boundary props to plain data.

id: 770c68fe-48f5-49f7-a693-a546f4f34140
Q: How are page params and searchParams typed in the App Router?
A: Since Next 15 both are Promises you await: params: Promise<{ id: string }>. searchParams values are string | string[] | undefined, so parse them; Next 15.5 added generated helpers like PageProps<'/plans/[id]'>.

id: 76fb8bf6-59d6-4949-aa9a-b33627d34c5d
Q: How do you type a Server Action used with useActionState?
A: async function subscribe(prev: State, formData: FormData): Promise<State>, with State a discriminated union of idle, success and error. formData.get() returns FormDataEntryValue | null, so validate with a schema before trusting it.

id: de765b11-fb27-4163-b243-241c88363db7
Q: An AI agent's PR is full of as, ! and any. How do you review it?
A: Treat each as an unchecked claim: ask for narrowing, runtime validation or satisfies instead, and accept as only right after a real check (as const is fine). Back it with lint - no-explicit-any, no-non-null-assertion and the no-unsafe-* rules - so the pattern can't creep back.
