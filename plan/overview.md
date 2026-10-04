# Overview

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
