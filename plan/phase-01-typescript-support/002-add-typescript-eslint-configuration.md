# Add TypeScript Eslint Configuration

## Purpose and scope

Add TypeScript-scoped ESLint configuration to `src/lib/default-config/eslint-config.mjs` so that
idiomatic `.ts`/`.mts`/`.cts`/`.tsx` sources lint cleanly with fandl's existing rule set, and expose
the new configuration through the documented component-based configuration API.

This is the crux of the plan. Extending the extension whitelist alone (task 001) produces an
unusable result: `no-undef` fires on every type identifier, `@stylistic/key-spacing` and
`@stylistic/type-annotation-spacing` enter a circular fixer loop, `enum` bodies get de-indented, and
JSDoc rules demand types that the annotations already carry. The exact resolution below was verified
end to end against real fixtures — see
[TypeScript rule conflicts and verified resolution](../notes/typescript-rule-conflicts.md).

Only `src/lib/default-config/eslint-config.mjs` is in scope. No standard skill covers this; follow
the `## Requirements` below, which prescribe the configuration precisely.

## Requirements

### 1. Import the new extension exports

Line 27 currently reads `import { allExtsStr, jsxExtsStr } from './js-extensions'`. Import
`allTsExtsStr` and `jsxLikeExtsStr` as well (task 001 adds them). `jsxExtsStr` may become unused
once requirement 4 lands — remove it from the import if so.

### 2. Add a TypeScript config component

Add a `defaultTsConfig` object scoped to `files: [`` `**/*{${allTsExtsStr}}` ``]`, carrying exactly
these three rule overrides and no others:

```js
const defaultTsConfig = {
  files : [`**/*{${allTsExtsStr}}`],
  rules : {
    // TypeScript type identifiers (type aliases, interface names, type parameters, enum members,
    // interface member names) are invisible to core 'no-undef', which reports every one of them as
    // undefined. Disabling it for TS files is the standard resolution; the TypeScript compiler is
    // the right tool for that check.
    'no-undef'               : 'off',
    // Our aligned-colon 'key-spacing' override collides head-on with the @stylistic
    // 'type-annotation-spacing' rule inside TS type containers, producing a circular fixer loop.
    // Excluding the TS containers leaves 'type-annotation-spacing' in sole control of type
    // annotations while 'key-spacing' keeps full control of object literals -- so TS sources get
    // idiomatic `name: string` annotations and fandl's aligned `name : 'value'` object literals.
    // NOTE: 'ignoredNodes' takes a closed enum; 'TSPropertySignature'/'TSIndexSignature' are NOT
    // valid values and make ESLint refuse to start.
    '@stylistic/key-spacing' : ['error', {
      align        : 'colon',
      afterColon   : true,
      beforeColon  : true,
      ignoredNodes : ['TSTypeLiteral', 'TSInterfaceBody', 'ClassBody'],
    }],
    '@stylistic/indent'      : [/* see below */],
  },
}
```

For `@stylistic/indent`, reuse the **exact** options object the base `rules` already specifies (the
`['error', 2, { ArrayExpression: 1, ... }]` entry at `eslint-config.mjs` lines 98–123), with
`'TSEnumBody'` and `'TSModuleBlock'` appended to its `ignoredNodes` array. Do not retype the options
by hand — hoist the base indent options into a named `const` at module scope, use it in the base
`rules` entry, and spread-with-extended-`ignoredNodes` in the TS component. This keeps the two in
sync when the base options change.

Rationale for the indent change: without it, ESLint `--fix` rewrites prettier's correctly-indented
`enum Color {\n  Red,\n  Green,\n}` to `enum Color {\nRed,\nGreen\n}`.

### 3. Add a TypeScript JSDoc config component

`defaultJsdocConfig` builds on `jsdocPlugin.configs['flat/recommended-error'].rules`, which includes
`jsdoc/require-param-type` and `jsdoc/require-returns-type` — meaningless demands against a TS
function whose annotations already carry the types.

