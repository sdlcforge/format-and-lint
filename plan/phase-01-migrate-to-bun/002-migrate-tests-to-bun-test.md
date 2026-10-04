# Migrate Test Suite to bun:test

## Purpose and scope

Port every jest test and helper to `bun:test` so jest is no longer needed, and make `bun test` runnable on its own (the Makefile integration is task 003). Files: all `src/**/test/**/*.test.mjs` (11 files), helper `src/lib/lib/test/mock-read-file.mjs`, new `bunfig.toml`, new fixtures under `src/lib/lib/test/data/`. Do not edit the Makefile, release script, or docs.

## Requirements

1. **Globals.** Keep `describe`, `test`, `test.each`, `expect`, `beforeAll`, `beforeEach`, `afterEach`, `afterAll` as bun globals (no import). Remove every `@jest/globals` import and its `eslint-disable-line node/no-extraneous-import` comment. Import `spyOn` (and `mock` only if still needed) from `'bun:test'`.
2. **`process-gitignore.test.mjs`.** Replace `jest.spyOn(...)` with bun's `spyOn(process.stderr, 'write').mockImplementation(...)`; keep `mockClear`/`mockRestore` semantics.
3. **Remove the module mock.** `mock-read-file.mjs` uses `jest.unstable_mockModule('node:fs/promises')`. `bun test` runs all files in one process and `mock.module` leaks across files, so do not port it as-is. Instead delete `mock-read-file.mjs` and rewrite `extract-patterns-from-file.test.mjs`, `process-file-patterns.test.mjs`, and `process-package-ignores.test.mjs` to use real fixture files with the same expected values (comments/blank lines excluded; `src2/*.mjs`, `src/**/*.mjs`; `devPkg.linting.ignores` -> `['foo']`). `extractPatternsFromFile` and `processFilePatterns` take paths, so add a fixture under `src/lib/lib/test/data/`. `processPackageIgnores` reads `./package.json` from the cwd: create a temp dir (the existing `src/test/lib/copy-dir-to-tmp.mjs` helper's `getTmpDir` can be used) containing a `package.json` with the `devPkg` content, `process.chdir` into it in `beforeAll`/the test, and restore the original cwd in `afterAll`, removing the temp dir. Remove the dynamic `await import` workaround, which existed only for the mock. Fallback only if this proves impractical: keep `mock.module` and report that the Makefile must run those files in separate `bun test` processes.
4. **`bunfig.toml`** (repo root) with a `[test]` section scoping discovery to `./src` (`root = "./src"`), do not force `coverage = true` (the Makefile passes flags); set `coverageSkipTestFiles = true` and `coveragePathIgnorePatterns` for `**/test/**`, `**/index.*` and `**/data/**`. Confirm `bunfig.toml` is not shipped (`files` is `["dist/"]`).
5. Behavior parity: all pre-existing test cases and counts remain (`test.each` cases included); do not weaken assertions. `fandl.test.mjs`, `format-and-lint.test.mjs`, `get-eslint.test.mjs`, and the default-config tests need only verification (extensionless relative imports and `import.meta.url` work under bun) and minimal edits if bun semantics differ (e.g. timeouts: bun's default per-test timeout is 5s; set an explicit timeout on slow eslint/prettier tests rather than loosening anything else).
6. Run `bun test` from the worktree root and, to guard against the worktree-scan issue, from the original project root with `bun test ./src`. Confirm results are order-independent by also running the test files individually.

## Validation

- `bun test` (from the worktree root) passes with the same number of tests as the jest suite had (count with `grep -c` over `test(`/`test.each` or compare to the last `qa/unit-test.txt` if available) and zero failures.
- `grep -rn "jest" src --include=*.mjs` hits only `src/lib/default-config/eslint-components/tests.mjs` (consumer globals; handled in task 005).
- `src/lib/lib/test/mock-read-file.mjs` is deleted; no test calls `mock.module`.
- Each test file passes when run alone (`bun test <file>`).
- New and edited files pass lint formatting conventions (project style: space before `:` in objects, no semicolons, 2-space indent); lint itself is run in task 003/006 once the Makefile is updated, but `bun:test` imports must not trip `node/no-extraneous-import` or `import/no-unresolved` - if they do, add a targeted disable comment with justification or a lint-config tweak limited to test files, and flag it in the report.

## Metadata

architectural_impact: false

## Assumptions

- Task 001 completed: `node_modules` exists in the worktree and the jest packages are gone.
- `jest` is intentionally still referenced by `eslint-components/tests.mjs` after this task.

## References

- [bun migration findings](../notes/bun-migration-findings.md) decisions 5 to 7.
- Bun test docs: https://bun.com/docs/cli/test (mocking, `spyOn`, `mock.module`, bunfig `[test]` options).

## Checkpoint hints

- After the gitignore spy port and mock helper removal.
- After the three fixture-based tests pass.
- After `bunfig.toml` and the full `bun test` run.

## Status

- Outcome: succeeded (2026-10-04). `bun test` from the worktree root: 55 pass, 0 fail across 12 files; each test file also passes alone.
- Changed: `bunfig.toml` (new), `src/lib/lib/test/mock-read-file.mjs` (deleted), `src/lib/lib/test/data/patterns/test-patterns.txt` (new fixture), the three fixture-based tests, and `process-gitignore.test.mjs` (`spyOn`).
- Note: a file that imports from `bun:test` no longer receives the injected globals, so `process-gitignore.test.mjs` imports `describe`/`test`/`expect`/hooks explicitly alongside `spyOn`.
- Note: `src/lib/default-config/eslint-components/shared.mjs` needs `dist/babel/babel.config.cjs` (built by make, task 003); a copy of the main checkout's `dist/` was used locally (gitignored) for verification.
