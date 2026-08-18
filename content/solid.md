# SOLID
order: 5
tint: #FAD9BE
ink: #B87A3C
blurb: Design principles, and where they cost more than they pay

id: 85c25f28-e385-4524-a070-2a2da625b3dc
Q: What does SOLID stand for, and where does it come from?
A: Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion. Robert C. Martin gathered the five principles around 2000; Michael Feathers rearranged them into the acronym.

id: 40ac0587-b654-4ec3-88d7-edce72267bc6
Q: State the Single Responsibility Principle. What counts as a 'reason to change'?
A: A module should have one, and only one, reason to change. Martin later sharpened 'reason' to mean actor - each module should answer to a single stakeholder or business function, not to a single verb.

id: e20990c8-3dfe-4878-b7bb-e4dccacfd831
Q: What does an SRP violation look like in a React codebase?
A: One component that fetches, transforms, formats and renders, so both an API change and a design change land in the same file. Pull data access into a hook and formatting into pure functions, leaving the component to render.

id: 793305cf-5694-4aa1-99ef-0cdb5425c475
Q: State the Open-Closed Principle.
A: Entities should be open for extension but closed for modification: you add behaviour by adding code, not by editing code that already works and is already tested. Polymorphism and composition are the usual mechanisms.

id: 1b9229a1-0681-4758-802a-65a6e7c63718
Q: How would you apply OCP to a switch statement over payment providers that grows every quarter?
A: Replace the switch with a registry - Record<Provider, Handler> or a strategy interface - so a new provider is a new entry rather than an edit to the dispatcher. The trade-off: you lose the exhaustive never check that forces you to handle each new case.

id: a24980b5-d554-474b-b351-a62bc5b5d173
Q: State the Liskov Substitution Principle.
A: A subtype must be usable anywhere its supertype is expected without breaking the program's correctness. Subtypes may weaken preconditions and strengthen postconditions, never the other way round.

id: 0dd2941c-e9b5-4ff0-b1e4-5820349205f4
Q: Give a classic LSP violation and explain what breaks.
A: Square extending Rectangle: setting width silently mutates height, so any caller written against Rectangle's contract is wrong. The same smell is a subclass that throws NotSupported on an inherited method.

id: 31ae21b5-bcd1-4c17-9f75-d3f057bc9953
Q: How does TypeScript's type system relate to LSP?
A: TypeScript is structurally typed, so substitutability is judged on shape rather than declared inheritance. Method-shorthand parameters stay bivariant even under strictFunctionTypes - declare them as function properties to get sound, contravariant checks.

id: ed0ffb2a-5de7-4822-9275-7b8c2b89b8d0
Q: State the Interface Segregation Principle.
A: No client should be forced to depend on methods it does not use. Prefer several small, role-specific interfaces to one fat one, so a change made for one consumer cannot break or rebuild the others.

id: 822e3925-cf4a-479a-866a-2acf8ae12cdc
Q: What does ISP look like in a TypeScript React app?
A: Props typed to exactly what the component reads - Pick<User, 'id' | 'avatarUrl'> rather than the whole User - and one narrow service interface per consumer. Components then compose with partial data and are trivial to test.

id: ac1f8401-feed-4407-9fff-3edfc2074676
Q: State the Dependency Inversion Principle.
A: High-level policy should not depend on low-level detail; both depend on abstractions, and abstractions do not depend on details. In practice the consumer owns the interface, not the implementation.

id: fedb9bfe-c1d1-4af6-8385-6b00b09ba177
Q: Distinguish DIP, dependency injection, and an IoC container.
A: DIP is the design principle (depend on abstractions); DI is the technique of passing dependencies in rather than constructing them; an IoC container is tooling that wires DI for you. You can have DI without DIP, and DIP without a container.

id: 8167a727-5a80-4044-94dc-f8f75d0b8311
Q: How do you apply DIP in React or Next.js without a DI container?
A: Pass collaborators in as props, context or arguments - a component takes getUser(): Promise<User> instead of importing fetch or the SDK directly. Tests then hand it a fake, with no module mocking or network interception.

id: 508505e2-5112-40bd-8fa1-d383825efcc4
Q: What are the main criticisms of SOLID?
A: The wording is vague, the principles assume 1990s class-based OO, and they are easy to over-apply into indirection nobody asked for. Dan North's CUPID is one alternative, arguing for properties like composable and predictable over rules.

id: 4d7ea4cf-5878-4b62-814e-590112522a64
Q: How do SOLID, cohesion and coupling relate?
A: SRP and ISP push toward high cohesion; OCP, LSP and DIP push toward loose coupling. Cohesion and coupling are the underlying qualities - SOLID is a set of heuristics for moving them in the right direction.

id: d2bced86-e76a-4dc5-adf3-d4a74fb13c2f
Q: How should a senior engineer talk about SOLID in an interview?
A: Name the axis of change you are protecting and the price you are paying, because abstraction is not free and premature indirection is its own defect. Apply DIP at a volatile boundary such as a telecom or payments provider, and skip it for a stable one.
