# Docs And Ordering Test

## Purpose and scope

Update the documentation that names `eslint-config.mjs`, and add small regression tests for assembly order. Runs after task 004 so the real file layout exists. Documentation-only plus one test file; no source changes under `src/lib/default-config/eslint-components/`.

## Requirements

### Docs

Module layout is as in the [plan overview](../overview.md). Edit these (find exact lines with `grep -n "eslint-config" docs/architecture.md DEVELOPER_NOTES.md`; line numbers below are approximate):

- `docs/architecture.md` around line 90: keep that `getEslintConfig()` in `src/lib/default-config/eslint-config.mjs` is the public assembler of eight named components, and add a short note (or small table) that each component now lives in `src/lib/default-config/eslint-components/<name>.mjs`, with shared state in `shared.mjs`, the indent options in `indent-options.mjs`, and the base rules table in `base-rules.mjs`.
- Around line 116 (`base` description): mention `base-rules.mjs` and `base.mjs`.
- Around line 161: "the comment at the override site in `eslint-config.mjs`" now refers to `eslint-components/ts.mjs`.
- Around line 165: the `@stylistic/indent`/`@stylistic/key-spacing` overrides are in `eslint-components/base-rules.mjs` and `eslint-components/ts.mjs`.
- Around lines 173-177 (`eslint-config-standard-kit`'s array is never consumed): the `standardConfig(...)` call and `...standardPlugin.rules` spread are in `eslint-components/base-rules.mjs`; the `delete rules[...]` cleanup is also there.
- `DEVELOPER_NOTES.md` around line 27: `eslint-config.mjs` calls `standardConfig` becomes `eslint-components/base-rules.mjs` (and mention the CAUTION comment lives there). Check the rest of that section for any other `eslint-config.mjs` reference.
- Leave `plan/summary.md` and `plan/plan-summary-typescript-support.md` alone (historical).
- Also note in the architecture doc, in one sentence, that the babel-config resolution (installed `dist/babel/` path and dev fallback) lives in `shared.mjs`, if the doc discusses it anywhere; do not invent new sections.
- If `README.md` is generated from `src/docs/` and `jsdoc2md` (see the Makefile `README_MD` rule), do not hand-edit it; confirm it contains no reference to the old layout.

### Tests

Add `src/lib/default-config/test/eslint-config-assembly.test.mjs` (extensionless import `../eslint-config`; the file stays small):

- Ordering: call `getEslintConfig` with sentinel objects for every component (`{ id : 'base' }`, ... , `additional`) and assert the returned array equals `[base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]` in that order; assert with no arguments the array has length 8 and its first element has the real base `files`. This pins the load-bearing order from the assembler's comment.
- Default wiring: with no arguments, the `cli` entry (index 6) has `rules['node/shebang'] === 'off'` and the base entry (index 0) has `rules['node/shebang'] === 'error'`.
- Optional, only if achievable without invasive hacks: a test of the `engines` branch. Note the real semantics: when `package.json` has no `engines`, `shared.mjs` defaults it to `{ node : true }` and the node plugin block applies; the *skipped* branch is `engines` present but without a `node` key. Because `package.json` is read once at import relative to `process.cwd()`, testing this needs a module-isolated re-import from a temporary directory containing a `package.json` with `"engines": {}` (for example `jest.isolateModules`/`jest.resetModules` under the project's ESM Jest setup). If that cannot be made reliable, skip it and record the gap in your report instead of forcing it.

## Validation

- `grep -rn "eslint-config.mjs" docs/architecture.md DEVELOPER_NOTES.md` shows only references that are still accurate (public assembler), and every moved-detail reference names the new file.
- Every file named in the docs exists (`ls src/lib/default-config/eslint-components/`).
- Markdown anchors in `docs/architecture.md` still resolve (no heading renamed).
- `make test` passes including the new test; `make lint` passes for the new test file.
- Mutation check on the ordering test: temporarily swap two elements in `eslint-config.mjs`'s returned array and confirm the new test fails, then revert.

## Assumptions

- Task 004 has merged: components exist and `eslint-config.mjs` is the assembler.

## References

- [Plan overview](../overview.md), [research findings](../notes/split-research-findings.md) (docs list, risks 3 and 4).
- `docs/architecture.md`, `DEVELOPER_NOTES.md`.

## Status

- Outcome: succeeded (2026-10-04).
- Docs updated: `docs/architecture.md`, `DEVELOPER_NOTES.md`. README.md contains no `eslint-config` reference.
- Added `src/lib/default-config/test/eslint-config-assembly.test.mjs` (ordering and default-wiring tests). The optional `engines` branch test was skipped (needs module-isolated re-import under ESM Jest; not forced).
- Validation: `make test` (55 passed), `make lint` passed, mutation swap of `jsx`/`tsJsdoc` made the ordering test fail and was reverted.
