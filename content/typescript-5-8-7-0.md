# TypeScript 5.8-7.0
tint: #CAD3F2
blurb: Releases, dates, breaking changes and what's next

id: 36560cec-d8b8-4c87-a4c4-251caecfb8fa
Q: When did TypeScript 5.8, 5.9, 6.0 and 7.0 ship?
A: 5.8 on 28 Feb 2025, 5.9 on 1 Aug 2025, 6.0 on 23 Mar 2026 and 7.0 on 8 Jul 2026. The 5.x line ran on a roughly 3-month cadence; 6.0 and 7.0 arrived four months apart in 2026.

id: 1a9f8837-47fd-4a22-8801-273a713f4749
Q: What is TypeScript 7.0, and why is it a landmark release?
A: It is the compiler and language service ported from JavaScript to Go, released 8 Jul 2026. Microsoft measured 7.7x-11.9x faster builds on real codebases with 6-26% lower memory use.

id: 93a025f0-b6df-4153-8773-53d6f611032f
Q: Is TypeScript 7 a new language or type system?
A: No - it is a port, not a redesign. The syntax, type system and checking semantics are the same as 6.0; what changed is the implementation, the supported config surface and the tooling around it.

id: c5641be1-503d-4cda-b1df-cd6213ada69e
Q: How does TypeScript 7 use multiple cores?
A: New --checkers flag (default 4) runs type-checking across parallel workers and --builders parallelises project-reference builds; --singleThreaded turns parallelism off.

id: 3ce72215-5be1-46f8-9319-49ceb655f045
Q: What happened to tsc's watch mode and editor support in 7.0?
A: --watch was rebuilt on a Go port of Parcel's file watcher, and the language server was rewritten on LSP - over 80% fewer failing commands and 60% fewer server crashes than 6.0.

id: 19cff139-825b-4f1c-8cd9-132385e4d551
Q: Which tsconfig defaults changed on the way to 7.0?
A: strict is now true, module defaults to esnext, target to es2025 (6.0), rootDir to the tsconfig's own directory, and types to an empty array.

id: f39d0975-4ad7-4cf5-adf3-fa923cf30460
Q: Why does "types": [] as a default break so many projects?
A: Previously every package under node_modules/@types was auto-included. Now you must list them explicitly, e.g. "types": ["node"], or globals like process and __dirname stop resolving.

id: 0d3a8992-5664-412a-beda-511caf888e3c
Q: What did TypeScript 6.0 deprecate?
A: target es5, downlevelIteration, moduleResolution node10 and classic, module amd/umd/system/none, baseUrl, outFile, esModuleInterop false, legacy module namespace syntax and import assert.

id: 33dc3048-438d-46ff-b841-8da90696bcf5
Q: What does "ignoreDeprecations": "6.0" do?
A: It downgrades 6.0's deprecation errors back to warnings so a project can keep building on the old options - an escape hatch for migration, not a long-term setting, since 7.0 removes them outright.

id: 04e9a4ea-7122-4511-8789-2eefe56af5bb
Q: Why did TypeScript 6.0 exist at all?
A: It is the bridge release: the last JavaScript-based compiler, whose job was to surface 7.0's breaking changes as deprecations while you were still on the familiar codebase.

id: 67c35cf7-9d5f-43f9-bc8e-2ec358fcfcf9
Q: Which options are gone for good in TypeScript 7.0?
A: target es5 and downlevelIteration, moduleResolution node10/classic, module amd/umd/systemjs/none, baseUrl, and esModuleInterop or allowSyntheticDefaultImports set to false.

id: d9bd7254-8f89-4cc3-82e0-84651025c365
Q: How did TypeScript 7 change checking of plain JavaScript files?
A: JS support was tightened to match TS rules: values can no longer stand in for types, Closure-style annotations are no longer recognised, and postfix ! is unsupported.

id: 5299219e-b8dc-4ba5-888a-bfbd8d32de2e
Q: Can Vue, Svelte, Angular, Astro or MDX use TypeScript 7 today?
A: Not yet. Embedded-language tooling depends on the compiler API, which is only stabilised in 7.1 - until then those frameworks stay on the 6.0 toolchain.

id: a4727286-ba89-414a-8c17-aac9ce14d717
Q: What was tsgo, and what does TypeScript 7 ship as now?
A: tsgo was the preview executable in the @typescript/native-preview package. Stable 7.0 ships in the normal typescript package and is invoked as tsc.

id: 94de8bec-36b1-4514-9c6a-48a8d5f7ea63
Q: How do you run TypeScript 6 and 7 side by side?
A: Install the @typescript/typescript6 compatibility package, which lets both compilers coexist without name collisions while you migrate parts of a repo.

id: 14ce4da3-676e-46d0-b2d2-429a5098d129
Q: What is planned for TypeScript 7.1, and when?
A: Per the published iteration plan: beta 9 Sep 2026, RC 20 Oct, stable 10 Nov 2026. Headline item is the stable programmatic API, plus ES2026 lib/target and type on import attributes.

id: 42b50981-9920-4870-ba9e-fb1b68218d10
Q: Why does the missing programmatic API in 7.0 matter?
A: Everything built on the old JS compiler API - typed ESLint rules, ts-jest, bundler plugins, framework language tooling - cannot target the Go compiler until 7.1 stabilises that API.

id: cadcffef-ab0d-4672-93b4-11d139a00262
Q: What release cadence has the team signalled after 7.0?
A: A return to the pre-7.0 rhythm: featureful releases roughly every 3-4 months.

id: d805fc6e-8fdb-45a2-b5ca-f42115292ecf
Q: What is import defer, added in 5.9?
A: Syntax like import defer * as ns from "./m" loads a module but delays evaluating it until one of its exports is actually touched - a startup-cost optimisation. 5.9 added the type-checking for it.

id: 007ee4bd-0a15-4966-af4b-3afac5e73e63
Q: Why did 5.9 add --module node20 when nodenext exists?
A: nodenext floats: its behaviour shifts as Node evolves. node20 pins the semantics of Node 20 so builds stay reproducible, exactly as node18 did in 5.8.

id: c2e93e14-6681-4bfa-a073-3bbaf2aef407
Q: What else did 5.9 bring to everyday DX?
A: A much leaner, more prescriptive tsc --init output, MDN-sourced summaries on DOM APIs, and expandable +/- quick-info hovers with a configurable length limit.

id: ba71b7d6-4194-48cc-8f50-ff0154573852
Q: What is --erasableSyntaxOnly (5.8) for?
A: It errors on TypeScript constructs that emit runtime code - enums, namespaces, parameter properties - so the file is valid under Node's type-stripping, where types are simply erased.

id: b4dad803-a465-4944-8c30-6bcf09740a42
Q: What return-type bug did 5.8 start catching?
A: For a conditional expression in a return statement, each branch is now checked against the declared return type, instead of only the union-ed result.

id: a2d80053-92da-48a3-b265-6546c25690a7
Q: What did 5.8 change about requiring ESM?
A: Under --module nodenext, require() of an ES module is allowed, matching Node 22. The new --module node18 keeps the older rules for projects still on Node 18.