Add a `defaultTsJsdocConfig` mirroring `defaultJsdocConfig`'s shape but scoped to TypeScript and
built on `jsdocPlugin.configs['flat/recommended-typescript-error'].rules`:

```js
const defaultTsJsdocConfig = {
  files   : [`**/*{${allTsExtsStr}}`],
  ignores : [`**/index{${allTsExtsStr}}`, '**/__tests__/**/*', '**/*.test.*'],
  plugins : { jsdoc : jsdocPlugin },
  rules   : {
    ...jsdocPlugin.configs['flat/recommended-typescript-error'].rules,
    'jsdoc/require-description' : 'error',
    'jsdoc/no-defaults'         : 'off',
    'jsdoc/check-tag-names'     : ['error', { definedTags : ['category'] }],
  },
}
```

`defaultJsdocConfig` itself must stay scoped to `allExtsStr` as it is today; the TypeScript
component is appended **after** it in the returned array, so its rules win for TypeScript files.
`flat/recommended-typescript-error` is confirmed present in the installed
`eslint-plugin-jsdoc@^62.9.0`.

### 4. Widen the browser-globals component to cover TSX

`defaultJsxConfig` currently matches `` [`**/*{${jsxExtsStr}}`] `` — `.jsx` only. Change it to
`` [`**/*{${jsxLikeExtsStr}}`] `` so `.tsx` files also receive `globals.browser`. Rename nothing:
the component stays named `jsx` in `getEslintConfig`'s options for backward compatibility, since
`README.md` documents that name.

### 5. Add TypeScript extensions to the import resolver

At `eslint-config.mjs` line 266, the `babel-module` import resolver is configured with
`extensions: ['.js', '.jsx', '.es', '.es6', '.mjs', '.cjs']`. Add `'.ts'`, `'.mts'`, `'.cts'`, and
`'.tsx'`. Without this, `import { helper } from './helper'` resolving to `helper.ts` raises
`import/no-unresolved` (verified).

### 6. Wire the new components into `getEslintConfig`

```js
const getEslintConfig = ({
  additional = {},
  base       = defaultBaseConfig,
  jsdoc      = defaultJsdocConfig,
  jsx        = defaultJsxConfig,
  test       = defaultTestsConfig,
  ts         = defaultTsConfig,
  tsJsdoc    = defaultTsJsdocConfig,
} = {}) => [base, jsdoc, tsJsdoc, jsx, test, ts, additional]
```

Ordering is load-bearing and must be exactly as shown. `ts` comes after `test` so its rule overrides
win for TypeScript files (a later flat-config entry with a matching `files` glob overrides an
earlier one), and `additional` stays last so callers can still override everything. `tsJsdoc` goes
directly after `jsdoc` so the TypeScript JSDoc rules supersede the JavaScript ones for TS files
while remaining overridable by the later components.

### 7. Record the `eslint-config-standard-kit` finding as a code comment

Add a comment at the `standardConfig({ ... })` call site (lines 49–56) recording that
`eslint-config-standard-kit@1.0.0` returns a **flat-config array**, not a plugin object — so
`standardPlugin.rules` is `undefined`, the spread at line 75 contributes nothing, none of
standard-kit's 244 rules are actually in effect, and the `delete rules[...]` block below is deleting
keys that were never added. Note that repairing this would both activate 244 previously-inactive
rules across all JavaScript sources and switch TypeScript files onto `@typescript-eslint/parser`
with `projectService: true` (full type-aware linting), so it is a deliberate, separately-scoped
decision.

**Add the comment only. Do not change the `standardConfig` call, do not remove `typescript: true`,
and do not repair the array consumption.** See
[the standard-kit note](../notes/standard-kit-typescript-flag.md).

### 8. Do not add TypeScript-specific dependencies

No `@typescript-eslint/parser`, no `@typescript-eslint/eslint-plugin`, no `typescript` in
`package.json`. `@babel/eslint-parser` with fandl's shipped Babel config already parses every
TypeScript construct tested (see [TypeScript parsing layer](../notes/typescript-parsing-layer.md));
the Babel layer needs no change at all.

