# TypeScript in practice
tint: #F2CDCA
blurb: Type-system mechanics and applied React/Next.js typing

id: c9dbc60f-ea49-4f63-a2d9-c1ccd532014b
Q: unknown vs any vs never - when do you reach for each?
A: any switches checking off and infects everything it touches; unknown is the safe top type you must narrow before use; never is the empty type returned by functions that never return and left over from exhaustive narrowing. Type external input as unknown, never any.

id: b8d77ea2-5677-4eb2-bd9a-d40594866c50
Q: What does satisfies do that a type annotation does not?
A: satisfies checks a value against a type without widening it, so you keep the literal inference. const routes = {...} satisfies Record<string, Route> validates the shape but keeps the exact keys for autocomplete.

id: 57f4a6ed-1dca-44c8-b5d1-25c8ea740e14
Q: How do you get exhaustiveness checking on a discriminated union?
A: In the default branch assign the value to never: const _x: never = value. If a new variant is added the assignment stops compiling, so the switch fails at build time rather than silently falling through.

id: f86ebffe-788b-4f48-bc68-395d13f69b00
Q: What is a user-defined type guard, and what changed in 5.5?
A: A function returning x is Foo that narrows at call sites. Since 5.5 TypeScript infers those predicates for simple functions, so a filter callback like x => x !== null can narrow without the manual annotation.

id: ffb5b613-0135-4442-b78d-58d48c085441
Q: Explain conditional types and infer in one breath.
A: T extends U ? A : B picks a branch per type, and infer names a type captured during that match: type El<T> = T extends (infer U)[] ? U : never. Over a union the conditional distributes member by member.

id: c8183ba5-ee71-40d3-9a7e-03324002865a
Q: What is a mapped type, and what does key remapping add?
A: { [K in keyof T]: ... } rebuilds a type key by key; as in the key position renames or drops keys, e.g. { [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K] } to generate getters.

id: 0a438d6f-3b64-4d99-9279-71e0ea1312ee
Q: Which built-in utility types should be reflexive for you?
A: Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited. Most are a mapped or conditional type you could write yourself in one line.

id: 674406a5-ba7e-4f01-a52f-872bdefd0aad
Q: interface vs type alias - what actually differs?
A: Interfaces support declaration merging and are used for augmenting other modules' types; type aliases can express unions, tuples, conditionals and mapped types. Use interface for object contracts, type for anything computed.

id: d1662558-132b-47f2-936b-d997d36c7929
Q: What is structural typing, and where does it bite?
A: Compatibility is by shape, not by name, so any object with the right members fits. The exception is excess property checking on fresh object literals, which is why an inline literal errors but the same value assigned via a variable does not.

id: cefb6c2b-3491-4c44-aaaf-532f235bac87
Q: How do you get nominal typing in a structural system?
A: Brand the type: type UserId = string & { readonly __brand: 'UserId' }. A plain string no longer assigns, so you cannot pass an OrderId where a UserId belongs - useful for ids, currency and unvalidated input.

id: 87669230-5bc8-49b7-9816-767f460a3f4c
Q: keyof, typeof and T[K] - what does each give you?
A: typeof lifts a value into its type, keyof gives the union of a type's keys, and T[K] is indexed access. Together: typeof config, keyof typeof config, and config[keyof typeof config] for the union of its values.

id: 0f71b44b-074f-4b71-80af-dd80460fbb46
Q: What does as const do?
A: It makes an object or array deeply readonly and infers literal types instead of widened ones, so ['a','b'] as const becomes readonly ['a','b'] - the usual way to derive a union of literals from a value.

id: 84378703-2c28-4994-ad81-6aca8a13a226
Q: What is a const type parameter, and why does it matter?
A: <const T> on a generic makes call-site arguments infer as literals without the caller writing as const, so a helper can return precise literal types from a plain inline array or object.

id: 8c015200-4cfb-432c-9d7d-94315d7e40c7
Q: Template literal types - give a real use.
A: They build string types from other types: type Ev = `on${Capitalize<'click' | 'focus'>}` gives 'onClick' | 'onFocus'. Common for event names, route paths and CSS-in-TS keys.

id: c514b9eb-ce9f-46a6-81a9-2cbb2f1527e0
Q: Why can index signatures lie, and what fixes it?
A: Record<string, T> claims every key exists, so obj['missing'] types as T but is at runtime undefined. --noUncheckedIndexedAccess adds | undefined to indexed reads and forces you to check.

id: 2b610f9f-f8ca-4723-aa33-9915ebb459ed
Q: When are function overloads the right tool?
A: When the return type depends on the argument shape in a way a union cannot express. Otherwise prefer a union parameter or a generic - overloads are unchecked against each other and easy to get wrong.

