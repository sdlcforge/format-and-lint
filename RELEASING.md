# Releasing @sdlcforge/format-and-lint

The whole release is automated by [`scripts/release.sh`](./scripts/release.sh). Agents are the primary audience of this file; human operators can run the same script by hand. Read the script for the exact steps. Project overview and usage live in the [README](./README.md); maintainer notes are in [DEVELOPER_NOTES.md](./DEVELOPER_NOTES.md).

## What the script does

1. **Pre-flight.** Clean working tree; on the release branch (`main`, override with `RELEASE_BRANCH`); remote `origin` configured (override with `REMOTE`); credential checks `npm whoami` and `gh auth status` (warnings only in `--dry-run`); an interactive terminal for a real run.
2. **Bump and verify.** `npm version <bump> --no-git-tag-version`, whose `preversion` hook runs `make test && make lint`, then `make build`. The build regenerates `README.md`; if that (or anything else) changes a tracked file besides the manifests, the script reverts the bump and stops.
3. **Commit and tag.** A `release: <version>` commit containing only the `package.json`/`package-lock.json` bump, and an annotated tag `v<version>`.
4. **Push.** `git push origin refs/heads/<branch>`, then `git push origin refs/tags/v<version>` (skipped if the remote tag already exists).
5. **Publish.** `npm publish --access public --tag <dist-tag>` (skipped if that version is already on npm). See [Dist-tag](#dist-tag).
6. **GitHub release.** `gh release create v<version> --repo <owner/repo> --verify-tag` with `--prerelease` for prerelease versions (skipped if the release exists).

**Manifests:** `package.json` (`version`, primary) and `package-lock.json`. **Build:** `make build` (invoked by the `prepack` hook too); tests `make test`; lint `make lint`. **Artifacts:** everything under `dist/` (`dist/fandl-exec.js`, `dist/fandl.js`, source maps, `dist/babel/*`), per the `files` field of `package.json`. **Tag prefix:** `v` (matches every existing tag, e.g. `v1.0.0-alpha.31`).

**Changelog.** There is no changelog file. Release notes are generated from first-parent git history since the previous `v*` tag (one line per merged branch, bookkeeping commits filtered by the `NOTES_SKIP_PATTERNS` list in the script, plus a compare link) and passed to `gh release create --notes-file`. User-facing change descriptions live in the README's release-notes section, which is generated from `src/docs/README.*.md`; update those sources in the feature branch, not at release time.

## Usage

```bash
scripts/release.sh --dry-run prerelease   # all checks, bump, test, lint, build, npm pack --dry-run; reverts the bump; no commit/tag/push/publish/release
scripts/release.sh prerelease             # e.g. 1.0.0-alpha.31 -> 1.0.0-alpha.32
scripts/release.sh 1.0.0-alpha.32         # explicit version; also resumes a partly finished release
```

The bump argument is any `npm version` argument (`patch`, `minor`, `major`, `prerelease`) or an explicit version. The script never publishes without a bump argument and without `--dry-run` being absent; a real run also requires an interactive terminal.

## Version bump rules

The package is on a prerelease line (`1.0.0-alpha.N`). Use `prerelease` to increment `N`. Moving to the next stage (`1.0.0-beta.0`) or to a stable `1.0.0` is done with an explicit version, e.g. `scripts/release.sh 1.0.0-beta.0`. After `1.0.0`, use `patch` / `minor` / `major` per semver.

## Dist-tag

- Stable versions publish under `latest`.
- Prereleases publish under `latest` while the package has never had a stable release (the project's history: every alpha is `latest`, so consumers installing the bare package name get the newest alpha). Once any stable version exists on npm, prereleases publish under their prerelease id (`1.0.0-beta.1` -> `beta`) so `latest` is not moved to a prerelease.
- Set `DIST_TAG=<tag>` to override.

## Prerequisites

- Credential pre-flight: `npm whoami` and `gh auth status` must pass. If either fails, authenticate yourself in your own terminal (`npm login`, `gh auth login`) and re-run. The script never accepts a credential as an argument.
- npm publish may require an interactive one-time code (2FA). The publish step is **user-run**: run the script from an interactive terminal and let npm prompt for the code.
- Confirm the exact version and dist-tag with the user before the first non-dry run. Run `--dry-run` first.
- Dependencies installed (`npm ci`); the build and tests need them.

## Verification

After a real run: `npm view @sdlcforge/format-and-lint dist-tags version`, `git ls-remote --tags origin v<version>`, and `gh release view v<version>`. Optionally `npx @sdlcforge/format-and-lint@<version> --help`.

## Rollback and recovery

- **Interrupted release:** re-run with the explicit version; every step whose result already exists is skipped. The script refuses if the tag exists but is not at `HEAD`.
- **Failed before the commit** (test, lint, or build failure): the bump is left uncommitted in `package.json`/`package-lock.json`; restore with `git restore package.json package-lock.json`, fix the problem, and re-run.
- **Published versions are never unpublished, and tags are never deleted or force-moved, without an explicit user instruction.** Fix forward: release the next version. If a bad version must be withdrawn, the user decides between `npm deprecate` and `npm unpublish` and runs it themselves.
- **Wrong dist-tag:** `npm dist-tag add @sdlcforge/format-and-lint@<version> <tag>` (user-run, needs 2FA).
