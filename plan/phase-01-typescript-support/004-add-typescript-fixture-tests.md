# Add TypeScript Fixture Tests

## Purpose and scope

Add real `.ts` and `.tsx` fixture coverage for the TypeScript support delivered by tasks 001–003 —
exercising lint detection, autofix output, and formatting idempotence — so the behavior is pinned
against regression and fandl's coverage bar (97%, per its README badge) is upheld.

Extension-list unit tests alone are not sufficient; task 001 already covers those. This task's value
is end-to-end fixtures that would catch a reintroduced `no-undef` storm, a returning circular-fix
loop, a de-indented `enum`, or a prettier parser regression.

Files in scope: new fixture directories and test files under `src/lib/default-config/test/` and
`src/lib/test/`. No production source changes.

## Requirements

### 1. Lint-detection fixtures (`src/lib/default-config/test/data/`)

Follow the existing pattern established by `non-literal-regex/`, `dangling-commas/`, and
`windows-style-newline/`: one directory per case containing an `index.<ext>` that trips a specific,
named set of rules, driven by the `test.each` table in
`src/lib/default-config/test/eslint.config.test.mjs`.

Add at least:

- **`ts-clean/index.ts`** — idiomatic TypeScript exercising type aliases, a generic `interface`, a
  generic arrow function, an `enum`, and a class with access modifiers. Expected rule IDs: **`[]`**.
  This is the single most valuable test in the plan: it is the direct regression guard for the
  `no-undef` storm, and it fails loudly if anyone removes the TypeScript config component.
- **`tsx-clean/index.tsx`** — an idiomatic React function component with a typed props `interface`
  and JSX. Expected rule IDs: **`[]`**.
- **`ts-detects-issue/index.ts`** — TypeScript that trips a genuine, existing rule so detection is
  proven to still work through the TypeScript path. Use `prefer-regex-literals` or
  `@stylistic/comma-dangle`, matching how the existing cases are written.

`eslint.config.test.mjs` globs `src/lib/default-config/test/data/${testDir}/**/*` and asserts
`results).toHaveLength(1)`, so keep exactly one file per fixture directory.

Note that the assertion is `expect(failedRules).toEqual(ruleIds)` — an exact ordered match. Run the
test to discover the real emitted order rather than guessing it.

### 2. Format/autofix fixtures (`src/lib/test/data/`)

Follow the existing pattern of `basic-indent/`, `boolean-ops/`, and `necessary-semicolon/`: an
`index.<ext>` input paired with an `index.formatted.txt` holding the expected output, consumed via
`src/test/lib/get-formatted-text-for.mjs` and the `formatTests` table in
`src/lib/test/format-and-lint.test.mjs`.

Read `src/test/lib/get-formatted-text-for.mjs` first — the existing `formatTests` entries hardcode
`index.mjs`, so the test table and/or helper will need the fixture's extension threaded through.
Extend the table shape (e.g. a third tuple element for the filename) rather than duplicating the
test body.

Add at least:

- **`ts-type-annotations/`** — the object-literal-versus-type-annotation contrast, which is the
  behavior most likely to silently regress. The expected output must show idiomatic type annotations
  alongside fandl's aligned object-literal colons:

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

- **`ts-enum-indent/`** — an `enum` whose members must come out two-space indented. This pins the
  `TSEnumBody` entry in `@stylistic/indent`'s `ignoredNodes`.
- **`tsx-component/`** — a React function component, proving the prettier `babel-ts` path and the
  `.tsx` browser-globals component together.

Generate each `index.formatted.txt` by running the real pipeline, then **read it and confirm it is
what the plan says it should be** before committing. Do not blind-snapshot a wrong result into the
expectation file.

### 3. Idempotence test

Add a test asserting that formatting an already-formatted TypeScript file is a no-op: run
`formatAndLint({ files: [f], noWrite: true })` on a fixture, then run it again on the first pass's
output, and assert the two outputs are byte-identical. Do this for at least one `.ts` and one
`.tsx` fixture.