### 9. Known limitation to leave in place

`no-unused-vars` reports a false positive on TypeScript constructor parameter properties
(`constructor(public name: string)` reports `'name' is defined but never used` even when `this.name`
is used). **Do not add `args: 'none'` to the TS component.** The recommended policy is to preserve
fandl's deliberate unused-argument detection (the intent recorded at lines 196–197) and document the
limitation, which task 005 does. Flag it in your report so the maintainer can revisit.

## Validation

- `make test` passes, including the existing `src/lib/default-config/test/eslint.config.test.mjs`
  unchanged — the JavaScript rule set must be byte-for-byte unaffected.
- `make lint` passes on fandl's own sources.
- Construct a scratch verification (not committed) that runs `getEslintConfig()` through an `ESLint`
  instance with `fix: true` against these three inputs, pre-formatted with prettier `parser:
  'babel-ts'`, and confirm **zero diagnostics other than the genuine ones noted**:

  ```ts
  // fixture A (.ts)
  export type Id = string | number
  export interface Thing<T> { id: Id; payload: T }
  export const make = <T>(id: Id, payload: T): Thing<T> => ({ id, payload })
  ```

  ```tsx
  // fixture B (.tsx)
  interface Props { name: string; count?: number }
  export const Greeting = ({ name, count = 0 }: Props) => <div className="greeting">{name}{count}</div>
  ```

  ```ts
  // fixture C (.ts) -- object literal alignment must survive
  interface Config { hostName: string; aVeryLongPortName?: number }
  export const defaults: Config = { hostName: 'localhost', aVeryLongPortName: 8080 }
  ```

  Expected fixed output for fixture C, exactly:

  ```ts
  interface Config {
    hostName: string
    aVeryLongPortName?: number
  }

  export const defaults: Config = {
    hostName          : 'localhost',
    aVeryLongPortName : 8080,
  }
  ```

  Note the contrast: idiomatic `hostName: string` in the interface, aligned `hostName          :`
  in the object literal. That contrast is the whole point of the `ignoredNodes` choice; if both come
  out the same way, the configuration is wrong.
- **No `ESLintCircularFixesWarning` on stderr** for any TypeScript fixture. This warning is the
  primary regression signal for this task — treat any occurrence as a failure, not a nuisance.
- An `enum Color { Red, Green }` fixture retains two-space-indented members after `--fix`.
- A local import resolving to a `.ts` sibling produces no `import/no-unresolved`.
- ESLint starts successfully — a bad `ignoredNodes` value causes a schema validation failure at
  `lintText` time, not at config construction, so a config that "looks fine" can still be invalid.
- `grep -n "typescript" src/lib/default-config/eslint-config.mjs` shows the `standardConfig` call
  still passes `typescript : true` unchanged, with the new explanatory comment adjacent.
- `git diff --stat` shows exactly one changed file: `src/lib/default-config/eslint-config.mjs`.

## Metadata

architectural_impact: true

## Assumptions

- Task 001 has landed, so `allTsExtsStr` and `jsxLikeExtsStr` are exported from
  `src/lib/default-config/js-extensions.mjs`.
- Task 003 (prettier parser selection) may not have landed yet — it is parallel-eligible with this
  task. Your scratch verification must therefore call prettier with `parser: 'babel-ts'` explicitly
  rather than going through `formatAndLint`, which still hardcodes `parser: 'babel'` and will fail
  on any TypeScript input until 003 lands.
- `eslint-plugin-jsdoc@^62.9.0`, `@stylistic/eslint-plugin@5.10.0`, and `eslint@^9.12.0` are
  installed as pinned in `package-lock.json`.

## References

- [TypeScript rule conflicts and verified resolution](../notes/typescript-rule-conflicts.md) — the
  full failure catalogue, the two rejected alternatives, and the verified `ignoredNodes` enum.
- [TypeScript parsing layer](../notes/typescript-parsing-layer.md) — why no parser or Babel change
  is needed, and the `import/no-unresolved` finding.
