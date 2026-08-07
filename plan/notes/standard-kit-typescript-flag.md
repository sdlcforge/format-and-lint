# `eslint-config-standard-kit` and its `typescript: true` Flag

## Purpose and scope

Answers investigation question 1: does `standardConfig({ ..., typescript: true })` in
`src/lib/default-config/eslint-config.mjs` already provide usable TypeScript rules or parser wiring?

**Answer: no. It is a complete no-op, and it has been for reasons unrelated to TypeScript.**

## The finding

`eslint-config-standard-kit@1.0.0` exports a function that returns a **flat-config array**, not a
plugin object. Verified against the installed package:

```
typeof: object   isArray: true   length: 6
names: [ 'eslint-config-standard-kit',
         'eslint-config-standard-kit/node',
         'eslint-config-standard-kit/jsx',
         'eslint-config-standard-kit/react',
         'eslint-config-standard-kit/sortImports',
         'eslint-config-standard-kit/typescript' ]
rule counts: 108, 7, 23, 8, 1, 97
```

`eslint-config.mjs` consumes it as a single object:

```js
const standardPlugin = standardConfig({ prettier : true, sortImports : true, jsx : true, node : true, react : true, typescript : true })
// ...
const plugins = Object.assign({ standard : standardPlugin, /* ... */ }, stylisticConfig.plugins)
const rules = { ...js.configs.recommended.rules, ...standardPlugin.rules, ...stylisticConfig.rules, /* ... */ }
```

`standardPlugin.rules` on an array is `undefined`, and spreading `undefined` is a silent no-op.
**None of standard-kit's 244 rules reach fandl's effective configuration** — not the 108 base
Standard.js rules, not the JSX rules, not the React rules, not the 97 TypeScript rules. The block of
`delete rules['block-spacing']` / `delete rules['brace-style']` / etc. immediately below is
deleting keys that were never added.

`plugins.standard` is set to an array rather than a plugin object. This is inert in practice — no
rule ID in fandl's config is namespaced `standard/`, so ESLint never dereferences it, and the
configuration loads and runs without error. Verified: the full config runs clean against JS and TS
fixtures.

This is almost certainly fallout from the `eslint-config-standard-kit` 0.x → 1.0.0 upgrade, where
the export shape changed from a plugin-like object to a flat-config array.

## Consequences for this plan

1. **`typescript: true` cannot be relied on for anything.** It supplies no parser and no rules to
   fandl today. TypeScript support has to be built from the Babel parser plus fandl's own rule
   overrides, which is what the plan does.
2. **Do not "fix" the array consumption as part of this work.** Merging the array in properly would
   simultaneously (a) introduce 244 previously-inactive rules across all JavaScript sources — a
   sweeping, unrelated behavior change for every existing consumer — and (b) activate
   `eslint-config-standard-kit/typescript`, whose config is
   `{ files: ['**/*.ts','**/*.tsx','**/*.mts','**/*.cts'], languageOptions: { parser:
   @typescript-eslint/parser, parserOptions: { projectService: true } } }`. `projectService: true`
   is **type-aware linting**: it would replace the Babel parser on TS files, require a resolvable
   `tsconfig.json` in every consumer project, and pull the TypeScript type checker into every lint
   run. The change request puts type-aware linting explicitly out of scope, and it is not cheap to
   add.
3. **`typescript: true` is not currently a landmine, but it is close to one.** `standardConfig`
   throws `Cannot find TypeScript. Please run npm install --save-dev typescript` when `typescript`
   cannot be required. It resolves today only because `eslint-config-standard-kit` declares
   `typescript` as a direct dependency (`npm ls typescript` confirms `eslint-config-standard-kit@1.0.0
   └── typescript@5.8.3`). fandl itself declares no `typescript` dependency. If standard-kit ever
   demotes it to a peer dependency, `eslint-config.mjs` would throw at import time.

## Recommended action in this plan

Add a code comment at the `standardConfig(...)` call site recording that the return value is an
array whose rules are not currently merged, so the next maintainer does not "fix" it without
understanding the blast radius. Nothing else. The underlying defect is worth a separate follow-up
item, tracked by the manager rather than folded into TypeScript support.