id: 76539078-1131-4e81-a6f5-9dbfd843bfb1
Q: Why do people avoid enums, and what replaces them?
A: Enums emit runtime code, break under Node's type-stripping and --erasableSyntaxOnly, and numeric enums accept any number. Use a const object plus typeof obj[keyof typeof obj], or a plain string union.

id: c467dcdd-5d9c-4b6e-954a-944ac94d309f
Q: What is strictFunctionTypes actually protecting you from?
A: It checks function parameters contravariantly, so a handler taking a narrower parameter cannot be assigned where a wider one is expected. Method-shorthand parameters stay bivariant, which is why the same bug slips through on interfaces declared with method syntax.

id: 1a508d35-3d3e-4b6b-b38a-db9fc4ee6c05
Q: Why import type, and what does isolatedModules demand?
A: import type marks an import as erasable so bundlers and single-file transpilers do not keep a runtime import. isolatedModules requires every file to be transpilable alone, which is what Next.js, esbuild and SWC do.

id: b10e2203-0fb7-4df1-8a31-a3fa3352d081
Q: What is declaration merging / module augmentation for?
A: declare module '...' reopens another package's types to add your own - extending Express's Request, next-auth's Session, or adding keys to ProcessEnv - without forking the package.

id: c864349b-ef3b-4ac2-b06b-623a5bcbc602
Q: How should types cross a network boundary?
A: Do not assert. Parse at the edge with a runtime validator (zod, valibot) and infer the static type from the schema, so one definition guards both runtime and compile time. as Response is a lie the compiler cannot check.

id: 2c196974-34da-4687-a702-427ff12c090e
Q: ts-ignore vs ts-expect-error - which and why?
A: @ts-expect-error, because it errors when the line stops failing, so the suppression gets cleaned up. @ts-ignore stays silent forever and hides the next real bug on that line.

id: 840f1859-3b08-4bbf-9516-77414d90ff04
Q: What is NoInfer<T> for?
A: It blocks a type parameter from being inferred from that position, so one argument drives inference and another is only checked against it - e.g. a default value that must match the options array, not widen it.

id: 1caa3471-733e-413e-9a61-2d8265e4b2ef
Q: You inherit a large JS codebase. How do you get it to strict TS?
A: Turn on allowJs and checkJs with strict off, rename leaf modules first, type the boundaries (API, config, shared models) before internals, then enable strict flags one at a time - strictNullChecks last and loudest.

id: 0df5f104-fd37-4ffb-88f3-f2e41ae9c16e
Q: How do you type a React component's props well?
A: Declare an explicit props type and destructure; use React.ReactNode for renderable children and ComponentProps<'button'> to inherit native props. Avoid React.FC - it adds little and complicates generics.

id: 7de8559c-2da5-4c68-ab61-8272d2576db3
Q: useState and useRef - where does inference fail?
A: useState(null) infers null, so pass the generic: useState<User | null>(null). For DOM refs use useRef<HTMLInputElement>(null) which gives the readonly ref React assigns; useRef<number>(0) gives a mutable box.

id: daed2ef5-f046-4618-b086-6c505f5d99ea
Q: How do you write a generic React component?
A: Type the props with a parameter and let inference flow from the props: function List<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }). The caller gets T inferred from items.

id: 587d069c-f13d-4f8a-b455-8efe4f1debf9
Q: Why is useReducer a showcase for discriminated unions?
A: Actions are a union tagged by type, so the reducer's switch narrows the payload per case and a never default makes new actions a compile error - a state machine the compiler checks for you.

id: d6c62020-f2e1-4e01-b32f-cc23c458e774
Q: How do you type event handlers without guessing?
A: Take the type from the element: React.ChangeEvent<HTMLInputElement>, React.MouseEvent<HTMLButtonElement>. Better still, type the handler by the prop - ComponentProps<'input'>['onChange'] - and let the parameter infer.

id: d6fc881a-4eb2-4fd8-a8d3-755e7b8fae4d
Q: What does the Server/Client boundary mean for types?
A: Anything passed from a Server Component to a Client Component must be serializable, so the type system will let you pass a function or Date shape that fails at runtime. Keep the boundary props to plain data.

id: 08393373-a5c4-4ff0-8847-8ccfdd974d57
Q: How do you get end-to-end type safety from route to component?
A: Define the model once, derive everything else: infer the response type from the schema or handler, export it, and have the client import that type instead of redeclaring it. Duplicate interfaces are how drift starts.

id: e074cdb9-3b1f-4aea-91d6-e3b1b2a0b20a
Q: Which strict flags do you turn on beyond strict: true?
A: noUncheckedIndexedAccess, exactOptionalPropertyTypes and noImplicitOverride are not in the strict bundle. Say why you would add them - and why exactOptionalPropertyTypes is the one that breaks the most existing code.
