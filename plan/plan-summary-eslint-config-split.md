# Plan Summary: eslint-config-split

## What was planned and why

Restructure `src/lib/default-config/eslint-config.mjs` (443 physical lines, roughly 330 counted by its own `max-lines` rule) along its existing semantic seams so that no file needs the file-level `/* eslint-disable max-lines */` comment. The file becomes a thin assembler that keeps its path and its single `getEslintConfig` export; each named component moves to a module under a new sibling directory, `src/lib/default-config/eslint-components/`.

This plan also resolves existing followup `t0xt` ("eslint-config.mjs at max-lines cap"). The manager should remove `t0xt` from `plan/followups.yaml` on completion (the final task names it explicitly).

Hard constraint: behavior is unchanged. The array returned by `getEslintConfig()` must be identical, including element order, to the one returned before the split. Out of scope: any change to rule content, the inert `standardConfig(...)` call (see the CAUTION comment and `DEVELOPER_NOTES.md`), the jsdoc/tsJsdoc duplication, importers (`src/lib/lib/get-eslint.mjs`, `src/lib/default-config/test/eslint.config.test.mjs` keep their extensionless `../eslint-config` import), and the Makefile (its `find` globs pick up new `.mjs` files).

Basis: [split research findings](./notes/split-research-findings.md) (copied from `.flow/eslint-config-split-findings.md`; see that note for line ranges, the dependency graph and the risk list).

Single phase, `phase-01-split-eslint-config`, five tasks. The architectural-implications check found no public API or boundary change (the only export and its path are unchanged; the split is internal module layout), so no `doc-updates` phase is registered; task 005 covers the documentation edits directly.

Module layout (all new files `.mjs`, extensionless imports to match repo style):

| file (under `src/lib/default-config/`) | contents |
|---|---|
| `eslint-config.mjs` | assembler: imports components, `getEslintConfig`, ordering comment, export |
| `eslint-components/shared.mjs` | babel config path resolver (throws if absent), `package.json` read, `engines`, `usesReact`, `allFiles` |
| `eslint-components/indent-options.mjs` | `baseIndentOptions` (one shared object) |
| `eslint-components/base-rules.mjs` | `standardPlugin` (with CAUTION comment), `stylisticConfig`, `rules` table and `delete` cleanup |
| `eslint-components/base.mjs` | `defaultBaseConfig` including the `engines?.node` block |
| `eslint-components/jsdoc.mjs`, `ts-jsdoc.mjs`, `jsx.mjs`, `tests.mjs`, `ts.mjs`, `cli.mjs` | one component const each (the tests component is `tests.mjs`, not `test.mjs`, to avoid any test-glob ambiguity) |

Tasks:

1. [001 snapshot-shared-indent](./phase-01-split-eslint-config/001-snapshot-shared-indent.md): capture a baseline snapshot of the resolved config from the untouched source, add `shared.mjs` and `indent-options.mjs`.
2. [002 base-rules-and-base](./phase-01-split-eslint-config/002-base-rules-and-base.md): add `base-rules.mjs` and `base.mjs`. Depends on 001.
3. [003 remaining-components](./phase-01-split-eslint-config/003-remaining-components.md): add the six remaining components. Depends on 001.
4. [004 rewrite-assembler](./phase-01-split-eslint-config/004-rewrite-assembler.md): rewrite `eslint-config.mjs`, drop the `max-lines` disable, verify equivalence, `make test`, `make lint`, built-bundle smoke test. Depends on 001, 002, 003.
5. [005 docs-and-ordering-test](./phase-01-split-eslint-config/005-docs-and-ordering-test.md): update `docs/architecture.md` and `DEVELOPER_NOTES.md`, add an ordering test. Depends on 004 landing (file names are fixed by this plan, so drafting could start earlier, but the final check needs the real files).

Parallelism: 002 and 003 are independent of each other and can run concurrently once 001 lands (they touch disjoint new files; neither edits `eslint-config.mjs`). 004 follows both. 005 follows 004.

Cross-cutting risks (each is baked into the relevant task):

