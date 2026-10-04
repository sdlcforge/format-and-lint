# Update README Sources, Developer Notes, and Architecture Docs for Bun

## Purpose and scope

Update remaining documentation that references npm or jest. `README.md` is generated, so edit its sources. Files: `src/docs/README.01.md`, `src/docs/README.02.md` (only if relevant), generated `README.md`, `DEVELOPER_NOTES.md`, `docs/architecture.md`, comments in `src/lib/default-config/eslint-components/tests.mjs`. `RELEASING.md` and `scripts/` belong to task 004; do not edit them. Do not change `README` consumer install semantics: consumers use the published npm package.

## Requirements

1. `src/docs/README.01.md`: keep `npm i @sdlcforge/format-and-lint` and `npx fandl ...` as the primary consumer instructions; add the bun equivalents (`bun add` / `bunx fandl`) beside them. Regenerate `README.md` with `make build` (never hand-edit `README.md`) and confirm the diff is limited to the source edits.
2. `DEVELOPER_NOTES.md`: add a "Development setup" section: bun 1.3.x is the dev runtime and installer (`bun install`, lock file `bun.lock` must be committed), `make test` runs `bun test` with `bun:test`, tests run under Bun while the published package targets Node (`engines.node >=18`) and lint/CLI run under Node via the shebang; npm is retained only for publishing (see `RELEASING.md`). Add the gotcha that `mock.module` leaks across test files in one `bun test` process (why the suite uses fixture files), and that `bun test` must be scoped to `./src` because `worktrees/` holds repo copies. Update the "Weird dependency" note's stale `npm install` wording only if it names npm commands; otherwise leave. Do not touch the `typescript: true` section other than a literal `npm install --save-dev typescript` quote, which is a quoted upstream error message and must stay.
3. `docs/architecture.md` (~line 135, `defaultTestsConfig`): state that it applies the `globals` package's `jest` global names, which also cover `describe/test/expect/beforeAll/...` as provided by `bun:test`; the shipped behavior is unchanged. Check the rest of the file for build/test-tooling statements (`grep -n -iE "npm|jest|node_modules|make test"`) and fix any that are now wrong.
4. `tests.mjs`: comment-only edits ("adds correct globals when processing jest-compatible tests (jest, bun:test)"; the `describe` length comment likewise). No functional change.

## Validation

- `grep -rniE "\bjest\b" README.md DEVELOPER_NOTES.md docs src/docs src/lib/default-config` shows only deliberate mentions (consumer-globals explanation); `grep -rn "npm" ...` shows only deliberate ones (consumer install, publish agent, the quoted upstream error).
- `make build` leaves `git diff` limited to the intended doc edits; README.md matches sources.
- `bun test` and `make lint` still pass (comment edit only).

## Metadata

architectural_impact: false

## Assumptions

- Tasks 001 to 003 complete (`make build` regenerates README under bun). Parallel-eligible with task 004.

## References

- [bun migration findings](../notes/bun-migration-findings.md) decisions 2, 5, 6, 7.
