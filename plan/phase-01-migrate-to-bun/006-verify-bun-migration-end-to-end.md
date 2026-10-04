# Verify Bun Migration End to End Including Node Compatibility

## Purpose and scope

Final independent verification of the whole migration, with no new features. Fix only trivial leftovers found (typos, a stray reference); report anything bigger rather than redesigning. Run in a fresh clone or `git worktree` of the plan branch (or clean `node_modules` in the plan worktree) so nothing leans on prior state.

## Requirements

1. From clean: `rm -rf node_modules qa dist coverage; bun install --frozen-lockfile; make qa; make build`. All must pass.
2. **Node compatibility of the built package** (consumer path, run with Node, not Bun): `node dist/fandl-exec.js --help`; `node -e "import('./dist/fandl.js').then(m => console.log(Object.keys(m)))"`; `npm pack` into a temp directory, install the tarball with `npm install` into a scratch project (scratch dir, not the repo), and run `npx fandl --help` there with `node --version` >= 18 noted. Confirm the tarball lists only `dist/`, `package.json`, README, license files and contains no `bunfig.toml`/`bun.lock`/tests.
3. Format-and-lint dogfood: `node dist/fandl-exec.js lint` passes on the repo itself (this is `make lint`).
4. Leftover sweep over tracked files: `git ls-files | xargs grep -nE "package-lock|npx |npm (ci|install|run|explore)|\bjest\b|@jest|sdlc-resource-jest"`; every remaining hit must be deliberate (consumer install text, publish agent, quoted upstream error, consumer-globals explanation). `git ls-files | grep -E "package-lock|jest\.config"` empty.
5. `package.json` diff vs the base branch: only the two devDependency removals (unless task 004 found a reason otherwise). `engines.node` unchanged.
6. `scripts/release.sh --dry-run prerelease` still completes.
7. Report: pass/fail per check, test count, coverage summary line, any deviations, and recommendations.

## Validation

- Every requirement above passes and is listed with its command in the task report.
- `git status` clean afterward except intended edits; scratch projects removed.

## Metadata

architectural_impact: false

## Assumptions

- Tasks 001 to 005 complete and merged into the plan branch.

## Status

- Outcome: succeeded (2026-10-04). Verification only; no source changes.
- Clean install/qa/build pass (55 tests, 12 files, 0 fail; coverage All files 99.23% lines / 98.53% branches). Fresh dist is byte-identical to a dist built from `main` with npm-installed deps (the earlier dist difference was a stale baseline, not the migration).
- `node dist/fandl-exec.js --help` errors (UNKNOWN_OPTION) identically on the pre-migration build; the CLI has no `--help`. Import of `dist/fandl.js` works under Node (exports: formatAndLint, linebreakTypesExcept).
- Tarball: 8 files (dist/, package.json, README.md); no bun.lock/bunfig.toml/tests. Leftover sweep hits are all deliberate. `package.json` diff vs `main`: only the two devDependency removals; `engines` unchanged.
- `RELEASE_BRANCH=<branch> scripts/release.sh --dry-run prerelease` completes (needs RELEASE_BRANCH off `main`); worktree left clean.
