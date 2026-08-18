# Gigs
order: 1
tint: #CBDDF2
ink: #5E86AE
blurb: Embedded telecom, Connect, and the product surface

id: 5d05a4ca-0997-4d89-96d9-94b745869a7d
Q: In one line, what is Gigs?
A: The operating system for embedded telecom: it lets any app or brand launch and run its own mobile service - eSIMs, plans, data - without becoming a carrier itself.

id: 480097ab-3505-4bf0-a0ff-4084eea9b8b2
Q: What umbrella name covers the whole Gigs stack?
A: Gigs OS. The individual products (API, Connect, Payments, Operator, Dashboard) are the building blocks; use-case bundles repackage them for different markets.

id: 072b38b5-a658-48fa-bc50-a14fd69379ca
Q: Gigs distinguishes 'customer' from 'user'. Who is each?
A: The customer is the business integrating Gigs, e.g. a fintech app. The user is that customer's own end subscriber - the person who buys and manages a phone plan.

id: 8a700f21-a95e-4954-91ea-9cd71d43eb0a
Q: What is the relationship between user and customer?
A: The user already has an account and trust with the customer, often with payment details on file. The customer layers telecom on top; Gigs powers it underneath.

id: 97cd237b-31cb-46c1-ba7d-637ae6092f82
Q: What is the Gigs API, and why is it foundational?
A: A single developer-friendly telecom API connecting you to multiple carriers across markets. Everything else is built on it - you integrate once instead of striking deals carrier by carrier.

id: a7400ad5-2169-4a6c-bc26-682af25d6fcd
Q: Name the core things the Gigs API handles.
A: eSIM provisioning, subscriptions and plans, number porting in and out, and usage analytics - all across multiple carriers and markets.

id: b0f40d5d-bbb8-461c-bc42-c7c991675358
Q: What is Gigs Connect?
A: The white-label hosted user-facing layer: a branded storefront and account dashboard where users sign up, pay, activate their SIM and manage their plan, with no code required from the customer.

id: 4ed3c19d-8f20-4f33-9632-5ea5f3becea8
Q: What is a Connect Session?
A: A session generated via the API and enriched with a specific intent - view eSIM installation, buy data, cancel - dropping the user straight into that flow rather than a generic interface.

id: 377d0ffd-a774-4d3f-8e6e-8d2a7fd7250e
Q: What problem do Connect Links solve?
A: They serve customers who cannot handle their own authentication. The link sends a one-time code to the user's email, verifies it, then creates an authenticated session, so Gigs carries the auth burden.

id: e9a54f7c-dbda-42fe-8537-a7d6d3b5d9ce
Q: Walk the Connect Link auth flow at a high level.
A: User opens link; Gigs issues a one-time code to their email; user enters it; Gigs verifies and resolves the user ID; a Connect Session is created with that user and payload; user is redirected to the session's url.

id: e57dbd8e-e70d-4bcb-ba33-bed6280dee34
Q: What does Connect cover across a plan's lifecycle?
A: Hosted checkout, authentication, plan management and data usage, buying data and add-ons, switching or upgrading plans, cancelling, and eSIM install instructions.

id: 8ed6f861-eaa7-4de4-8fa1-9d3924523d0a
Q: What is Gigs Payments?
A: The billing engine baked into the platform - the financial plumbing beneath the service: payment acceptance, recurring billing and money handling built for telecom.

id: 022d88ad-346f-452a-af34-eb004b006907
Q: What makes Payments telecom-specific rather than a generic processor?
A: Telecom tax calculation and remittance. Phone plans are taxed in jurisdiction-specific ways, so it calculates the right tax, collects it, and forwards it to the authorities.

id: a4d97dbc-dcad-4e02-9860-cd4d71af78a6
Q: What does 'remittance' mean here?
A: Actually sending owed money on to whoever it is owed to - forwarding collected tax to the government in the right amount, jurisdiction and schedule. Distinct from merely calculating it.

id: 4419209c-a206-4c87-9730-2ddb90078aec
Q: What is Gigs Operator?
A: Customer-service AI built for telecom: a chatbot that embeds real UI components inside the chat thread, so users can self-serve their goal in-line rather than being talked at.

id: 179d3088-7680-43c6-b46e-869ff0f89230
Q: What can Operator do beyond answering questions?
A: Conversational sales (suggesting a plan), KYC identity verification, plan management such as buying roaming or data and switching plans, and troubleshooting that actually resolves the issue.

id: 598106b4-f4c1-4f76-b3a9-36b2b278fc74
Q: Two operational features that make Operator production-ready?
A: It works in 100+ languages, and it escalates to human support based on the sentiment and complexity of a request - handing off when it is out of its depth.

id: 52250b98-92cd-493c-bab0-9ae8b777fd25
Q: What is the Gigs Dashboard, and who uses it?
A: The operational cockpit for the customer's own team, not the end user: real-time oversight of subscriptions, customers, payments, vouchers, devices and analytics, unified across carriers and markets.

id: 87d26a1e-121a-4362-98ac-562b6355ecf0
Q: What is an eSIM, and why does it matter for embedded telecom?
A: A SIM built into the device and provisioned over the air by downloading a profile. With no plastic to ship, a plan can be sold and activated inside an app in seconds - which is what makes embedded telecom viable.

id: 630550d2-ad6e-46d3-808d-e0170c74c54a
Q: What is an MVNO, and how does it relate to Gigs?
A: A mobile virtual network operator sells mobile service under its own brand on someone else's radio network. Gigs' customers get that outcome without building and running the operator themselves.

id: 22457219-4d5d-47f0-a96a-1a02ae7d2361
Q: Why is number porting operationally hard?
A: Porting means coordinating with the carrier losing the number, matching the subscriber's account details exactly, and surviving a cutover window where the line can break. Small data mismatches cause most failures.

id: 32afec61-9465-4fc2-9241-87227935ece4
Q: What is KYC, and why does telecom need it?
A: Know Your Customer: verifying a subscriber's identity, which regulators require in many markets before a line can be activated. It puts a compliance check in the middle of an otherwise smooth signup flow.

id: 684ce748-4876-4426-aa47-64604dc82045
Q: What stack does the Gigs product engineer role use?
A: Next.js, React, TypeScript and Tailwind CSS, with both frontend and backend built on Next.js. Also named in the ad: REST APIs, Docker, GCP, GitHub Actions, Cypress or Testing Library, and some Ruby on Rails.

id: f3e7fc2f-4d4f-429b-857a-6baa2f34cb32
Q: What scale is Gigs operating at?
A: Around 150 people across the US and Europe, backed by close to $100m from Ribbit Capital, Google and Y Combinator. Connect is the consumer-facing product this role builds.
