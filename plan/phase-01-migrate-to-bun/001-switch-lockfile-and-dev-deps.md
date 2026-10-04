# Switch Lockfile to bun.lock and Remove Jest Dev Dependencies

## Purpose and scope

Make bun the installation agent: generate `bun.lock` from the existing resolved versions, delete `package-lock.json`, and remove the jest-related devDependencies. Touches `package.json`, `package-lock.json` (deleted), `bun.lock` (new). Work in the plan worktree (`<plan_worktree_path>`). Do not touch tests, the Makefile, or docs (later tasks).

## Requirements

1. In the worktree, with `package-lock.json` still present, run `bun install` so bun migrates the resolved versions into a text `bun.lock`. Then `git rm package-lock.json`.
2. Remove `jest` and `@liquid-labs/sdlc-resource-jest` from `devDependencies` in `package.json` (keep `@liquid-labs/jsdoc-to-markdown` and `dmd-readme-api`). Re-run `bun install` so `bun.lock` reflects the removal. Do not change `dependencies`, `peerDependencies`, `engines`, `files`, `publishConfig`, or `scripts`.
3. Confirm the `_sdlc` block holds only `linting.ignores` (no jest config) and leave it unchanged.
4. Sanity-check the lock: `bun install --frozen-lockfile` succeeds from a clean `node_modules`; key packages (`eslint`, `prettier`, `@sdlcforge/packjs`, `rollup` via packjs) resolve to the same versions recorded in the old `package-lock.json` (compare via `git show HEAD:package-lock.json`); `node_modules/@sdlcforge/packjs/dist/rollup/rollup.config.mjs` and `node_modules/.bin/rollup`, `node_modules/.bin/jsdoc2md` exist (hoisted layout; the Makefile task depends on this).
5. Confirm `.gitignore` needs no change (`bun.lock` must be tracked; `node_modules` already ignored).

## Validation

- `package-lock.json` absent; `bun.lock` present and tracked-eligible (`git status` shows it as new).
- `grep -n "jest" package.json bun.lock` returns nothing.
- `bun install --frozen-lockfile` exits 0 after `rm -rf node_modules`.
- `git diff package.json` shows only the two devDependency removals.
- Version comparison from requirement 4 recorded in the task report (note any drift).

## Metadata

architectural_impact: false

## References

- [bun migration findings](../notes/bun-migration-findings.md) decisions 3 and 4.
