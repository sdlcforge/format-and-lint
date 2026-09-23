# Architecture

## Purpose and scope

This document describes fandl's internal structure: the prettier-then-ESLint processing pipeline and the flat-config component model that builds fandl's default ESLint configuration. It is aimed at contributors and AI agents who need to change or extend fandl itself, not at consumers who just want to run it — the [README](../README.md) covers installation, CLI/API usage, and the consumer-facing shape of component-based configuration. This document does not restate the [Reformatting process overview](../README.md#reformatting-process-overview) rule set (comma-dangle, operator-linebreak, brace style, and so on); it focuses on *how the pipeline and the config are built*, not the rules those pieces ultimately produce. Maintainer-facing gotchas and their full rationale live in [`DEVELOPER_NOTES.md`](../DEVELOPER_NOTES.md); this document links to the relevant entries rather than duplicating them.

## Table of contents

1. [System overview](#system-overview)
2. [Major components](#major-components)
   - [Component ordering invariant](#component-ordering-invariant)
   - [`base`](#base)
   - [`jsdoc`](#jsdoc)
   - [`tsJsdoc`](#tsjsdoc)
   - [`jsx`](#jsx)
   - [`test`](#test)
   - [`ts`](#ts)
   - [`cli`](#cli)
   - [`additional`](#additional)
3. [Key decisions](#key-decisions)
   - [`babel-ts` over prettier's `typescript` parser](#babel-ts-over-prettiers-typescript-parser)
   - [`no-undef` is off for TypeScript files](#no-undef-is-off-for-typescript-files)
   - [`ignoredNodes` and parser-version fragility](#ignorednodes-and-parser-version-fragility)
   - [`eslint-config-standard-kit`'s array is never consumed](#eslint-config-standard-kits-array-is-never-consumed)
4. [Pointers](#pointers)

## System overview

Fandl (`format-and-lint`) is a two-stage source reformatter: every input file is run through **prettier**, then through **ESLint**, and the ESLint result (or, if ESLint made no changes, the prettier result) is written back. The entry point is `formatAndLint()` in `src/lib/format-and-lint.mjs`, which resolves the input file list, builds (or accepts a pre-built) `ESLint` instance, and processes each file in parallel via `processSource()`.

```text
                         source file
                              │
                              ▼
                 ┌─────────────────────────────┐
                 │ prettier format               │
                 │  parser = 'babel-ts' for       │
                 │    .ts/.mts/.cts/.tsx          │
                 │  parser = 'babel' for           │
                 │    everything else              │
                 │  (skipped entirely when         │
                 │   check = true)                 │
                 └───────────────┬─────────────────┘
                                 │ prettier-formatted text
                                 ▼
                 ┌─────────────────────────────┐
                 │ ESLint.lintText()             │
                 │  flat-config array:            │
                 │  [base, jsdoc, tsJsdoc, jsx,   │
                 │   test, ts, cli, additional]   │
                 │  fix = true unless check=true  │
                 └───────────────┬─────────────────┘
                                 │
                                 ▼
              write back to file, unless check=true
                    or noWrite=true (or emit under
                    outputDir instead of in place)
```

For each file, `processSource()` (in `src/lib/format-and-lint.mjs`) calls `getPrettierConfigFor(file, baseConfig)` to pick the prettier parser before formatting:

```javascript
const getPrettierConfigFor = (file, baseConfig) => {
  const config = structuredClone(baseConfig)
  config.parser = tsExtSet.has(path.extname(file).toLowerCase()) ? 'babel-ts' : 'babel'
  return config
}
```

`tsExtSet` is built from `allTsExts` in `src/lib/default-config/js-extensions.mjs` — `.ts`, `.mts`, `.cts`, and `.tsx`. Every other extension fandl processes by default (`.js`, `.cjs`, `.mjs`, `.jsx`) gets prettier's plain `babel` parser. In `check` mode the prettier formatting step is skipped altogether (the raw input is fed straight to ESLint), but the parser-selection logic itself does not change.

After prettier, the (possibly unformatted, in check mode) text is passed to `eslint.lintText()` with the file path attached, so the flat config's `files` globs (see [Major components](#major-components)) match correctly. The `ESLint` instance is built with `fix: check === false`, so a normal run also applies ESLint's own autofixes; a `check` run lints without fixing. If ESLint reports no output but prettier changed the text, `processSource()` falls back to the prettier output so the two stages compose correctly either way.

The full extension vocabulary lives in `src/lib/default-config/js-extensions.mjs`:

| Group | Extensions | Constant |
|---|---|---|
| Standard JS | `.js`, `.cjs`, `.mjs` | `stdExts` |
| JSX | `.jsx` | `jsxExts` |
| TypeScript | `.ts`, `.mts`, `.cts` | `tsExts` |
| TSX | `.tsx` | `tsxExts` |
| All TypeScript (`tsExts` + `tsxExts`) | `.ts`, `.mts`, `.cts`, `.tsx` | `allTsExts` |
| JSX-like (`jsxExts` + `tsxExts`) | `.jsx`, `.tsx` | `jsxLikeExts` |
| All (`stdExts` + `jsxExts` + `allTsExts`) | `.js`, `.cjs`, `.mjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx` | `allExts` |

These groupings, not ad hoc extension lists, drive every `files`/`ignores` glob in the ESLint component config described next.

## Major components

`getEslintConfig()` in `src/lib/default-config/eslint-config.mjs` builds ESLint's flat-config array out of eight named, independently overridable components. A caller (via `formatAndLint({ eslintConfigComponents })` or `getEslintConfig()` directly) may replace any subset of them — including replacing one with `{}` to disable it — without having to redefine the rest.

### Component ordering invariant

> For a given file, when two components' `files` globs both match it, the **later** component in the returned array wins over the earlier one for any rule (or option) both define.

`getEslintConfig()` always returns the array in this fixed order:

```javascript
const eslintConfig = [base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]
```

This ordering is deliberate, not incidental, and each adjacency exists for a reason documented in the source:

- `tsJsdoc` sits directly after `jsdoc` so TypeScript-flavored JSDoc rules supersede the JavaScript JSDoc rules for TypeScript files (the JS-flavored rules impose param/return-type tags that a TS annotation already makes redundant), while both stay overridable by anything later.
- `ts` sits after `jsx` and `test` so its TypeScript-specific rule overrides win for TypeScript files regardless of whether `jsx` or `test` also matched.
- `cli` sits after `base` (and after every other named component) so its rule-relaxations win over `base`'s stricter defaults for CLI entrypoints.
- `additional` stays last unconditionally, so a caller-supplied `additional` component can override anything the built-in components set.

Keep this rule in mind before reordering, replacing, or adding a component: the position in the array — not the component's name — determines precedence.

### `base`

Default: `defaultBaseConfig`. `files`: every extension in `allExts` (`**/*{.js,.cjs,.mjs,.jsx,.ts,.mts,.cts,.tsx}`) — i.e., every file fandl processes, TypeScript included.

- Parses with `@babel/eslint-parser` (`sourceType: 'module'`, `requireConfigFile: true`, `babelOptions.configFile` pointing at fandl's bundled `babel.config.cjs`, `ecmaFeatures.jsx: true`) — the **same parser for every file**, TypeScript sources included. There is no separate TypeScript parser component; TypeScript syntax support comes from Babel's TypeScript syntax plugin via this one parser, not from `@typescript-eslint/parser`.
- Assembles the base `rules` object from `@eslint/js`'s recommended rules, the (currently inert — see [`eslint-config-standard-kit`'s array is never consumed](#eslint-config-standard-kits-array-is-never-consumed)) standard-kit spread, `@stylistic/eslint-plugin`'s recommended rules, and a long list of fandl-specific overrides (aligned-colon `key-spacing`, single-quote `quotes` with `avoidEscape`, `comma-dangle`, `operator-linebreak`, `indent` with `baseIndentOptions`, `padding-line-between-statements`, complexity/size limits, and more), then deletes several standard/stylistic rules that would otherwise conflict (`block-spacing`, `brace-style`, `comma-dangle`, `eol-last`, `indent`, `key-spacing`, `operator-linebreak`, `no-trailing-spaces`, `space-before-function-paren`, `@stylistic/indent-binary-ops`, `quote-props`).
- When `package.json` declares `engines.node`, adds `eslint-plugin-node`'s recommended rules (with a few node-specific overrides) and Node global variables — this is the only component whose composition is conditional on the *consuming* project's `package.json` rather than fixed at config-build time.

### `jsdoc`

Default: `defaultJsdocConfig`. `files`: `allExts`; `ignores`: `index.*` files, `__tests__/**`, and `*.test.*`. Applies `eslint-plugin-jsdoc`'s `flat/recommended-error` rules plus fandl overrides: `jsdoc/require-description` forced to `error`, `jsdoc/no-defaults` off (JSDoc can't reliably infer defaults from ES6 default parameters), and `jsdoc/check-tag-names` extended to allow a `category` tag (consumed by the `dmd-readme-api` README generator).

### `tsJsdoc`

Default: `defaultTsJsdocConfig`. `files`: `allTsExts` only; same `ignores` shape as `jsdoc` but scoped to TS extensions. Applies `eslint-plugin-jsdoc`'s `flat/recommended-typescript-error` rules with the same three overrides as `jsdoc`. Positioned right after `jsdoc` per the [ordering invariant](#component-ordering-invariant) so these TypeScript-appropriate JSDoc rules (which don't demand redundant `@param`/`@returns` types) win over the JS-flavored `jsdoc` rules for TypeScript files.

### `jsx`

Default: `defaultJsxConfig`. `files`: `jsxLikeExts` (`.jsx` and `.tsx`). Adds browser global variables — needed by both JSX and TSX sources alike, which is why this component (not a JSX-only one) also covers `.tsx`.

### `test`

Default: `defaultTestsConfig`. `files`: `**/__tests__/**/*` and `**/*.test{allExts}` — the directory glob now matches the same double-underscore `__tests__` convention the `jsdoc`/`tsJsdoc` components' `ignores` use (a prior single-underscore `_tests_` typo was corrected). Adds Jest global variables and relaxes size limits for test files: `max-lines-per-function` off, `max-lines` raised to 500.

### `ts`

Default: `defaultTsConfig`. `files`: `allTsExts`. Three TypeScript-specific overrides, each with source-level rationale (see [`no-undef` is off for TypeScript files](#no-undef-is-off-for-typescript-files) and [`ignoredNodes` and parser-version fragility](#ignorednodes-and-parser-version-fragility) for the details):

- `no-undef`: `off`.
- `@stylistic/key-spacing`: re-declared with `ignoredNodes: ['TSTypeLiteral', 'TSInterfaceBody', 'ClassBody']` so it stops fighting `@stylistic/type-annotation-spacing` inside TS type containers.
- `@stylistic/indent`: re-declared extending `baseIndentOptions` with `ignoredNodes` also covering `TSEnumDeclaration`, `TSEnumBody`, and `TSModuleBlock`.

Positioned after `jsx` and `test` per the [ordering invariant](#component-ordering-invariant) so these overrides win for TypeScript files no matter which of those two also matched.

### `cli`

Default: `defaultCliConfig`. `files`: anything under a `cli/` path segment, or any file whose basename ends in `-cli` (across `allExts`) — covering both the `src/lib` + `src/cli` layout convention and single-file CLI scripts that don't warrant a full lib/cli split. Turns `no-console` and `no-process-exit` off, since printing to the console and exiting with a status code is exactly what a CLI entrypoint does; both rules stay at `error` for everything else via `base`. Positioned after `base` (and after every other named component) so these relaxations win.

### `additional`

Default: `{}`. A pure caller-supplied catch-all; since it is always last in the array, anything a caller puts here overrides every built-in component for whatever files it targets.

## Key decisions

### `babel-ts` over prettier's `typescript` parser

`getPrettierConfigFor()` (see [System overview](#system-overview)) sends every TypeScript source through prettier's `babel-ts` parser, not prettier's `typescript` parser. Prettier's `typescript` parser parses via `typescript-estree`, which needs the `typescript` package resolvable at runtime; `babel-ts` parses via prettier's own bundled Babel toolchain and has no such requirement. Fandl's `package.json` declares no `typescript` dependency or devDependency at all — verified directly, not inferred — so `babel-ts` is the parser choice that keeps fandl from having to add one. This mirrors the ESLint side of the pipeline, where the [`base`](#base) component's `@babel/eslint-parser` also handles TypeScript syntax for every file (TS included) rather than switching to `@typescript-eslint/parser`; both stages stay on the Babel toolchain.

### `no-undef` is off for TypeScript files

TypeScript type identifiers — type alias names, interface names, interface member names, type parameters, enum members — are invisible to core ESLint's `no-undef`, which would otherwise report every one of them as undefined. The [`ts`](#ts) component turns `no-undef` off for `allTsExts` files; the comment at the override site in `eslint-config.mjs` states the resolution explicitly: undefined-identifier checking for TypeScript is the type checker's job, not `no-undef`'s. Fandl runs no type checker itself (see the [README's TypeScript support section](../README.md#typescript-support)), so this rule is simply out of scope rather than replaced by an equivalent. `DEVELOPER_NOTES.md`'s "Known TypeScript limitations" material (reproduced in the [README](../README.md#known-typescript-limitations)) covers the related `no-unused-vars`-vs-constructor-parameter-properties false positive, which is a deliberate trade-off of the same kind: keeping unused-argument detection on for TypeScript costs a known, documented false positive rather than silently losing that detection.

### `ignoredNodes` and parser-version fragility

Several `@stylistic/indent`/`@stylistic/key-spacing` overrides in `eslint-config.mjs` depend on exact AST node names, which makes them sensitive to the parser version in use:

- `baseIndentOptions.ignoredNodes` (shared by [`base`](#base) and extended by [`ts`](#ts)) excludes `TSUnionType`, `TSIntersectionType`, `TSTypeParameterInstantiation`, and two decorator-parameter node shapes from indent enforcement.
- The [`ts`](#ts) component's `@stylistic/key-spacing` override excludes `TSTypeLiteral`, `TSInterfaceBody`, and `ClassBody` so the aligned-colon house style (object literals) and idiomatic TypeScript type-annotation spacing (`name: string`) don't fight each other via a circular fixer loop. Per the code comment at that override, `ignoredNodes` takes a closed enum — `TSPropertySignature`/`TSIndexSignature` are not valid values and would make ESLint refuse to start, which is why the exclusion is expressed at the container level (`TSTypeLiteral`/`TSInterfaceBody`) instead.
- The [`ts`](#ts) component's `@stylistic/indent` override adds `TSEnumDeclaration`, `TSEnumBody`, and `TSModuleBlock` on top of `baseIndentOptions.ignoredNodes`. This exists because `@babel/eslint-parser` (at the `@babel/parser` 7.29.x line, per the code comment) emits a `TSEnumDeclaration` whose members hang directly off it — it emits no `TSEnumBody` node at all — so matching only `TSEnumBody` would silently fail to protect enum-body indentation from ESLint's `--fix` re-indenting it incorrectly. `TSEnumDeclaration` is therefore the entry doing the actual work today; `TSEnumBody` is kept alongside it because that is the node the Babel 8 / TS-ESTree AST shape is expected to use, and matching both costs nothing.

The pattern across all three: these `ignoredNodes` lists encode assumptions about a specific parser's AST shape, and a parser upgrade that changes that shape (e.g., a future `@babel/eslint-parser` that starts emitting `TSEnumBody`, or drops `TSEnumDeclaration`'s direct members) can silently re-break the behavior these entries protect, without any of fandl's own tests necessarily catching it if the enum-fixture coverage doesn't probe the specific shape that changed. A related, previously-residual gap in this area has since been closed: multiline `enum` bodies used to lose their trailing comma on the last member because `@stylistic/comma-dangle`'s options didn't name an `enums` node type; the `comma-dangle` config now sets `enums: 'always-multiline'` alongside `arrays`/`objects`, so that case is fixed (it remains out of scope for the `ignoredNodes` mechanism above, since `comma-dangle` and `indent` are configured independently).

### `eslint-config-standard-kit`'s array is never consumed

`eslint-config.mjs` calls `standardConfig({ prettier: true, sortImports: true, jsx: true, node: true, react: true, typescript: true })` and treats the result as `standardPlugin.rules`. As of `eslint-config-standard-kit@1.0.0`, `standardConfig()` returns a flat-config **array**, not a plugin object, so `standardPlugin.rules` is `undefined` and the `...standardPlugin.rules` spread inside [`base`](#base)'s rules object contributes nothing — none of standard-kit's rules are actually active, and the `delete rules[...]` cleanup immediately below it is deleting keys that were never added. This is a real, currently-live discrepancy in the shipped configuration, not a hypothetical.

It is deliberately left as-is. `DEVELOPER_NOTES.md`'s [`eslint-config-standard-kit`'s `typescript: true` flag is a no-op](../DEVELOPER_NOTES.md#eslint-config-standard-kits-typescript-true-flag-is-a-no-op) section spells out why: consuming the array properly would simultaneously (a) activate roughly 244 previously-inactive rules across every JavaScript source in every consumer project, and (b) activate `eslint-config-standard-kit/typescript`, which swaps TypeScript files onto `@typescript-eslint/parser` with `projectService: true` — full type-aware linting, requiring a resolvable `tsconfig.json` in every consumer project. Type-aware linting is explicitly out of scope for fandl's current TypeScript support (see [`babel-ts` over prettier's `typescript` parser](#babel-ts-over-prettiers-typescript-parser) and the [README's TypeScript support section](../README.md#typescript-support)), so fixing the array-consumption bug is a separate, sweeping change requiring its own scoping — not incidental cleanup. The same `DEVELOPER_NOTES.md` entry also notes that the `typescript: true` flag is not currently a landmine but is close to one: `standardConfig()` throws if it cannot resolve a `typescript` package, and today it resolves only because `eslint-config-standard-kit` itself declares `typescript` as a direct dependency — not because fandl does.

## Pointers

- [`README.md`](../README.md) — the consumer-facing pitch, install/CLI/API usage, the [component-based configuration](../README.md#component-based-configuration) summary (the consumer view of the [Major components](#major-components) described above), and the [reformatting process overview](../README.md#reformatting-process-overview) (the rule-level prettier-vs-ESLint style choices this document does not re-derive).
- [`DEVELOPER_NOTES.md`](../DEVELOPER_NOTES.md) — maintainer-facing gotchas in full, including the [`eslint-config-standard-kit`'s `typescript: true` flag is a no-op](../DEVELOPER_NOTES.md#eslint-config-standard-kits-typescript-true-flag-is-a-no-op) entry this document summarizes, plus unrelated build/test setup notes (the weird `@babel/plugin-proposal-*` devDependency requirement) not covered here.
