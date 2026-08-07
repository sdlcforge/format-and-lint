# Add TypeScript Prettier Parser Selection

## Purpose and scope

Make fandl select prettier's parser per file rather than hardcoding it, so TypeScript sources are
formatted with a TypeScript-capable parser.

`src/lib/format-and-lint.mjs` line 73 sets `prettierParseConfig.parser = 'babel'` unconditionally.
Prettier's `babel` parser cannot parse TypeScript — every `.ts` and `.tsx` input fails with
`Unexpected token` (verified). Because prettier runs *before* ESLint in fandl's pipeline, this is a
hard blocker independent of anything in the ESLint layer.

Only `src/lib/format-and-lint.mjs` is in scope. No standard skill covers this; follow the
`## Requirements` below.

## Requirements

### 1. Use `babel-ts` for TypeScript, `babel` for everything else

Map file extension to prettier parser:

| Extension | Parser |
|---|---|
| `.ts`, `.mts`, `.cts`, `.tsx` | `babel-ts` |
| everything else | `babel` (unchanged) |

Derive the TypeScript extension set from `allTsExts` in `src/lib/default-config/js-extensions.mjs`
(task 001 adds it) rather than writing a literal list — the point of that module is to be the single
source of truth.

`babel-ts` is the required choice over prettier's `typescript` parser. Both produced byte-identical
output on every fixture tested, but `babel-ts` is `@babel/parser`-backed (already bundled with
prettier, consistent with the `@babel/eslint-parser` used on the ESLint side), whereas the
`typescript` parser would make fandl depend on the `typescript` package, which fandl does not
declare and which is present today only as a transitive dependency of
`eslint-config-standard-kit`.

### 2. Move the parser decision to where the file path is known

The current structure blocks this: `formatAndLint` builds `prettierParseConfig` once, before
iterating files, while only `processSource` receives the individual `file`. Restructure so the
parser is chosen per file. Either approach is acceptable:

- Pass the parser-free cloned config down and set `parser` inside `processSource` from its `file`
  argument; or
- Pass a small `getPrettierConfigFor(file)` closure down.

Constraints on the restructure:

- `formatAndLint`'s public signature and its JSDoc block (lines 10–41) must not change. The
  `prettierConfig` option keeps its current meaning: a caller-supplied prettier options object whose
  `parser` fandl overrides.
- `structuredClone(prettierConfig)` must still be used so a caller's object is never mutated. If the
  clone moves into the per-file path, be aware it now runs once per file rather than once per call —
  acceptable for the config object's size, but do not clone inside a tight inner loop beyond that.
- `processSource`'s existing behavior — the `check`/`noWrite`/`outputDir`/`relativeStem` handling,
  and the "prettier changed it but ESLint didn't" `output` backfill at lines 96–98 — must be
  untouched.

### 3. Extension matching must be robust

Match on the file's lowercased extension, not a substring. A file named `notes.ts.bak` must **not**
select `babel-ts`, and a file with no extension must fall through to `babel`. Use
`node:path.extname` rather than `String.endsWith` chains.

### 4. Do not change the ESLint side

`getEslint` and the ESLint config are task 002's scope. This task touches prettier only.

## Validation

- `make test` passes; every existing test in `src/lib/test/format-and-lint.test.mjs` passes
  unmodified. Those tests exercise `.mjs` fixtures and prove the JavaScript path is unchanged.
- `make lint` passes.
- Scratch verification (not committed): calling `formatAndLint({ files: [<a .ts file>], noWrite:
  true })` and `formatAndLint({ files: [<a .tsx file>], noWrite: true })` completes without throwing
  a prettier parse error. Before this task, both throw `Unexpected token`.
- Scratch verification that a mixed `files` array containing both a `.mjs` and a `.ts` file in one
  call formats both correctly — this is the case the restructure most easily breaks, since the old
  code computed one parser for the whole call.
