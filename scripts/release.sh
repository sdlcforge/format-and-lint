#!/usr/bin/env bash
# Release @sdlcforge/format-and-lint: bump, test, lint, build, commit, tag, push, npm publish, GitHub release.
#
# Usage: scripts/release.sh [--dry-run] <patch|minor|major|prerelease|X.Y.Z[-pre.N]>
#
# --dry-run runs every check, the version bump, test, lint, build and `npm pack --dry-run`, then
# reverts the bump. It never commits, tags, pushes, publishes, or creates a release.
# Safe to re-run: pass the explicit version of a partly finished release and every step whose
# result already exists (tag, remote tag, npm version, GitHub release) is skipped.
# Environment overrides: RELEASE_BRANCH (default main), REMOTE (default origin), DIST_TAG.
# Secrets are never read or accepted by this script; npm prompts for any one-time code itself.
set -euo pipefail

DRY_RUN=0
BUMP=''
RELEASE_BRANCH="${RELEASE_BRANCH:-main}"
REMOTE="${REMOTE:-origin}"

# Release-note skip list: first-parent commits whose subject matches any of these shell globs are
# bookkeeping noise and are left out of the generated GitHub release notes.
NOTES_SKIP_PATTERNS=(
  'release: *'
  'plan:*' 'plan(*' 'plan/*'
  'wave(*'
  'what-next*' 'refresh what-next*'
  '*pre-merge sync*'
  "Merge branch 'plan/*"  "Merge branch 'plan-*"  'Merge plan branch*'
  'Merging auto-generated release branch*'  'Saving QA files*'  # legacy liq release commits
  'chore: ignore /worktrees'
)

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) [[ -z "$BUMP" ]] || { echo "Only one bump argument allowed." >&2; exit 2; }; BUMP="$arg" ;;
  esac
done
[[ -n "$BUMP" ]] || { echo "Usage: $0 [--dry-run] <bump>" >&2; exit 2; }

cd "$(git rev-parse --show-toplevel)"
say() { echo "==> $*"; }
warn() { echo "WARNING: $*" >&2; }

PKG_NAME=$(node -p "require('./package.json').name")
CURRENT=$(node -p "require('./package.json').version")