- The dev/test babel-config fallback uses three `..` from `src/lib/default-config/`; from `eslint-components/` it needs four (task 001).
- In the rollup bundle `import.meta.url` points into `dist/`, so the installed path `dist/babel/` is used; the built bundle must be verified (task 004).
- The `package.json` read and the missing-babel-config throw are one-shot import-time effects and live only in `shared.mjs` (task 001).
- `rules` is mutated by `delete` and later by `Object.assign` in the base component; the delete stays inside `base-rules.mjs` before export (tasks 002, 004).
- Component order `[base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]` is defined only in the assembler (tasks 004, 005).

## What shipped

### Phase 01 — Split ESLint Config Into Components

1. **Capture Baseline Snapshot, Add Shared And Indent Modules** (`001-snapshot-shared-indent.md`, tier `sonnet-med`) — Captured deterministic baseline of resolved eslint config (3 variants) from untouched source, verified harness catches a one-char change; added shared.mjs (four-.. babel path depth fix, single package.json read) and indent-options.mjs, not yet imported. make test passes; make lint has 3 pre-existing errors in unrelated files.
   Commit `c1f52cb`, merged at `206c2a615d7b87af82d000b096e0658c1afdac25`.

2. **Extract Base Rules And Base Component** (`002-base-rules-and-base.md`, tier `sonnet-med`) — Extracted base rules table and base component into base-rules.mjs and base.mjs via verbatim line-range moves; eslint-config.mjs untouched, snapshot equivalence left to task 004. make lint and make test pass.
   Commit `bd9ca3b`, merged at `3d9e345a94a96984b460213d0b96f8539df5f1dd`.

3. **Extract Remaining Config Components** (`003-remaining-components.md`, tier `sonnet-low`) — Moved six remaining components verbatim into eslint-components/ with minimal imports; eslint-config.mjs untouched; lint and tests pass.
   Commit `7f7c902`, merged at `8cd0beab7ce7afe18b9d4aad7e9183456ed98577`.

4. **Rewrite Assembler And Drop max-lines Disable** (`004-rewrite-assembler.md`, tier `sonnet-med`) — Replaced 443-line eslint-config.mjs with a 40-line assembler, dropped the max-lines disable. Baseline snapshot matches exactly; make test, make lint and built-bundle smoke test (incl. shebang semantics) pass.
   Commit `2fc5737`, merged at `982ce64fce4fd158031d2759b5699b163805c179`.

5. **Update Docs And Add Ordering Test** (`005-docs-and-ordering-test.md`, tier `sonnet-med`) — Updated architecture and developer docs to point at eslint-components modules; added 3-test assembly-order and default-wiring test, mutation swap of order is caught. Optional engines-branch test skipped (needs module-isolated ESM re-import).
   Commit `3a6e369`, merged at `3457ce981ca5c3cf55beca37146b3c1827058889`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Findings

_No findings closed in this plan's `plan/findings.yaml`._

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Split ESLint Config Into Components

- [x] [001-snapshot-shared-indent.md](./phase-01-split-eslint-config/001-snapshot-shared-indent.md) — tier `sonnet-med` · branch `plan/eslint-config-split-01-001` · commit `c1f52cb` · merge `206c2a615d7b87af82d000b096e0658c1afdac25`
- [x] [002-base-rules-and-base.md](./phase-01-split-eslint-config/002-base-rules-and-base.md) — tier `sonnet-med` · branch `plan/eslint-config-split-01-002` · commit `bd9ca3b` · merge `3d9e345a94a96984b460213d0b96f8539df5f1dd`
- [x] [003-remaining-components.md](./phase-01-split-eslint-config/003-remaining-components.md) — tier `sonnet-low` · branch `plan/eslint-config-split-01-003` · commit `7f7c902` · merge `8cd0beab7ce7afe18b9d4aad7e9183456ed98577`
- [x] [004-rewrite-assembler.md](./phase-01-split-eslint-config/004-rewrite-assembler.md) — tier `sonnet-med` · branch `plan/eslint-config-split-01-004` · commit `2fc5737` · merge `982ce64fce4fd158031d2759b5699b163805c179`
- [x] [005-docs-and-ordering-test.md](./phase-01-split-eslint-config/005-docs-and-ordering-test.md) — tier `sonnet-med` · branch `plan/eslint-config-split-01-005` · commit `3a6e369` · merge `3457ce981ca5c3cf55beca37146b3c1827058889`
