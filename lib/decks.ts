/**
 * `id` is a uuid assigned once, when a card is written here or imported. It is
 * deliberately not derived from the question text: progress is keyed by it, and
 * fixing a typo in a question is exactly when that progress should survive.
 */
export type Card = { id: string; q: string; a: string };

export type Deck = {
  slug: string;
  name: string;
  blurb: string;
  tint: string;
  ink: string;
  cards: Card[];
};

export const decks: Deck[] = [
  {
    slug: "gigs",
    name: "Gigs",
    blurb: "Embedded telecom, Connect, and the product surface",
    tint: "#CBDDF2",
    ink: "#5E86AE",
    cards: [
      {
        id: "5d05a4ca-0997-4d89-96d9-94b745869a7d",
        q: "In one line, what is Gigs?",
        a: "The operating system for embedded telecom: it lets any app or brand launch and run its own mobile service - eSIMs, plans, data - without becoming a carrier itself.",
      },
      {
        id: "480097ab-3505-4bf0-a0ff-4084eea9b8b2",
        q: "What umbrella name covers the whole Gigs stack?",
        a: "Gigs OS. The individual products (API, Connect, Payments, Operator, Dashboard) are the building blocks; use-case bundles repackage them for different markets.",
      },
      {
        id: "072b38b5-a658-48fa-bc50-a14fd69379ca",
        q: "Gigs distinguishes 'customer' from 'user'. Who is each?",
        a: "The customer is the business integrating Gigs, e.g. a fintech app. The user is that customer's own end subscriber - the person who buys and manages a phone plan.",
      },
      {
        id: "8a700f21-a95e-4954-91ea-9cd71d43eb0a",
        q: "What is the relationship between user and customer?",
        a: "The user already has an account and trust with the customer, often with payment details on file. The customer layers telecom on top; Gigs powers it underneath.",
      },
      {
        id: "97cd237b-31cb-46c1-ba7d-637ae6092f82",
        q: "What is the Gigs API, and why is it foundational?",
        a: "A single developer-friendly telecom API connecting you to multiple carriers across markets. Everything else is built on it - you integrate once instead of striking deals carrier by carrier.",
      },
      {
        id: "a7400ad5-2169-4a6c-bc26-682af25d6fcd",
        q: "Name the core things the Gigs API handles.",
        a: "eSIM provisioning, subscriptions and plans, number porting in and out, and usage analytics - all across multiple carriers and markets.",
      },
      {
        id: "b0f40d5d-bbb8-461c-bc42-c7c991675358",
        q: "What is Gigs Connect?",
        a: "The white-label hosted user-facing layer: a branded storefront and account dashboard where users sign up, pay, activate their SIM and manage their plan, with no code required from the customer.",
      },
      {
        id: "4ed3c19d-8f20-4f33-9632-5ea5f3becea8",
        q: "What is a Connect Session?",
        a: "A session generated via the API and enriched with a specific intent - view eSIM installation, buy data, cancel - dropping the user straight into that flow rather than a generic interface.",
      },
      {
        id: "377d0ffd-a774-4d3f-8e6e-8d2a7fd7250e",
        q: "What problem do Connect Links solve?",
        a: "They serve customers who cannot handle their own authentication. The link sends a one-time code to the user's email, verifies it, then creates an authenticated session, so Gigs carries the auth burden.",
      },
      {
        id: "e9a54f7c-dbda-42fe-8537-a7d6d3b5d9ce",
        q: "Walk the Connect Link auth flow at a high level.",
        a: "User opens link; Gigs issues a one-time code to their email; user enters it; Gigs verifies and resolves the user ID; a Connect Session is created with that user and payload; user is redirected to the session's url.",
      },
      {
        id: "e57dbd8e-e70d-4bcb-ba33-bed6280dee34",
        q: "What does Connect cover across a plan's lifecycle?",
        a: "Hosted checkout, authentication, plan management and data usage, buying data and add-ons, switching or upgrading plans, cancelling, and eSIM install instructions.",
      },
      {
        id: "8ed6f861-eaa7-4de4-8fa1-9d3924523d0a",
        q: "What is Gigs Payments?",
        a: "The billing engine baked into the platform - the financial plumbing beneath the service: payment acceptance, recurring billing and money handling built for telecom.",
      },
      {
        id: "022d88ad-346f-452a-af34-eb004b006907",
        q: "What makes Payments telecom-specific rather than a generic processor?",
        a: "Telecom tax calculation and remittance. Phone plans are taxed in jurisdiction-specific ways, so it calculates the right tax, collects it, and forwards it to the authorities.",
      },
      {
        id: "a4d97dbc-dcad-4e02-9860-cd4d71af78a6",
        q: "What does 'remittance' mean here?",
        a: "Actually sending owed money on to whoever it is owed to - forwarding collected tax to the government in the right amount, jurisdiction and schedule. Distinct from merely calculating it.",
      },
      {
        id: "4419209c-a206-4c87-9730-2ddb90078aec",
        q: "What is Gigs Operator?",
        a: "Customer-service AI built for telecom: a chatbot that embeds real UI components inside the chat thread, so users can self-serve their goal in-line rather than being talked at.",
      },
      {
        id: "179d3088-7680-43c6-b46e-869ff0f89230",
        q: "What can Operator do beyond answering questions?",
        a: "Conversational sales (suggesting a plan), KYC identity verification, plan management such as buying roaming or data and switching plans, and troubleshooting that actually resolves the issue.",
      },
      {
        id: "598106b4-f4c1-4f76-b3a9-36b2b278fc74",
        q: "Two operational features that make Operator production-ready?",
        a: "It works in 100+ languages, and it escalates to human support based on the sentiment and complexity of a request - handing off when it is out of its depth.",
      },
      {
        id: "52250b98-92cd-493c-bab0-9ae8b777fd25",
        q: "What is the Gigs Dashboard, and who uses it?",
        a: "The operational cockpit for the customer's own team, not the end user: real-time oversight of subscriptions, customers, payments, vouchers, devices and analytics, unified across carriers and markets.",
      },
      {
        id: "87d26a1e-121a-4362-98ac-562b6355ecf0",
        q: "What is an eSIM, and why does it matter for embedded telecom?",
        a: "A SIM built into the device and provisioned over the air by downloading a profile. With no plastic to ship, a plan can be sold and activated inside an app in seconds - which is what makes embedded telecom viable.",
      },
      {
        id: "630550d2-ad6e-46d3-808d-e0170c74c54a",
        q: "What is an MVNO, and how does it relate to Gigs?",
        a: "A mobile virtual network operator sells mobile service under its own brand on someone else's radio network. Gigs' customers get that outcome without building and running the operator themselves.",
      },
      {
        id: "22457219-4d5d-47f0-a96a-1a02ae7d2361",
        q: "Why is number porting operationally hard?",
        a: "Porting means coordinating with the carrier losing the number, matching the subscriber's account details exactly, and surviving a cutover window where the line can break. Small data mismatches cause most failures.",
      },
      {
        id: "32afec61-9465-4fc2-9241-87227935ece4",
        q: "What is KYC, and why does telecom need it?",
        a: "Know Your Customer: verifying a subscriber's identity, which regulators require in many markets before a line can be activated. It puts a compliance check in the middle of an otherwise smooth signup flow.",
      },
      {
        id: "684ce748-4876-4426-aa47-64604dc82045",
        q: "What stack does the Gigs product engineer role use?",
        a: "Next.js, React, TypeScript and Tailwind CSS, with both frontend and backend built on Next.js. Also named in the ad: REST APIs, Docker, GCP, GitHub Actions, Cypress or Testing Library, and some Ruby on Rails.",
      },
      {
        id: "f3e7fc2f-4d4f-429b-857a-6baa2f34cb32",
        q: "What scale is Gigs operating at?",
        a: "Around 150 people across the US and Europe, backed by close to $100m from Ribbit Capital, Google and Y Combinator. Connect is the consumer-facing product this role builds.",
      },
    ],
  },
  {
    slug: "react19",
    name: "React 19",
    blurb: "Actions, Server Components, and the 19.2 additions",
    tint: "#DCD6F3",
    ink: "#7A6DBE",
    cards: [
      {
        id: "b122d58d-4dea-4338-b8fe-721c092bdffe",
        q: "What is the latest React version, and is 'React 20' real?",
        a: "React 19.2 (19.0 shipped Dec 2024; 19.2 landed Oct 2025). No React 20 exists. React is now stewarded by the independent React Foundation under the Linux Foundation.",
      },
      {
        id: "49e1ac33-f41a-414a-8a51-51311ce27f82",
        q: "What are Actions in React 19?",
        a: "Async functions passed to a transition or form. React automatically manages the pending state, error handling, optimistic updates, and form resets you used to hand-write.",
      },
      {
        id: "a2778f4b-7bc6-4496-bfec-64cfbb4dcd3f",
        q: "What does useActionState do?",
        a: "Wraps an action and returns [state, formAction, isPending] — replacing hand-rolled loading/error/result state for submissions. Pass formAction straight to <form action={...}>.",
      },
      {
        id: "ac76bfe9-ed5c-43b8-b154-cf957f28e6ec",
        q: "What does useFormStatus do?",
        a: "Lets a child component read the status (pending, data) of its nearest parent <form> — like context for forms. Classic use: a submit button that disables itself.",
      },
      {
        id: "a60ba84e-a39f-4c1d-bd86-de7aa1f1c68d",
        q: "What does useOptimistic do?",
        a: "Shows a temporary 'optimistic' value while an async action is in flight, then automatically reverts to the real state when the action completes or fails.",
      },
      {
        id: "c91ec6a5-7dfc-4ba6-bc60-7ad616e07426",
        q: "What is the use() API?",
        a: "Reads a promise or context during render, suspending until the promise resolves. Unlike hooks, use() can be called conditionally and inside loops.",
      },
      {
        id: "0b9a20f3-c464-49aa-af66-d12a616a0bf5",
        q: "What are React Server Components (RSC)?",
        a: "Components that run only on the server and send serialized UI — not JavaScript — to the client. Zero bundle cost. 'use client' marks where the client-side world begins.",
      },
      {
        id: "8f5b43e2-13c1-4e19-9860-ae3a0b405df7",
        q: "'use client' vs 'use server' — what does each mark?",
        a: "'use client': the boundary where components ship to the browser. 'use server': marks Server Functions callable from the client — NOT server components (those are the default, no directive).",
      },
      {
        id: "b3410866-4534-4e8c-9639-42d702d8d83b",
        q: "What replaced forwardRef?",
        a: "Nothing is needed anymore: in React 19, ref is a regular prop on function components. forwardRef is deprecated and codemods remove it.",
      },
      {
        id: "53272e2f-fc1b-4c3b-81a9-b5a7f8bb3505",
        q: "How does React 19 handle <title> and <meta> tags?",
        a: "Render them anywhere in a component and React hoists them to <head> automatically — native document metadata support, plus stylesheet and async script precedence handling.",
      },
      {
        id: "6677258c-84d1-49d0-a37e-b29af3d8698f",
        q: "What is the React Compiler?",
        a: "A build-time compiler (stable 1.0, late 2025) that auto-memoizes components and values by understanding the Rules of React — retiring most manual useMemo, useCallback, and React.memo.",
      },
      {
        id: "2663d270-18df-4796-9b82-40f8870c3808",
        q: "What is the <Activity> component (19.2)?",
        a: "Wraps UI with modes 'visible' and 'hidden'. Hidden trees keep their state but unmount effects and render at low priority — ideal for tabs or pre-rendering likely-next screens.",
      },
      {
        id: "90611cf3-b857-4bdf-9ce4-1caf37da0135",
        q: "What does useEffectEvent do (19.2)?",
        a: "Extracts the 'event' part of an effect so it always reads the latest props/state without being a dependency — eliminating stale closures and effects that re-fire too often.",
      },
      {
        id: "cc64e2ec-ab6a-4b9c-94c0-3fb6ccb798f1",
        q: "Name three smaller React 19 quality-of-life changes.",
        a: "Context used directly as a provider (<MyContext> instead of .Provider), ref callbacks can return cleanup functions, and hydration errors now show a single readable diff.",
      },
      {
        id: "f1604993-898a-4907-9718-6774d854dca8",
        q: "Which headline features are still NOT stable in 19.2?",
        a: "View Transitions and Fragment Refs — real and demoed, but only in Canary/Experimental channels. Saying they're stable in an interview is a red flag.",
      },
      {
        id: "1ae833df-e286-4a1f-81f0-88cd12e1ab04",
        q: "Interview one-liner: what's the architectural theme of React 19?",
        a: "Work moves off the client and out of your hands: RSC shifts rendering to the server, Actions absorb form boilerplate, and the Compiler absorbs memoization — less JS shipped, less code to maintain.",
      },
    ],
  },
  {
    slug: "cap",
    name: "CAP theorem",
    blurb: "Partitions, trade-offs, and PACELC",
    tint: "#F7C7D6",
    ink: "#B84268",
    cards: [
      {
        id: "c2396dd8-28eb-48b2-9233-586f19161ee8",
        q: "What do the three letters in CAP stand for?",
        a: "Consistency, Availability, Partition tolerance. A distributed system can only guarantee two of the three at once.",
      },
      {
        id: "0c6c496a-d778-46d4-95e5-dce77a704b06",
        q: "CAP theorem in one sentence?",
        a: "During a network partition, a distributed system must choose between consistency and availability — it can't have both.",
      },
      {
        id: "413b6f35-7372-425c-ad31-7af99f7d14a4",
        q: "Define consistency (in CAP terms).",
        a: "Every read receives the most recent write or an error. All nodes appear to hold one up-to-date value (linearizability).",
      },
      {
        id: "23ef1803-5bc4-4aaa-a03a-4d95dcb36729",
        q: "Define availability (in CAP terms).",
        a: "Every request to a non-failing node gets a non-error response — though the data may be stale.",
      },
      {
        id: "0c82146d-ecca-4ce0-b5db-563c899d384d",
        q: "Define partition tolerance.",
        a: "The system keeps operating even when network failures split nodes into groups that can't communicate.",
      },
      {
        id: "5be1fb53-d279-4a95-840c-4b62f1d71386",
        q: "Why is 'CA' not a real choice for distributed systems?",
        a: "Network partitions are unavoidable in any real network, so P is mandatory. The actual trade-off is only C vs A during a partition.",
      },
      {
        id: "6852c674-897c-4b5f-9dfa-12a52d93619d",
        q: "Name some CP systems.",
        a: "ZooKeeper, etcd, HBase, MongoDB (default config), Google Spanner. They refuse or delay requests rather than serve stale data.",
      },
      {
        id: "7446cea3-adf7-4054-95fb-7b90ff1bf42b",
        q: "Name some AP systems.",
        a: "Cassandra, DynamoDB (default reads), CouchDB, DNS. They stay responsive and reconcile conflicts later (eventual consistency).",
      },
      {
        id: "7779d1ef-8450-4e15-b1b4-bf8adaa3c1cf",
        q: "What is PACELC?",
        a: "If Partition: choose Availability or Consistency. Else (normal operation): choose Latency or Consistency. It covers the trade-off even when the network is healthy.",
      },
      {
        id: "6b2affe0-a6c5-40ec-b212-48076c66d1a6",
        q: "When should you choose CP in a system design interview?",
        a: "When stale or conflicting data causes real harm: ticket booking, inventory, payments, auction bids, distributed locks, leader election.",
      },
      {
        id: "7dbb51f7-d566-4b73-8fb3-2afb2c490487",
        q: "When should you choose AP?",
        a: "When stale reads are harmless: feeds, like counts, view counters, profiles, analytics. Most systems default to availability.",
      },
      {
        id: "a47e2d41-b5b2-40ce-8c7a-1efb27dfd9df",
        q: "How does CAP consistency differ from ACID consistency?",
        a: "CAP consistency = linearizable reads across nodes. ACID consistency = database invariants and constraints hold after a transaction. Different concepts sharing a letter.",
      },
    ],
  },
  {
    slug: "acid",
    name: "ACID",
    blurb: "Transactions, isolation levels, and MVCC",
    tint: "#BDE8D2",
    ink: "#17805E",
    cards: [
      {
        id: "a9ab7900-2a33-4cf3-a1a0-3c4bddc356e1",
        q: "What does ACID stand for?",
        a: "Atomicity, Consistency, Isolation, Durability — the four guarantees a database makes about transactions.",
      },
      {
        id: "aa32ce1b-c803-4809-80ce-5c2a5cb72be2",
        q: "Define atomicity.",
        a: "All or nothing: a transaction either fully completes or fully rolls back. No partial effects are ever visible. It's about failure handling, not concurrency.",
      },
      {
        id: "a8edde0f-ede4-49dc-9499-8cb411e0b520",
        q: "Define consistency (in ACID terms).",
        a: "Every transaction moves the database from one valid state to another — constraints and invariants (foreign keys, uniqueness, business rules) always hold.",
      },
      {
        id: "32454677-da46-4056-9302-10893cec3bf9",
        q: "Define isolation.",
        a: "Concurrent transactions don't interfere with each other. The result is as if they had run one at a time (serially).",
      },
      {
        id: "5410ca11-cfd3-47c4-bfd2-7097c7e8a960",
        q: "Define durability.",
        a: "Once committed, data survives crashes and power loss — via write-ahead logging, fsync to disk, and (in distributed databases) replication.",
      },
      {
        id: "39cc922c-41f3-45a6-832f-fc30048acd8a",
        q: "Name the four standard isolation levels, weakest to strongest.",
        a: "Read uncommitted, read committed, repeatable read, serializable. Postgres defaults to read committed; MySQL InnoDB to repeatable read.",
      },
      {
        id: "6c8e6a1f-abf8-4ab3-8a05-807759eea946",
        q: "What is a dirty read?",
        a: "Reading another transaction's uncommitted changes, which may later roll back. Prevented by read committed and above.",
      },
      {
        id: "d24eab5a-c075-44d5-ac85-a09ca3a28336",
        q: "Non-repeatable read vs phantom read?",
        a: "Non-repeatable: a row you already read changes between two reads. Phantom: new rows matching your query appear between two reads.",
      },
      {
        id: "0184b182-5a46-46cb-8174-4d46249f086d",
        q: "How do databases implement atomicity and durability?",
        a: "The write-ahead log (WAL): changes are appended to a sequential log and fsynced before commit. Crash recovery replays the log — redo committed, undo uncommitted.",
      },
      {
        id: "372a3838-94f9-4381-ab6c-7096b0959e1e",
        q: "What is MVCC?",
        a: "Multi-version concurrency control: writers create new row versions instead of overwriting; each transaction reads a consistent snapshot. Readers never block writers.",
      },
      {
        id: "2b6fdefc-99f3-4b1a-9ce5-0f9d9d72f4b1",
        q: "What is BASE and how does it contrast with ACID?",
        a: "Basically Available, Soft state, Eventually consistent — the availability-first model of AP systems, trading strict guarantees for uptime and scale.",
      },
      {
        id: "166d2baf-03bc-4afd-8231-ed04bebb7414",
        q: "Which ACID property is the 'odd one out' and why?",
        a: "Consistency. A, I, and D are pure database mechanisms; C is a joint responsibility — the application defines what 'valid' means, the database only enforces declared constraints.",
      },
    ],
  },
  {
    slug: "solid",
    name: "SOLID",
    blurb: "Design principles, and where they cost more than they pay",
    tint: "#FAD9BE",
    ink: "#B87A3C",
    cards: [
      {
        id: "85c25f28-e385-4524-a070-2a2da625b3dc",
        q: "What does SOLID stand for, and where does it come from?",
        a: "Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion. Robert C. Martin gathered the five principles around 2000; Michael Feathers rearranged them into the acronym.",
      },
      {
        id: "40ac0587-b654-4ec3-88d7-edce72267bc6",
        q: "State the Single Responsibility Principle. What counts as a 'reason to change'?",
        a: "A module should have one, and only one, reason to change. Martin later sharpened 'reason' to mean actor - each module should answer to a single stakeholder or business function, not to a single verb.",
      },
      {
        id: "e20990c8-3dfe-4878-b7bb-e4dccacfd831",
        q: "What does an SRP violation look like in a React codebase?",
        a: "One component that fetches, transforms, formats and renders, so both an API change and a design change land in the same file. Pull data access into a hook and formatting into pure functions, leaving the component to render.",
      },
      {
        id: "793305cf-5694-4aa1-99ef-0cdb5425c475",
        q: "State the Open-Closed Principle.",
        a: "Entities should be open for extension but closed for modification: you add behaviour by adding code, not by editing code that already works and is already tested. Polymorphism and composition are the usual mechanisms.",
      },
      {
        id: "1b9229a1-0681-4758-802a-65a6e7c63718",
        q: "How would you apply OCP to a switch statement over payment providers that grows every quarter?",
        a: "Replace the switch with a registry - Record<Provider, Handler> or a strategy interface - so a new provider is a new entry rather than an edit to the dispatcher. The trade-off: you lose the exhaustive never check that forces you to handle each new case.",
      },
      {
        id: "a24980b5-d554-474b-b351-a62bc5b5d173",
        q: "State the Liskov Substitution Principle.",
        a: "A subtype must be usable anywhere its supertype is expected without breaking the program's correctness. Subtypes may weaken preconditions and strengthen postconditions, never the other way round.",
      },
      {
        id: "0dd2941c-e9b5-4ff0-b1e4-5820349205f4",
        q: "Give a classic LSP violation and explain what breaks.",
        a: "Square extending Rectangle: setting width silently mutates height, so any caller written against Rectangle's contract is wrong. The same smell is a subclass that throws NotSupported on an inherited method.",
      },
      {
        id: "31ae21b5-bcd1-4c17-9f75-d3f057bc9953",
        q: "How does TypeScript's type system relate to LSP?",
        a: "TypeScript is structurally typed, so substitutability is judged on shape rather than declared inheritance. Method-shorthand parameters stay bivariant even under strictFunctionTypes - declare them as function properties to get sound, contravariant checks.",
      },
      {
        id: "ed0ffb2a-5de7-4822-9275-7b8c2b89b8d0",
        q: "State the Interface Segregation Principle.",
        a: "No client should be forced to depend on methods it does not use. Prefer several small, role-specific interfaces to one fat one, so a change made for one consumer cannot break or rebuild the others.",
      },
      {
        id: "822e3925-cf4a-479a-866a-2acf8ae12cdc",
        q: "What does ISP look like in a TypeScript React app?",
        a: "Props typed to exactly what the component reads - Pick<User, 'id' | 'avatarUrl'> rather than the whole User - and one narrow service interface per consumer. Components then compose with partial data and are trivial to test.",
      },
      {
        id: "ac1f8401-feed-4407-9fff-3edfc2074676",
        q: "State the Dependency Inversion Principle.",
        a: "High-level policy should not depend on low-level detail; both depend on abstractions, and abstractions do not depend on details. In practice the consumer owns the interface, not the implementation.",
      },
      {
        id: "fedb9bfe-c1d1-4af6-8385-6b00b09ba177",
        q: "Distinguish DIP, dependency injection, and an IoC container.",
        a: "DIP is the design principle (depend on abstractions); DI is the technique of passing dependencies in rather than constructing them; an IoC container is tooling that wires DI for you. You can have DI without DIP, and DIP without a container.",
      },
      {
        id: "8167a727-5a80-4044-94dc-f8f75d0b8311",
        q: "How do you apply DIP in React or Next.js without a DI container?",
        a: "Pass collaborators in as props, context or arguments - a component takes getUser(): Promise<User> instead of importing fetch or the SDK directly. Tests then hand it a fake, with no module mocking or network interception.",
      },
      {
        id: "508505e2-5112-40bd-8fa1-d383825efcc4",
        q: "What are the main criticisms of SOLID?",
        a: "The wording is vague, the principles assume 1990s class-based OO, and they are easy to over-apply into indirection nobody asked for. Dan North's CUPID is one alternative, arguing for properties like composable and predictable over rules.",
      },
      {
        id: "4d7ea4cf-5878-4b62-814e-590112522a64",
        q: "How do SOLID, cohesion and coupling relate?",
        a: "SRP and ISP push toward high cohesion; OCP, LSP and DIP push toward loose coupling. Cohesion and coupling are the underlying qualities - SOLID is a set of heuristics for moving them in the right direction.",
      },
      {
        id: "d2bced86-e76a-4dc5-adf3-d4a74fb13c2f",
        q: "How should a senior engineer talk about SOLID in an interview?",
        a: "Name the axis of change you are protecting and the price you are paying, because abstraction is not free and premature indirection is its own defect. Apply DIP at a volatile boundary such as a telecom or payments provider, and skip it for a stable one.",
      },
    ],
  },
];

export const totalCards = decks.reduce((n, d) => n + d.cards.length, 0);

export function getDeck(slug: string): Deck | undefined {
  return decks.find((d) => d.slug === slug);
}

export type StudyCard = Card & { deck: Deck; index: number };

export function studySet(slug: string): StudyCard[] {
  const source = slug === "all" ? decks : decks.filter((d) => d.slug === slug);
  return source.flatMap((deck) =>
    deck.cards.map((card, index) => ({ ...card, deck, index })),
  );
}
