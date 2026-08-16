export type Card = { q: string; a: string };

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
        q: "In one line, what is Gigs?",
        a: "The operating system for embedded telecom: it lets any app or brand launch and run its own mobile service - eSIMs, plans, data - without becoming a carrier itself.",
      },
      {
        q: "What umbrella name covers the whole Gigs stack?",
        a: "Gigs OS. The individual products (API, Connect, Payments, Operator, Dashboard) are the building blocks; use-case bundles repackage them for different markets.",
      },
      {
        q: "Gigs distinguishes 'customer' from 'user'. Who is each?",
        a: "The customer is the business integrating Gigs, e.g. a fintech app. The user is that customer's own end subscriber - the person who buys and manages a phone plan.",
      },
      {
        q: "What is the relationship between user and customer?",
        a: "The user already has an account and trust with the customer, often with payment details on file. The customer layers telecom on top; Gigs powers it underneath.",
      },
      {
        q: "What is the Gigs API, and why is it foundational?",
        a: "A single developer-friendly telecom API connecting you to multiple carriers across markets. Everything else is built on it - you integrate once instead of striking deals carrier by carrier.",
      },
      {
        q: "Name the core things the Gigs API handles.",
        a: "eSIM provisioning, subscriptions and plans, number porting in and out, and usage analytics - all across multiple carriers and markets.",
      },
      {
        q: "What is Gigs Connect?",
        a: "The white-label hosted user-facing layer: a branded storefront and account dashboard where users sign up, pay, activate their SIM and manage their plan, with no code required from the customer.",
      },
      {
        q: "What is a Connect Session?",
        a: "A session generated via the API and enriched with a specific intent - view eSIM installation, buy data, cancel - dropping the user straight into that flow rather than a generic interface.",
      },
      {
        q: "What problem do Connect Links solve?",
        a: "They serve customers who cannot handle their own authentication. The link sends a one-time code to the user's email, verifies it, then creates an authenticated session, so Gigs carries the auth burden.",
      },
      {
        q: "Walk the Connect Link auth flow at a high level.",
        a: "User opens link; Gigs issues a one-time code to their email; user enters it; Gigs verifies and resolves the user ID; a Connect Session is created with that user and payload; user is redirected to the session's url.",
      },
      {
        q: "What does Connect cover across a plan's lifecycle?",
        a: "Hosted checkout, authentication, plan management and data usage, buying data and add-ons, switching or upgrading plans, cancelling, and eSIM install instructions.",
      },
      {
        q: "What is Gigs Payments?",
        a: "The billing engine baked into the platform - the financial plumbing beneath the service: payment acceptance, recurring billing and money handling built for telecom.",
      },
      {
        q: "What makes Payments telecom-specific rather than a generic processor?",
        a: "Telecom tax calculation and remittance. Phone plans are taxed in jurisdiction-specific ways, so it calculates the right tax, collects it, and forwards it to the authorities.",
      },
      {
        q: "What does 'remittance' mean here?",
        a: "Actually sending owed money on to whoever it is owed to - forwarding collected tax to the government in the right amount, jurisdiction and schedule. Distinct from merely calculating it.",
      },
      {
        q: "What is Gigs Operator?",
        a: "Customer-service AI built for telecom: a chatbot that embeds real UI components inside the chat thread, so users can self-serve their goal in-line rather than being talked at.",
      },
      {
        q: "What can Operator do beyond answering questions?",
        a: "Conversational sales (suggesting a plan), KYC identity verification, plan management such as buying roaming or data and switching plans, and troubleshooting that actually resolves the issue.",
      },
      {
        q: "Two operational features that make Operator production-ready?",
        a: "It works in 100+ languages, and it escalates to human support based on the sentiment and complexity of a request - handing off when it is out of its depth.",
      },
      {
        q: "What is the Gigs Dashboard, and who uses it?",
        a: "The operational cockpit for the customer's own team, not the end user: real-time oversight of subscriptions, customers, payments, vouchers, devices and analytics, unified across carriers and markets.",
      },
      {
        q: "What is an eSIM, and why does it matter for embedded telecom?",
        a: "A SIM built into the device and provisioned over the air by downloading a profile. With no plastic to ship, a plan can be sold and activated inside an app in seconds - which is what makes embedded telecom viable.",
      },
      {
        q: "What is an MVNO, and how does it relate to Gigs?",
        a: "A mobile virtual network operator sells mobile service under its own brand on someone else's radio network. Gigs' customers get that outcome without building and running the operator themselves.",
      },
      {
        q: "Why is number porting operationally hard?",
        a: "Porting means coordinating with the carrier losing the number, matching the subscriber's account details exactly, and surviving a cutover window where the line can break. Small data mismatches cause most failures.",
      },
      {
        q: "What is KYC, and why does telecom need it?",
        a: "Know Your Customer: verifying a subscriber's identity, which regulators require in many markets before a line can be activated. It puts a compliance check in the middle of an otherwise smooth signup flow.",
      },
      {
        q: "What stack does the Gigs product engineer role use?",
        a: "Next.js, React, TypeScript and Tailwind CSS, with both frontend and backend built on Next.js. Also named in the ad: REST APIs, Docker, GCP, GitHub Actions, Cypress or Testing Library, and some Ruby on Rails.",
      },
      {
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
        q: "What is the latest React version, and is 'React 20' real?",
        a: "React 19.2 (19.0 shipped Dec 2024; 19.2 landed Oct 2025). No React 20 exists. React is now stewarded by the independent React Foundation under the Linux Foundation.",
      },
      {
        q: "What are Actions in React 19?",
        a: "Async functions passed to a transition or form. React automatically manages the pending state, error handling, optimistic updates, and form resets you used to hand-write.",
      },
      {
        q: "What does useActionState do?",
        a: "Wraps an action and returns [state, formAction, isPending] — replacing hand-rolled loading/error/result state for submissions. Pass formAction straight to <form action={...}>.",
      },
      {
        q: "What does useFormStatus do?",
        a: "Lets a child component read the status (pending, data) of its nearest parent <form> — like context for forms. Classic use: a submit button that disables itself.",
      },
      {
        q: "What does useOptimistic do?",
        a: "Shows a temporary 'optimistic' value while an async action is in flight, then automatically reverts to the real state when the action completes or fails.",
      },
      {
        q: "What is the use() API?",
        a: "Reads a promise or context during render, suspending until the promise resolves. Unlike hooks, use() can be called conditionally and inside loops.",
      },
      {
        q: "What are React Server Components (RSC)?",
        a: "Components that run only on the server and send serialized UI — not JavaScript — to the client. Zero bundle cost. 'use client' marks where the client-side world begins.",
      },
      {
        q: "'use client' vs 'use server' — what does each mark?",
        a: "'use client': the boundary where components ship to the browser. 'use server': marks Server Functions callable from the client — NOT server components (those are the default, no directive).",
      },
      {
        q: "What replaced forwardRef?",
        a: "Nothing is needed anymore: in React 19, ref is a regular prop on function components. forwardRef is deprecated and codemods remove it.",
      },
      {
        q: "How does React 19 handle <title> and <meta> tags?",
        a: "Render them anywhere in a component and React hoists them to <head> automatically — native document metadata support, plus stylesheet and async script precedence handling.",
      },
      {
        q: "What is the React Compiler?",
        a: "A build-time compiler (stable 1.0, late 2025) that auto-memoizes components and values by understanding the Rules of React — retiring most manual useMemo, useCallback, and React.memo.",
      },
      {
        q: "What is the <Activity> component (19.2)?",
        a: "Wraps UI with modes 'visible' and 'hidden'. Hidden trees keep their state but unmount effects and render at low priority — ideal for tabs or pre-rendering likely-next screens.",
      },
      {
        q: "What does useEffectEvent do (19.2)?",
        a: "Extracts the 'event' part of an effect so it always reads the latest props/state without being a dependency — eliminating stale closures and effects that re-fire too often.",
      },
      {
        q: "Name three smaller React 19 quality-of-life changes.",
        a: "Context used directly as a provider (<MyContext> instead of .Provider), ref callbacks can return cleanup functions, and hydration errors now show a single readable diff.",
      },
      {
        q: "Which headline features are still NOT stable in 19.2?",
        a: "View Transitions and Fragment Refs — real and demoed, but only in Canary/Experimental channels. Saying they're stable in an interview is a red flag.",
      },
      {
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
        q: "What do the three letters in CAP stand for?",
        a: "Consistency, Availability, Partition tolerance. A distributed system can only guarantee two of the three at once.",
      },
      {
        q: "CAP theorem in one sentence?",
        a: "During a network partition, a distributed system must choose between consistency and availability — it can't have both.",
      },
      {
        q: "Define consistency (in CAP terms).",
        a: "Every read receives the most recent write or an error. All nodes appear to hold one up-to-date value (linearizability).",
      },
      {
        q: "Define availability (in CAP terms).",
        a: "Every request to a non-failing node gets a non-error response — though the data may be stale.",
      },
      {
        q: "Define partition tolerance.",
        a: "The system keeps operating even when network failures split nodes into groups that can't communicate.",
      },
      {
        q: "Why is 'CA' not a real choice for distributed systems?",
        a: "Network partitions are unavoidable in any real network, so P is mandatory. The actual trade-off is only C vs A during a partition.",
      },
      {
        q: "Name some CP systems.",
        a: "ZooKeeper, etcd, HBase, MongoDB (default config), Google Spanner. They refuse or delay requests rather than serve stale data.",
      },
      {
        q: "Name some AP systems.",
        a: "Cassandra, DynamoDB (default reads), CouchDB, DNS. They stay responsive and reconcile conflicts later (eventual consistency).",
      },
      {
        q: "What is PACELC?",
        a: "If Partition: choose Availability or Consistency. Else (normal operation): choose Latency or Consistency. It covers the trade-off even when the network is healthy.",
      },
      {
        q: "When should you choose CP in a system design interview?",
        a: "When stale or conflicting data causes real harm: ticket booking, inventory, payments, auction bids, distributed locks, leader election.",
      },
      {
        q: "When should you choose AP?",
        a: "When stale reads are harmless: feeds, like counts, view counters, profiles, analytics. Most systems default to availability.",
      },
      {
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
        q: "What does ACID stand for?",
        a: "Atomicity, Consistency, Isolation, Durability — the four guarantees a database makes about transactions.",
      },
      {
        q: "Define atomicity.",
        a: "All or nothing: a transaction either fully completes or fully rolls back. No partial effects are ever visible. It's about failure handling, not concurrency.",
      },
      {
        q: "Define consistency (in ACID terms).",
        a: "Every transaction moves the database from one valid state to another — constraints and invariants (foreign keys, uniqueness, business rules) always hold.",
      },
      {
        q: "Define isolation.",
        a: "Concurrent transactions don't interfere with each other. The result is as if they had run one at a time (serially).",
      },
      {
        q: "Define durability.",
        a: "Once committed, data survives crashes and power loss — via write-ahead logging, fsync to disk, and (in distributed databases) replication.",
      },
      {
        q: "Name the four standard isolation levels, weakest to strongest.",
        a: "Read uncommitted, read committed, repeatable read, serializable. Postgres defaults to read committed; MySQL InnoDB to repeatable read.",
      },
      {
        q: "What is a dirty read?",
        a: "Reading another transaction's uncommitted changes, which may later roll back. Prevented by read committed and above.",
      },
      {
        q: "Non-repeatable read vs phantom read?",
        a: "Non-repeatable: a row you already read changes between two reads. Phantom: new rows matching your query appear between two reads.",
      },
      {
        q: "How do databases implement atomicity and durability?",
        a: "The write-ahead log (WAL): changes are appended to a sequential log and fsynced before commit. Crash recovery replays the log — redo committed, undo uncommitted.",
      },
      {
        q: "What is MVCC?",
        a: "Multi-version concurrency control: writers create new row versions instead of overwriting; each transaction reads a consistent snapshot. Readers never block writers.",
      },
      {
        q: "What is BASE and how does it contrast with ACID?",
        a: "Basically Available, Soft state, Eventually consistent — the availability-first model of AP systems, trading strict guarantees for uptime and scale.",
      },
      {
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
        q: "What does SOLID stand for, and where does it come from?",
        a: "Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion. Robert C. Martin gathered the five principles around 2000; Michael Feathers rearranged them into the acronym.",
      },
      {
        q: "State the Single Responsibility Principle. What counts as a 'reason to change'?",
        a: "A module should have one, and only one, reason to change. Martin later sharpened 'reason' to mean actor - each module should answer to a single stakeholder or business function, not to a single verb.",
      },
      {
        q: "What does an SRP violation look like in a React codebase?",
        a: "One component that fetches, transforms, formats and renders, so both an API change and a design change land in the same file. Pull data access into a hook and formatting into pure functions, leaving the component to render.",
      },
      {
        q: "State the Open-Closed Principle.",
        a: "Entities should be open for extension but closed for modification: you add behaviour by adding code, not by editing code that already works and is already tested. Polymorphism and composition are the usual mechanisms.",
      },
      {
        q: "How would you apply OCP to a switch statement over payment providers that grows every quarter?",
        a: "Replace the switch with a registry - Record<Provider, Handler> or a strategy interface - so a new provider is a new entry rather than an edit to the dispatcher. The trade-off: you lose the exhaustive never check that forces you to handle each new case.",
      },
      {
        q: "State the Liskov Substitution Principle.",
        a: "A subtype must be usable anywhere its supertype is expected without breaking the program's correctness. Subtypes may weaken preconditions and strengthen postconditions, never the other way round.",
      },
      {
        q: "Give a classic LSP violation and explain what breaks.",
        a: "Square extending Rectangle: setting width silently mutates height, so any caller written against Rectangle's contract is wrong. The same smell is a subclass that throws NotSupported on an inherited method.",
      },
      {
        q: "How does TypeScript's type system relate to LSP?",
        a: "TypeScript is structurally typed, so substitutability is judged on shape rather than declared inheritance. Method-shorthand parameters stay bivariant even under strictFunctionTypes - declare them as function properties to get sound, contravariant checks.",
      },
      {
        q: "State the Interface Segregation Principle.",
        a: "No client should be forced to depend on methods it does not use. Prefer several small, role-specific interfaces to one fat one, so a change made for one consumer cannot break or rebuild the others.",
      },
      {
        q: "What does ISP look like in a TypeScript React app?",
        a: "Props typed to exactly what the component reads - Pick<User, 'id' | 'avatarUrl'> rather than the whole User - and one narrow service interface per consumer. Components then compose with partial data and are trivial to test.",
      },
      {
        q: "State the Dependency Inversion Principle.",
        a: "High-level policy should not depend on low-level detail; both depend on abstractions, and abstractions do not depend on details. In practice the consumer owns the interface, not the implementation.",
      },
      {
        q: "Distinguish DIP, dependency injection, and an IoC container.",
        a: "DIP is the design principle (depend on abstractions); DI is the technique of passing dependencies in rather than constructing them; an IoC container is tooling that wires DI for you. You can have DI without DIP, and DIP without a container.",
      },
      {
        q: "How do you apply DIP in React or Next.js without a DI container?",
        a: "Pass collaborators in as props, context or arguments - a component takes getUser(): Promise<User> instead of importing fetch or the SDK directly. Tests then hand it a fake, with no module mocking or network interception.",
      },
      {
        q: "What are the main criticisms of SOLID?",
        a: "The wording is vague, the principles assume 1990s class-based OO, and they are easy to over-apply into indirection nobody asked for. Dan North's CUPID is one alternative, arguing for properties like composable and predictable over rules.",
      },
      {
        q: "How do SOLID, cohesion and coupling relate?",
        a: "SRP and ISP push toward high cohesion; OCP, LSP and DIP push toward loose coupling. Cohesion and coupling are the underlying qualities - SOLID is a set of heuristics for moving them in the right direction.",
      },
      {
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
