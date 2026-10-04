# Plan Summary: npm-to-bun

## What was planned and why

Switch the project's standard development runtime and installation agent from npm to bun, and replace jest with bun's built-in test harness (`bun:test`).

In scope:

- Replace `package-lock.json` with `bun.lock`; remove the `jest` and `@liquid-labs/sdlc-resource-jest` devDependencies.
- Migrate the test suite and test helpers from jest to `bun:test` (including the `node:fs/promises` module mock and the `process.stderr` spy).
- Update the Makefile (dependency path discovery, rollup, jsdoc2md, test target, coverage output) to use bun.
- Adapt `scripts/release.sh` and `RELEASING.md` to the new lockfile while keeping npm as the publishing agent.
- Update docs that reference npm or jest: `src/docs/README.01.md` / `README.02.md` (README.md is generated), `DEVELOPER_NOTES.md`, `RELEASING.md`, `docs/architecture.md`, comments in `src/lib/default-config/eslint-components/tests.mjs`.

Out of scope and must not change:

- The package is published to the npm registry; the publish flow (`npm version`, `npm publish`, dist-tags, GitHub release) stays on npm.
- `engines.node` (`>=18.0.0`), the Node shebang, and the built `dist/` must remain Node-compatible for consumers; consumer-facing README install text keeps the npm form.
- The behavior of the shipped lint config (`globals.jest` for consumer test files) does not change.
- The external coverage badge builder and the `devPkg` vs `_sdlc` key mismatch are tracked as followups, not fixed here.

Success criteria: `bun install --frozen-lockfile`, `make build`, `make test`, `make lint`, and `scripts/release.sh --dry-run prerelease` all succeed using bun-installed dependencies; no `jest` references remain in tracked files except the deliberate consumer-globals mention; `dist/fandl-exec.js` runs under plain Node. Background and decisions: [bun migration findings](./notes/bun-migration-findings.md).

## Purpose and scope

Switch the project's standard development runtime and installation agent from npm to bun, and replace jest with bun's built-in test harness (`bun:test`).

In scope:

- Replace `package-lock.json` with `bun.lock`; remove the `jest` and `@liquid-labs/sdlc-resource-jest` devDependencies.
- Migrate the test suite and test helpers from jest to `bun:test` (including the `node:fs/promises` module mock and the `process.stderr` spy).
- Update the Makefile (dependency path discovery, rollup, jsdoc2md, test target, coverage output) to use bun.
- Adapt `scripts/release.sh` and `RELEASING.md` to the new lockfile while keeping npm as the publishing agent.
- Update docs that reference npm or jest: `src/docs/README.01.md` / `README.02.md` (README.md is generated), `DEVELOPER_NOTES.md`, `RELEASING.md`, `docs/architecture.md`, comments in `src/lib/default-config/eslint-components/tests.mjs`.

Out of scope and must not change:

- The package is published to the npm registry; the publish flow (`npm version`, `npm publish`, dist-tags, GitHub release) stays on npm.
- `engines.node` (`>=18.0.0`), the Node shebang, and the built `dist/` must remain Node-compatible for consumers; consumer-facing README install text keeps the npm form.
- The behavior of the shipped lint config (`globals.jest` for consumer test files) does not change.
- The external coverage badge builder and the `devPkg` vs `_sdlc` key mismatch are tracked as followups, not fixed here.

Success criteria: `bun install --frozen-lockfile`, `make build`, `make test`, `make lint`, and `scripts/release.sh --dry-run prerelease` all succeed using bun-installed dependencies; no `jest` references remain in tracked files except the deliberate consumer-globals mention; `dist/fandl-exec.js` runs under plain Node. Background and decisions: [bun migration findings](./notes/bun-migration-findings.md).

## Current status

Planning complete; execution begins at phase 1, task 001. Pre-conditions: bun 1.3.14 and Node/npm installed; the plan worktree has no `node_modules` yet (task 001 installs them). Baseline for build-equivalence checks: the pre-migration `dist/` in the project root (built with npm).

## Overview

Single phase, `phase-01-migrate-to-bun`, six tasks. Tasks 001 to 003 are sequential and touch overlapping files; 004 and 005 can run in parallel after 003; 006 runs last.

1. `001-switch-lockfile-and-dev-deps` (sonnet-med) - migrate lock via `bun install`, delete `package-lock.json`, drop jest devDependencies.
2. `002-migrate-tests-to-bun-test` (sonnet-med) - port all tests and helpers to `bun:test`, drop the module-mock leak risk, add `bunfig.toml`.
3. `003-update-makefile-for-bun` (sonnet-med) - bun-based Makefile build, test, coverage, and README generation; verify `dist/` equivalence.
4. `004-adapt-release-flow` (sonnet-med) - `scripts/release.sh` and `RELEASING.md`; npm publish retained; dry-run verified. Parallel-eligible with 005.
5. `005-update-docs-for-bun` (sonnet-low) - README sources, `DEVELOPER_NOTES.md`, `docs/architecture.md`, `tests.mjs` comments. Parallel-eligible with 004.
6. `006-verify-bun-migration-end-to-end` (sonnet-low) - full clean-clone verification, Node-compat smoke test, leftover-reference sweep.

## What shipped

### Phase 01 — Migrate Development Runtime from npm and Jest to Bun

1. **Switch Lockfile to bun.lock and Remove Jest Dev Dependencies** (`001-switch-lockfile-and-dev-deps.md`, tier `sonnet-med`) — Migrated the lockfile with bun install while package-lock.json was still present, then deleted it and removed the jest and sdlc-resource-jest devDependencies. Frozen install passes; key versions identical to old lock. bun reported 'Blocked 1 postinstall' (untrusted-script protection); no effect on lock.
   Commit `65f3fd8`, merged at `89180648a8e24265d83edaaeef2fc9e48ebb6088`.