This guards the prettier-versus-ESLint disagreements documented in the notes — prettier emits
`<T,>` for a generic arrow where `@stylistic/comma-dangle` prefers `<T>`, and prettier collapses JSX
that `@stylistic`'s JSX rules re-expand. Both were verified to converge after one pass, but they
converge by luck of rule interaction, not by design, so pin it.

### 4. Fixture placement and the standard-ignores interaction

Fixtures live under `**/test/data/**`, which `select-files-from-options.mjs`'s `standardIgnores`
excludes from fandl's own `make lint` run — deliberately, since these files contain intentional
style violations. Confirm this still holds after adding TypeScript fixtures: `make lint` must not
start reporting errors from the new fixture files.

Also confirm the new fixtures are not picked up as Jest test files (they are named `index.ts`, not
`*.test.*`, so they should not be), and that `.ts`/`.tsx` fixtures do not disturb the Jest coverage
configuration, whose `collectCoverageFrom` is `['**/*.{js,cjs,mjs,jsx}']`.

### 5. Do not modify production sources

If a fixture reveals a genuine defect in tasks 001–003, **halt and report** rather than fixing it
here. A test task that also patches the code under test hides the regression it just found.

## Validation

- `make test` passes with all new tests green.
- `make lint` passes and reports nothing from the new fixture directories.
- The `ts-clean` and `tsx-clean` fixtures assert an empty rule list and genuinely pass — verify by
  temporarily reverting the `no-undef: 'off'` override locally and confirming the test **fails**,
  then restore. A clean-fixture test that would pass either way is worthless.
- Coverage does not regress below the current level; check the `text` coverage reporter output that
  `make test` prints and compare against `qa/unit-test.txt` from before the change.
- `git status` shows only new files under `src/lib/default-config/test/` and `src/lib/test/`, plus
  the two modified test files (`eslint.config.test.mjs`, `format-and-lint.test.mjs`) and possibly
  `src/test/lib/get-formatted-text-for.mjs`. No production source under `src/lib/default-config/`
  (other than `test/`), `src/lib/lib/`, or `src/lib/format-and-lint.mjs` may appear.
- Each `index.formatted.txt` ends with a trailing newline, matching the existing fixtures.

## Assumptions

- Tasks 001, 002, and 003 have all landed. This task cannot meaningfully run before them: without
  003 prettier throws on any TypeScript input, and without 002 every TypeScript fixture produces
  dozens of spurious diagnostics.
- The existing JavaScript fixtures and their expected outputs are correct and must not be edited.

## References

- [TypeScript rule conflicts and verified resolution](../notes/typescript-rule-conflicts.md) — the
  exact expected output for the type-annotation contrast fixture, and the enum-indent behavior.
- [TypeScript parsing layer](../notes/typescript-parsing-layer.md) — the round-trip stability
  findings that requirement 3 pins.
- `src/lib/default-config/test/eslint.config.test.mjs` and `src/lib/test/format-and-lint.test.mjs` —
  the two test tables to extend.
- `src/test/lib/get-formatted-text-for.mjs`, `src/test/lib/copy-dir-to-tmp.mjs` — existing fixture
  helpers.

## Checkpoint hints

- After adding the lint-detection fixtures and extending `eslint.config.test.mjs`.
- After threading the fixture extension through the `format-and-lint.test.mjs` table and helper.
- After adding the format/autofix fixtures and their `.formatted.txt` expectations.
- After adding the idempotence test.

## Status

**Outcome:** succeeded — 2026-08-07.

Added 8 new fixture-driven tests (34 → 42 total), all green, with no changes to production
source. `git diff --stat` against the pre-task HEAD shows exactly the file set the Validation
section predicted.

- Lint-detection (`src/lib/default-config/test/data/`): `ts-clean/index.ts`, `tsx-clean/index.tsx`,
  `ts-detects-issue/index.ts`, wired into
  `src/lib/default-config/test/eslint.config.test.mjs`'s `lintTests` table.