- Confirm `notes.ts.bak` (or similar) resolves to `babel`, not `babel-ts`.
- `git diff --stat` shows exactly one changed file: `src/lib/format-and-lint.mjs`.
- The `formatAndLint` JSDoc block is unchanged: `git diff src/lib/format-and-lint.mjs` shows no
  modification to lines within the `/** ... */` above the function.

## Assumptions

- Task 001 has landed, so `allTsExts` is exported from `src/lib/default-config/js-extensions.mjs`.
- Task 002 (ESLint configuration) may not have landed yet — it is parallel-eligible with this task.
  Until it does, running `formatAndLint` on a TypeScript file will get past prettier and then
  produce a large number of ESLint diagnostics (`no-undef` on every type identifier, and possibly an
  `ESLintCircularFixesWarning`). **That is expected at this point and is not a defect in your
  change.** Verify only that prettier no longer throws; do not attempt to fix the ESLint noise.

## References

- [TypeScript parsing layer](../notes/typescript-parsing-layer.md) — the parser comparison table,
  the `babel-ts` versus `typescript` rationale, and the verified round-trip stability of
  prettier-then-ESLint on TypeScript sources.
- `src/lib/default-config/prettier.config.mjs` — the default prettier options object that
  `parser` is layered onto; `@trivago/prettier-plugin-sort-imports` was verified to work unchanged
  with `babel-ts`.

## Status

- **Outcome:** succeeded
- **Date:** 2026-08-07
- **Summary:** Added a `getPrettierConfigFor(file, baseConfig)` helper in `src/lib/format-and-lint.mjs`
  that clones the caller's prettier config and sets `parser` to `babel-ts` when
  `path.extname(file).toLowerCase()` is in the set derived from `allTsExts`
  (`src/lib/default-config/js-extensions.mjs`), and to `babel` otherwise. `formatAndLint` no longer
  eagerly clones/forces `parser = 'babel'` before iterating files; it passes the caller's
  `prettierConfig` (or the default) through unchanged, and `processSource` calls
  `getPrettierConfigFor` per file, immediately before the prettier call — this both keeps each
  concurrent `processSource` invocation's config object independent (`Promise.all` runs them
  concurrently, so a single shared mutable clone risked a data race on `.parser`) and satisfies the
  task's "clone moves into the per-file path" allowance. `formatAndLint`'s public signature and its
  JSDoc block (original lines 10–41) are unchanged; `processSource`'s `check`/`noWrite`/`outputDir`/
  `relativeStem` handling and the prettier/ESLint `output` backfill are untouched.
- **Validation:**
  - `make test`: passed (10 suites / 34 tests, including the pre-existing
    `src/lib/test/format-and-lint.test.mjs` suite unmodified).
  - `make lint`: passed (no findings).
  - Scratch verification (not committed, deleted before finalizing): a temporary Jest test
    confirmed (1) a `.ts` fixture (interface, typed props, generic arrow function) and (2) a `.tsx`
    fixture (JSX + typed props) both format without a prettier parse error via `formatAndLint({
    noWrite: true })`; (3) a mixed `[.mjs, .ts]` `files` array in one call formats both entries
    correctly (the concurrency case the restructure most easily breaks); (4) a `notes.ts.bak` fixture
    containing bare TS generic syntax **throws** under `formatAndLint`, confirming it resolved to the
    `babel` parser (not `babel-ts`) — i.e., extension matching does not fall for the substring/suffix
    trap.
  - `git diff --stat`: exactly one file changed, `src/lib/format-and-lint.mjs`.
  - `git diff src/lib/format-and-lint.mjs`: confirmed no modification to lines within the original
    `formatAndLint` JSDoc block.
- **Assumptions applied:** Task 001's `allTsExts` export was present and used as the single source of
  extension truth (per `## Assumptions`). Task 002 had not landed in this worktree at implementation
  time; per the task's `## Assumptions`, this was not treated as a defect — only the prettier-side
  parse-success validation was performed, and ESLint diagnostics on TS syntax were not investigated.
- **Files touched:** `src/lib/format-and-lint.mjs`.
