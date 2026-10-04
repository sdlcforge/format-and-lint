# Adapt Release Script and RELEASING.md to bun.lock

## Purpose and scope

Assess the publish flow and change only what the lockfile and dev-runtime switch force. The package is published to the npm registry, so `scripts/release.sh` keeps npm for versioning, auth checks, `npm view`, `npm pack`, and `npm publish` (reasons in the findings note: OTP/2FA, dist-tag logic, and idempotency checks are npm-CLI-based). Files: `scripts/release.sh`, `RELEASING.md`. Do not run a real release or publish; do not run `npm login`.

## Requirements

1. In `scripts/release.sh`, remove every `package-lock.json` reference: the `git checkout -- package.json package-lock.json` calls (2 revert sites plus the dry-run revert), the `git add package.json package-lock.json`, and the `grep -v -E ' (package\.json|package-lock\.json)$'` dirty filter (keep `package.json`). Updated revert lines must tolerate the lockfile's absence and not fail under `set -e`.
2. Verify empirically how `npm version <bump> --no-git-tag-version` behaves with no `package-lock.json` (it must only modify `package.json`; it must not create `package-lock.json`) and whether `bun.lock` is affected by a version bump (bun.lock records no root version; if it does change, add it to the manifests handled by the script). Run `scripts/release.sh --dry-run prerelease` from a clean checkout of the plan branch on a branch named `main` or with `RELEASE_BRANCH=<current branch>` set; credential checks only warn in dry-run. Restore any state afterward (`git status` clean).
3. Make the release flow's prerequisite `make test && make lint` (preversion) and `make build` (prepack) work: these now need bun on PATH. Add a pre-flight check in `release.sh` that `bun` is available (fail with a clear message), alongside the existing checks, and a `bun install --frozen-lockfile` mention is documentation-only (do not add installs to the script).
4. Update `RELEASING.md`: manifests are `package.json` only (drop `package-lock.json`); release commit contents; recovery step `git restore package.json`; prerequisite `npm ci` -> `bun install --frozen-lockfile`; state that bun is the dev runtime and test/build agent while npm remains the publish agent (explain why in one or two sentences); note that `npm` and `bun` must both be installed. Keep dist-tag, rollback, and verification sections intact (`npx @sdlcforge/format-and-lint@<version> --help` remains valid for consumers).

## Validation

- `grep -n "package-lock" scripts/release.sh RELEASING.md` returns nothing.
- `bash -n scripts/release.sh` passes; `shellcheck` if available.
- `scripts/release.sh --dry-run prerelease` completes ("Done (dry run)"), including `npm pack --dry-run` showing only `dist/` files plus `package.json`/README, and leaves a clean tree.
- `RELEASING.md` still documents every step the script performs; no instruction introduces `bun publish`.

## Metadata

architectural_impact: false

## Assumptions

- Tasks 001 to 003 are complete (`make test`/`make lint`/`make build` work under bun).
- Parallel-eligible with task 005; the two tasks edit disjoint files.

## References

- [bun migration findings](../notes/bun-migration-findings.md) decision 1.

## Checkpoint hints

- After `release.sh` edits and the dry run.
- After `RELEASING.md` edits.
