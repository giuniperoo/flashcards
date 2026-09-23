# TypeScript 5.8-7.0
tint: #CAD3F2
blurb: Releases, migration gotchas and what's next

id: 36560cec-d8b8-4c87-a4c4-251caecfb8fa
Q: When did TypeScript 5.8, 5.9, 6.0 and 7.0 ship?
A: 5.8 on February 28, 2025; 5.9 on August 1, 2025; 6.0 on March 23, 2026; 7.0 on July 8, 2026. The team expects to return to featureful releases every 3-4 months after 7.0.

id: 1a9f8837-47fd-4a22-8801-273a713f4749
Q: What is TypeScript 7.0 - and what did it deliberately not change?
A: A faithful port of the compiler and language service to Go, with type-checking logic structurally identical to 6.0, so no new type system. Microsoft reports typical 8-12x faster full builds (7.7x-11.9x on its benchmark repos) using less memory.

id: c5641be1-503d-4cda-b1df-cd6213ada69e
Q: How does TypeScript 7 use multiple cores, and what would you set in CI?
A: Experimental --checkers (default 4) runs parallel type-checkers and --builders parallelizes project-reference builds; they multiply, so 4 x 4 allows 16 checkers. On small CI runners lower --checkers to save memory, and pin one value everywhere because checker count can rarely change results.

id: 19cff139-825b-4f1c-8cd9-132385e4d551
Q: Which tsconfig defaults changed in 6.0 and carry into 7.0?
A: strict true, module esnext, target floating to the latest stable ES year (es2025 now), noUncheckedSideEffectImports on, libReplacement off, rootDir = the tsconfig's folder, types = []. Anything that relied on the old implicit values must now say so explicitly.

id: f39d0975-4ad7-4cf5-adf3-fa923cf30460
Q: After upgrading to 6.0 you get "Cannot find name 'process'" and "Cannot find name 'describe'". Why, and what's the fix?
A: types now defaults to [], so @types packages are no longer auto-loaded as globals - list them, e.g. "types": ["node", "jest"]. "types": ["*"] restores the old behaviour, but an explicit list is faster (the team saw 20-50% build-time wins).

id: 3ede1a69-3b97-4091-b892-23297eb5bda8
Q: After upgrading, your build emits dist/src/index.js instead of dist/index.js. What happened?
A: rootDir used to be inferred from the common source folder; since 6.0 it defaults to the directory containing tsconfig.json. Set "rootDir": "./src" to restore the old output layout.

id: 0d3a8992-5664-412a-beda-511caf888e3c
Q: What did 6.0 deprecate that 7.0 turns into hard errors?
A: target es5 and downlevelIteration, moduleResolution node10 and classic, module amd/umd/systemjs/none, baseUrl, outFile, esModuleInterop / allowSyntheticDefaultImports / alwaysStrict set to false, module-keyword namespaces and import asserts. Replacements: bundler or nodenext resolution, esnext or preserve modules, and with for import attributes.

id: 7f9ab071-96ca-4da5-8382-448f4ff521f5
Q: Your Next.js tsconfig has baseUrl: "." and paths { "@/*": ["src/*"] }. What changes for 6.0/7.0?
A: baseUrl is deprecated and no longer a module-lookup root, so delete it and make each paths entry relative: "@/*": ["./src/*"]. Bare imports that only resolved via baseUrl need an explicit "*": ["./src/*"] mapping or a rewrite to @/.

id: 33dc3048-438d-46ff-b841-8da90696bcf5
Q: What does "ignoreDeprecations": "6.0" do, and why is 6.0 called the bridge release?
A: It silences 6.0's deprecation errors so a project keeps building on old options. 6.0 is the last JavaScript-based compiler, built to surface 7.0's removals as warnings first - the flag buys time, but 7.0 removes those options outright.

id: 42b50981-9920-4870-ba9e-fb1b68218d10
Q: Why can't every project move to TypeScript 7.0 yet?
A: 7.0 ships without a programmatic API, so tools that import the compiler - typed typescript-eslint rules, bundler loaders, Volar for Vue/Svelte/Astro/MDX, Angular template checking - still need 6.0. A stable API is the headline of 7.1.

id: 94de8bec-36b1-4514-9c6a-48a8d5f7ea63
Q: How do you run TypeScript 6 and 7 side by side?
A: Alias typescript to @typescript/typescript6 (it ships a tsc6 binary and re-exports the 6.0 API, so typescript-eslint keeps working) and install 7.0 under a second alias such as @typescript/native, whose tsc is 7.0.

id: 1577912c-a819-4d47-9ae1-f3ac79d184ae
Q: What is planned for TypeScript 7.1, and when?
A: The 7.1 iteration plan targets beta October 6, RC November 10 and stable November 24, 2026. Headlines: a stable API (language service, emit), es2026 target and lib, and type on import attributes - a plan, not a promise.

id: d805fc6e-8fdb-45a2-b5ca-f42115292ecf
Q: What is import defer (5.9)?
A: import defer * as ns from "./m" loads a module but postpones running it until an export is first accessed, cutting startup cost for rarely used code. Only namespace imports are allowed, under --module preserve or esnext.

id: a2d80053-92da-48a3-b265-6546c25690a7
Q: Why do --module node18 (5.8) and node20 (5.9) exist alongside nodenext?
A: nodenext floats with current Node behaviour - e.g. allowing require() of ES modules, as Node 22 does. node18 and node20 pin one Node version's module semantics so builds stay reproducible.

id: ba71b7d6-4194-48cc-8f50-ff0154573852
Q: What is --erasableSyntaxOnly (5.8) for?
A: It errors on TypeScript syntax that emits runtime code - enums, namespaces with values, parameter properties, import = aliases - so files run under Node's type stripping, which only deletes types. Set it if you run .ts files directly with node.

id: b4dad803-a465-4944-8c30-6bcf09740a42
Q: What bug does 5.8's return-expression check catch?
A: In return cond ? a : b, each branch is now checked against the declared return type instead of their combined union. Previously an any in one branch swallowed a wrongly typed value in the other.