# --- pre-flight ---------------------------------------------------------------
say "Pre-flight"
[[ "$(git rev-parse --abbrev-ref HEAD)" == "$RELEASE_BRANCH" ]] \
  || { echo "Must be on branch '$RELEASE_BRANCH' (override with RELEASE_BRANCH)." >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Working tree is not clean." >&2; exit 1; }
git remote get-url "$REMOTE" >/dev/null || { echo "Remote '$REMOTE' not configured." >&2; exit 1; }
# bun is the dev runtime: the preversion (make test && make lint) and prepack (make build) hooks need it.
command -v bun >/dev/null 2>&1 || { echo "bun not found on PATH; install bun (https://bun.sh) — make test/lint/build require it." >&2; exit 1; }
# Credential checks are hard failures for a real release, warnings for a dry run.
preflight_fail() {
  if (( DRY_RUN )); then warn "$1 (a real release would stop here)"; else echo "$1" >&2; exit 1; fi
}
npm whoami >/dev/null 2>&1 || preflight_fail "Not logged in to npm. Run 'npm login' in your own terminal, then re-run."
gh auth status >/dev/null 2>&1 || preflight_fail "Not logged in to GitHub. Run 'gh auth login' in your own terminal, then re-run."
if (( ! DRY_RUN )) && [[ ! -t 0 ]]; then
  echo "npm publish may need a one-time code; run this script from an interactive terminal." >&2; exit 1
fi

# --- resolve version / resume -------------------------------------------------
RESUME=0
PACKED=0
if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then NEW="$BUMP"; else NEW=''; fi
if [[ -n "$NEW" && "$NEW" != "$CURRENT" ]] && git rev-parse -q --verify "refs/tags/v$NEW" >/dev/null; then
  echo "Tag v$NEW already exists but package.json is at $CURRENT; refusing (resume only from the tagged commit)." >&2; exit 1
fi
if [[ "$NEW" == "$CURRENT" ]] && git rev-parse -q --verify "refs/tags/v$NEW" >/dev/null; then
  [[ "$(git rev-parse "v$NEW^{commit}")" == "$(git rev-parse HEAD)" ]] \
    || { echo "Tag v$NEW exists but is not at HEAD." >&2; exit 1; }
  RESUME=1
  say "Resuming release of v$NEW (commit and tag already exist)"
fi

# --- bump, test, lint, build, commit, tag -------------------------------------
if (( ! RESUME )); then
  say "Bumping version (npm's preversion hook runs 'make test && make lint'; output streams below)"
  npm version "${NEW:-$BUMP}" --no-git-tag-version
  NEW=$(node -p "require('./package.json').version")
  TAG="v$NEW"
  if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
    echo "Tag $TAG already exists." >&2; git checkout -- package.json; exit 1
  fi
  say "Building"
  make build
  # The build regenerates README.md; anything beyond the manifests changing means the committed docs were stale.
  DIRTY=$(git status --porcelain | grep -v -E ' package\.json$' || true)
  if [[ -n "$DIRTY" ]]; then
    echo "Build modified tracked files other than the manifests; commit or fix these first:" >&2
    echo "$DIRTY" >&2
    git checkout -- package.json
    exit 1
  fi

  if (( DRY_RUN )); then
    say "Dry run: test, lint and build passed for $NEW; checking package contents, then reverting local edits"
    npm pack --dry-run 2>&1 | tail -n 15; PACKED=1
    git checkout -- package.json
  else
    git add package.json
    git commit -m "release: $NEW"
    git tag -a "$TAG" -m "$TAG"
  fi
fi
TAG="v$NEW"

# --- dist-tag -----------------------------------------------------------------
# Stable versions -> latest. Prereleases -> latest while the package has never had a stable release
# (the project's history: every alpha was published under latest); otherwise the pre-release id.
PRERELEASE_FLAG=()
if [[ "$NEW" == *-* ]]; then
  PRERELEASE_FLAG=(--prerelease)
  if [[ -n "${DIST_TAG:-}" ]]; then :
  elif STABLE=$(npm view "$PKG_NAME" versions --json 2>/dev/null); then
    if echo "$STABLE" | node -e 'const v=JSON.parse(require("fs").readFileSync(0,"utf8"));process.exit([].concat(v).some(x=>!x.includes("-"))?0:1)'; then
      PRE=${NEW#*-}; DIST_TAG=${PRE%%.*}
    else
      DIST_TAG=latest
    fi
  else
    warn "Could not query npm for existing versions; defaulting dist-tag to latest (set DIST_TAG to override)"
    DIST_TAG=latest
  fi
else
  DIST_TAG=${DIST_TAG:-latest}
fi

# --- push ---------------------------------------------------------------------
BRANCH=$(git rev-parse --abbrev-ref HEAD)
say "Pushing $BRANCH and $TAG to $REMOTE"
if (( DRY_RUN )); then
  echo "[dry-run] would run: git push $REMOTE refs/heads/$BRANCH refs/tags/$TAG"
else
  git push "$REMOTE" "refs/heads/$BRANCH"
  git ls-remote --exit-code --tags "$REMOTE" "refs/tags/$TAG" >/dev/null 2>&1 \
    || git push "$REMOTE" "refs/tags/$TAG"
fi

# --- publish ------------------------------------------------------------------
say "Publishing $PKG_NAME@$NEW to npm (dist-tag: $DIST_TAG)"
if (( DRY_RUN )); then
  echo "[dry-run] would run: npm publish --access public --tag $DIST_TAG"
  (( PACKED )) || npm pack --dry-run 2>&1 | tail -n 15
elif [[ -n "$(npm view "$PKG_NAME@$NEW" version 2>/dev/null)" ]]; then
  echo "Already published; skipping."
else
  npm publish --access public --tag "$DIST_TAG"   # npm prompts for the OTP itself (user-run)
fi

# --- GitHub release -----------------------------------------------------------
say "Creating GitHub release $TAG"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then BASE="$TAG^"; else BASE=HEAD; fi
PREV_TAG=$(git describe --tags --abbrev=0 --match 'v*' "$BASE" 2>/dev/null || true)
RANGE=${PREV_TAG:+$PREV_TAG..HEAD}
SLUG=$(git remote get-url "$REMOTE" | sed -E 's#^.*[:/]([^/:]+/[^/]+)$#\1#; s#\.git$##')
NOTES_FILE=$(mktemp)
trap 'rm -f "$NOTES_FILE"' EXIT
{
  while read -r sha; do
    subj=$(git log -1 --format=%s "$sha")
    skip=0
    for pat in "${NOTES_SKIP_PATTERNS[@]}"; do [[ "$subj" == $pat ]] && { skip=1; break; }; done
    (( skip )) && continue
    if [[ $(git rev-list --parents -n1 "$sha" | wc -w) -gt 2 && "$subj" =~ ^Merge\ branch\ \'([^\']+)\' ]]; then
      name=${BASH_REMATCH[1]##*/}; name=${name//[-_]/ }
      body=$(git log -1 --format=%b "$sha" | sed -E 's/^[[:space:]]+//' | grep -v -m1 -E '^(#|$)' || true)
      (( ${#body} <= 100 )) || body="${body:0:100}..."
      subj="Merged $name"
    else
      body=''
    fi
    echo "* ${subj}${body:+ - $body}"
  done < <(git rev-list --first-parent ${RANGE:-HEAD})
  [[ -z "$PREV_TAG" ]] || printf '\n**Full changelog**: https://github.com/%s/compare/%s...%s\n' "$SLUG" "$PREV_TAG" "$TAG"
} > "$NOTES_FILE"
if (( DRY_RUN )); then
  echo "[dry-run] would run: gh release create $TAG --repo $SLUG --title $TAG --notes-file <file> --verify-tag ${PRERELEASE_FLAG[*]:-}"
  echo "[dry-run] release notes:"; cat "$NOTES_FILE"
elif gh release view "$TAG" --repo "$SLUG" >/dev/null 2>&1; then
  echo "Release exists; skipping."
else
  gh release create "$TAG" --repo "$SLUG" --title "$TAG" --notes-file "$NOTES_FILE" --verify-tag ${PRERELEASE_FLAG[@]+"${PRERELEASE_FLAG[@]}"}
fi

say "Done$( (( DRY_RUN )) && echo " (dry run)"): $TAG"