2. **Migrate Test Suite to bun:test** (`002-migrate-tests-to-bun-test.md`, tier `sonnet-med`) — Ported the jest suite to bun:test. Module mock replaced by a real fixture file and temp-dir cwd for processPackageIgnores. bunfig.toml scopes discovery to ./src. 55 tests pass in one process and individually. A file importing from bun:test gets no injected globals, so process-gitignore.test.mjs imports describe/test/expect explicitly. Tests need gitignored dist/babel/*.cjs built by make (task 003 must build before test).
   Commit `548c086`, merged at `5a0a579e5057108e366731f7e7f1674c07dc06be`.

3. **Update Makefile for Bun Build and Test Targets** (`003-update-makefile-for-bun.md`, tier `sonnet-med`) — Makefile migrated from npm/npx/jest to bun: package paths from node_modules, rollup and jsdoc2md via bunx, test target uses bun test with coverage into qa/coverage. build/test/lint/qa pass; README unchanged. Added one eslint-disable-next-line import/no-unresolved on the bun:test import in process-gitignore.test.mjs (task 002 file) so make lint passes; a lint-config fix for bun:* may be preferred. dist differs from stale baseline in import order/identifier names only (cause not proven; task 006 should verify).
   Commit `8f35940`, merged at `ea5fea932200ee7834d1e3f80e1a17c026188daf`.

4. **Adapt Release Script and RELEASING.md to bun.lock** (`004-adapt-release-flow.md`, tier `sonnet-med`) — Removed package-lock.json handling from release.sh, added a bun PATH pre-flight; RELEASING.md updated (bun dev runtime, npm publish agent, both required). Dry-run release passed; npm version creates no lockfile and bun.lock unaffected by a bump. bun publish deliberately not used.
   Commit `ea3a298`, merged at `eb7965118eba0027da2e7ba8ec0afd3d7bb8decc`.

5. **Update README Sources, Developer Notes, and Architecture Docs for Bun** (`005-update-docs-for-bun.md`, tier `sonnet-low`) — Docs updated for bun with consumer npm install text preserved and bun equivalents added beside it. README regenerated cleanly via make build. DEVELOPER_NOTES.md gained a Development setup section; architecture.md defaultTestsConfig sentence fixed; tests.mjs change is comments only. Remaining jest mentions deliberate (consumer globals).
   Commit `33b2316`, merged at `0b81db1709168cf24335033d6e7bc16544ad8b5a`.

6. **Verify Bun Migration End to End Including Node Compatibility** (`006-verify-bun-migration-end-to-end.md`, tier `sonnet-low`) — Verification-only; every check passes with no source changes. Clean install, make qa (55 pass), make build, Node import and CLI lint run, npm pack/install smoke test, leftover-reference sweep, and release dry-run (npm publish retained) all pass. Fresh bun-built dist is byte-identical to a dist built from main with npm, so earlier baseline diff was staleness.
   Commit `a8a8602`, merged at `04c3375be87c1f31622ef847e6d40c0eaa6b6970`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Findings

- **`aylA`** — **package ignores read devPkg, not _sdlc** — promoted — ref: `aylA` — 2026-10-04

- **`hFOz`** — **Coverage badge builder assumes jest output** — promoted — ref: `hFOz` — 2026-10-04

- **`gC1A`** — **RELEASING.md line 48 suggests \`npx @sdlcforge** — promoted — ref: `gC1A` — 2026-10-04

- **`24KN`** — **The \`eslint-disable-next-line import/no-unres** — promoted — ref: `24KN` — 2026-10-04

- **`en6s`** — **Pin rollup; avoid bunx registry fallback** — promoted — ref: `en6s` — 2026-10-04

- **`0jh3`** — **process-package-ignores test relies on chdir** — promoted — ref: `0jh3` — 2026-10-04

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Migrate Development Runtime from npm and Jest to Bun

- [x] [001-switch-lockfile-and-dev-deps.md](./phase-01-migrate-to-bun/001-switch-lockfile-and-dev-deps.md) — tier `sonnet-med` · branch `plan/npm-to-bun-01-001` · commit `65f3fd8` · merge `89180648a8e24265d83edaaeef2fc9e48ebb6088`
- [x] [002-migrate-tests-to-bun-test.md](./phase-01-migrate-to-bun/002-migrate-tests-to-bun-test.md) — tier `sonnet-med` · branch `plan/npm-to-bun-01-002` · commit `548c086` · merge `5a0a579e5057108e366731f7e7f1674c07dc06be`
- [x] [003-update-makefile-for-bun.md](./phase-01-migrate-to-bun/003-update-makefile-for-bun.md) — tier `sonnet-med` · branch `plan/npm-to-bun-01-003` · commit `8f35940` · merge `ea5fea932200ee7834d1e3f80e1a17c026188daf`
- [x] [004-adapt-release-flow.md](./phase-01-migrate-to-bun/004-adapt-release-flow.md) — tier `sonnet-med` · branch `plan/npm-to-bun-01-004` · commit `ea3a298` · merge `eb7965118eba0027da2e7ba8ec0afd3d7bb8decc`
- [x] [005-update-docs-for-bun.md](./phase-01-migrate-to-bun/005-update-docs-for-bun.md) — tier `sonnet-low` · branch `plan/npm-to-bun-01-005` · commit `33b2316` · merge `0b81db1709168cf24335033d6e7bc16544ad8b5a`
- [x] [006-verify-bun-migration-end-to-end.md](./phase-01-migrate-to-bun/006-verify-bun-migration-end-to-end.md) — tier `sonnet-low` · branch `plan/npm-to-bun-01-006` · commit `a8a8602` · merge `04c3375be87c1f31622ef847e6d40c0eaa6b6970`