- [`eslint-config-standard-kit` and its `typescript: true` flag](../notes/standard-kit-typescript-flag.md)
  — the content for requirement 7's comment and why the defect is out of scope.

## Checkpoint hints

- After hoisting the shared `@stylistic/indent` options into a named const and confirming the
  existing test suite still passes (a pure refactor with no behavior change).
- After adding `defaultTsConfig` and `defaultTsJsdocConfig`.
- After the `defaultJsxConfig` widening and the import-resolver extension additions.
- After wiring `getEslintConfig` and adding the standard-kit comment.

## Status

**Outcome: succeeded** — 2026-08-07.

All nine requirements implemented in `src/lib/default-config/eslint-config.mjs` (the only source file
changed). No dependencies added; `package.json` and `package-lock.json` are untouched.

### Validation summary

| Check | Result |
|---|---|
| `make test` (existing suite unchanged) | passed — 10 suites, 34 tests |
| `make lint` on fandl's own sources | passed |
| Scratch verification, 9 TS/TSX/MTS/CTS fixtures | passed — zero remaining diagnostics after `--fix` |
| No `ESLintCircularFixesWarning` | passed — 0 occurrences |
| Fixture C byte-exact vs the expected output above | passed |
| `enum Color { Red, Green }` retains 2-space members | passed (see deviation below) |
| Local import resolving to a `.ts` sibling | passed — no `import/no-unresolved` |
| ESLint starts (no `ignoredNodes` schema failure) | passed |
| `grep -n "typescript"` — `typescript : true` unchanged | passed, comment adjacent |
| `git diff --stat` — one source file | passed |

The scratch verification also confirmed the JavaScript rule set is unaffected: for a `.mjs` file
`no-undef` is still `error`, `@stylistic/key-spacing` still carries no `ignoredNodes`, and
`@stylistic/indent`'s `ignoredNodes` still holds exactly the original five entries. Every fixture was
run through three full prettier→ESLint passes and was byte-stable from pass 1.

### One deviation from `## Requirements` (requirement 2)

Requirement 2 prescribed appending `'TSEnumBody'` and `'TSModuleBlock'` to the indent `ignoredNodes`.
**`'TSModuleBlock'` is correct and verified.** `'TSEnumBody'` is not: `@babel/eslint-parser` (with
`@babel/parser@7.29.2`) emits a `TSEnumDeclaration` whose `TSEnumMember`s hang off it directly and
emits **no `TSEnumBody` node at all**, so that selector never matches and the enum body was still
de-indented to `enum Color {\nRed,\nGreen\n}` — failing this task's own `## Validation` criterion.

`'TSEnumDeclaration'` was added alongside the two prescribed entries; that is the entry that actually
does the work. `'TSEnumBody'` was retained (it is the Babel 8 / TS-ESTree AST shape and costs nothing
to also match), and the discrepancy is recorded as a code comment at the rule. This is the smallest
change that satisfies the requirement's own stated rationale and the validation criterion together.

### Notes for the maintainer

- **Known limitation left in place as instructed (requirement 9).** `no-unused-vars` still reports
  `'name' is defined but never used` for `constructor(public name: string)`. Reproduced and confirmed;
  `args : 'none'` was deliberately **not** added. Task 005 documents it.
- **`@stylistic/comma-dangle` strips the trailing comma from multiline `enum` bodies.** fandl's
  `comma-dangle` options name `arrays`/`objects`/`imports`/`exports`/`functions` but not `enums`, so
  `enums` falls back to the rule default of `'never'`; prettier emits `Green,` and ESLint removes it.
  File content is byte-stable across passes, so this is cosmetic only, and requirement 2 restricted
  the TS component to exactly three rules — so it was left alone. Worth a follow-up if the
  `always-multiline` house style should extend to enums.
- The `<T,>`/`<T>` prettier-vs-ESLint disagreement documented in the parsing-layer note was
  reproduced and is stable, as predicted.