- Format/autofix (`src/lib/test/data/`): `ts-type-annotations/`, `ts-enum-indent/`,
  `tsx-component/`, each with a generated-and-verified `index.formatted.txt` (trailing newline
  confirmed), wired into `src/lib/test/format-and-lint.test.mjs`'s `formatTests` table via a new
  third tuple element (filename), defaulting to `'index.mjs'` for the pre-existing rows.
  `src/test/lib/get-formatted-text-for.mjs` needed no change — its extension-replacement regex was
  already extension-agnostic.
- Idempotence: two new `test.each` cases in `format-and-lint.test.mjs` (one `.ts`, one `.tsx`) that
  run `formatAndLint` twice — once on the raw fixture, once on the first pass's output written to a
  tmp file — and assert byte-identical results.

**Deviation from the plan note, per the dispatch's carried-forward correction:** the `ts-enum-indent`
fixture pins `TSEnumDeclaration` in `@stylistic/indent`'s `ignoredNodes` (what tasks 002/003 actually
shipped), not `TSEnumBody` as `plan/notes/typescript-rule-conflicts.md` still says. Verified by
temporarily removing `'TSEnumDeclaration'` from the shipped `ignoredNodes` list (leaving
`'TSEnumBody'` in place) and confirming the `ts-enum-indent` format test fails; restored afterward
with a clean `git status`.

**Validation performed:**
- `make test` — 10 suites / 42 tests passed. Coverage held or improved versus the pre-task baseline
  captured before any fixtures were added (all-files stmts 96.95%→96.95%, branch 75.86%→76.72%,
  funcs 96.15%→96.15%, lines 96.85%→96.85%; `format-and-lint.mjs` branch coverage rose from 78.78%
  to 81.81% thanks to the idempotence tests exercising the no-op path).
- `make lint` — clean, zero reported issues; confirms `standardIgnores` (`**/test/data/**/*`) still
  excludes the new fixtures from fandl's own dogfooding lint pass.
- `ts-clean`/`tsx-clean` genuinely pin the fix: temporarily flipping `no-undef` back to `'error'` in
  `eslint-config.mjs` reproduced the historical `no-undef` storm on both fixtures (confirmed via a
  throwaway scratch test, not committed); restored afterward with a clean `git status`.
- Confirmed the new `index.ts`/`index.tsx`/`index.formatted.txt` fixture files are not picked up as
  Jest test files (suite count stayed at 10) and do not appear in the coverage table (Jest's
  `collectCoverageFrom` is `['**/*.{js,cjs,mjs,jsx}']`, which does not match `.ts`/`.tsx`).
- `git diff --stat` against the pre-task HEAD (`5aa3f72`) touches only the two test files
  (`eslint.config.test.mjs`, `format-and-lint.test.mjs`) plus new fixture files under
  `src/lib/default-config/test/data/` and `src/lib/test/data/` — no production source.

**Files touched (repo-relative):**
- `src/lib/default-config/test/eslint.config.test.mjs`
- `src/lib/default-config/test/data/ts-clean/index.ts`
- `src/lib/default-config/test/data/tsx-clean/index.tsx`
- `src/lib/default-config/test/data/ts-detects-issue/index.ts`
- `src/lib/test/format-and-lint.test.mjs`
- `src/lib/test/data/ts-type-annotations/index.ts`
- `src/lib/test/data/ts-type-annotations/index.formatted.txt`
- `src/lib/test/data/ts-enum-indent/index.ts`
- `src/lib/test/data/ts-enum-indent/index.formatted.txt`
- `src/lib/test/data/tsx-component/index.tsx`
- `src/lib/test/data/tsx-component/index.formatted.txt`

**Assumptions applied:** tasks 001–003 landed as prerequisites (confirmed by inspecting the merged
`eslint-config.mjs`/`js-extensions.mjs`/`format-and-lint.mjs`); existing JavaScript fixtures were
left untouched.

No defects found in tasks 001–003's implementation; nothing to halt-and-report on requirement 5.
