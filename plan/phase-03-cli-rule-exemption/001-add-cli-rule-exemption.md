# Add CLI Rule Exemption

## Purpose and scope

Two rules in the shared base ESLint config — `no-console` (`eslint-config.mjs` line 204) and
`no-process-exit` (spread in from `nodePlugin.configs.recommended.rules` at the `engines?.node`
block, roughly line 280) — apply to every file fandl lints. Both are right for library code and
wrong for CLI entrypoints, whose entire job is printing to the console and exiting with a status
code. Today a project with both kinds of code in one lint run has no way to get correct behavior
out of a single `fandl`/`make lint` invocation: the rule is either on everywhere (CLI files get
false-positive findings) or off everywhere (library code loses a real correctness/hygiene check).

Add a new, distinct config component — parallel to the existing `base`/`jsdoc`/`jsx`/`test`/
`additional` components `getEslintConfig` already exposes — that turns `no-console` and
`no-process-exit` off for files matching either of two independent signals, and leaves them at
`'error'` (from `base`) for everything else:

1. **A `cli/` path segment** — `**/cli/**` — matching this package's own `src/lib` + `src/cli`
   layout convention.
2. **A `-cli` basename suffix** — e.g. `eval-flow-cli.js`, `bump-version-cli.ts` — for a single-file
   script that does not warrant a lib/cli directory split.

This lets one `fandl`/`make lint-fix` invocation "do the right thing" per file without the caller
having to pre-filter anything. Discovered via `sdlcforge/flow`'s adopt-fandl plan (phase-01
task-002), which hit exactly this false-positive pattern on its own CLI/e2e entrypoint scripts and
halted rather than disabling the rules wholesale — see
[the halt note appended to that task's doc](/Users/zane/playground/sdlcforge/flow/worktrees/plan/adopt-fandl/plan/phase-01-adopt-fandl/002-run-fandl-and-resolve-findings.md)
for the exact finding counts if useful context, but that project's files are not in scope here —
this task only touches `format-and-lint`.

Only `src/lib/default-config/eslint-config.mjs`, its test fixtures, and `README.md`
(regenerated, not hand-edited — see requirement 4) are in scope.

## Requirements

### 1. Add a `defaultCliConfig` component

In `src/lib/default-config/eslint-config.mjs`, add a new config object following the same shape as
`defaultJsxConfig`/`defaultTestsConfig`:

```js
const cliFilePatterns = [
  '**/cli/**',
  `**/*-cli{${allExtsStr}}`,
]

const defaultCliConfig = {
  files : cliFilePatterns,
  rules : {
    // CLI entrypoints exist to print to the console and exit with a status code -- both rules are
    // false positives here. Library/business-logic code (everything NOT matching this component's
    // `files` glob) keeps both rules at 'error' via the base component.
    'no-console'      : 'off',
    'no-process-exit' : 'off',
  },
}
```

Place it after `defaultTestsConfig`'s definition and before `getEslintConfig`. Reuse `allExtsStr`
(already imported from `./js-extensions` at line 27) for the suffix pattern — do not hand-roll a
second extension list.

**Ordering matters.** ESLint flat config applies later array entries' matching rules over earlier
ones for the same file. `defaultCliConfig` must appear **after** `defaultBaseConfig` in the array
`getEslintConfig` assembles (requirement 2), or its `'off'` overrides will not win against base's
`'error'`.

### 2. Wire it into `getEslintConfig`

Update the function's default-parameter destructuring and the assembled array:

```js
const getEslintConfig = ({
  additional = {},
  base = defaultBaseConfig,
  jsdoc = defaultJsdocConfig,
  jsx = defaultJsxConfig,
  test = defaultTestsConfig,
  cli = defaultCliConfig,
} = {}) => {
  const eslintConfig = [base, jsdoc, jsx, test, cli, additional]

  return eslintConfig
}
```

`additional` stays last so a caller-supplied override still wins over every named component,
matching current behavior. This makes `cli` a sixth named key in the `eslintConfigComponents`
option `formatAndLint()` already documents (per `README.md`'s "Component based configuration"
section) — a caller can override or disable it (e.g. `eslintConfigComponents: { cli: {} }` to turn
the exemption off) the same way they can any other named component today.

### 3. Do not touch `defaultBaseConfig`'s `rules`

`no-console` and `no-process-exit` stay exactly as they are in the shared `rules` object (line 204
and the `engines?.node` block). The new component overrides them per-file; it does not change the
base definition. This keeps every non-CLI file's behavior byte-for-byte unchanged.

### 4. Document the new component

In `src/docs/README.01.md` or `README.02.md` (whichever currently holds the "Component based
configuration" prose — check both; do not hand-edit the generated `README.md` itself, which
`make build`/the `$(README_MD)` rule regenerates from these sources plus jsdoc2md output), add `cli`
to the list of five components, with the two-signal matching rule (`cli/` path segment or `-cli`
basename suffix) and the two rules it turns off. Follow the existing prose style for the other four
components' descriptions in that section.

### 5. Add fixture/unit tests

Add test fixtures alongside the existing ones under `qa`/`src/lib/**/test` (match whatever fixture
convention `004-add-typescript-fixture-tests` used — check
`plan/phase-01-typescript-support/004-add-typescript-fixture-tests.md` and its landed diff for the
pattern before inventing a new one). At minimum:

- A file matching `**/cli/**` (e.g. `cli/example.js`) containing a bare `console.log(...)` and a
  bare `process.exit(0)` — assert `formatAndLint()` reports **no** `no-console` or `no-process-exit`
  finding for it.
- A file matching `**/*-cli.js` (e.g. `example-cli.js`) with the same two statements — same
  assertion.
- A sibling non-CLI file (e.g. `lib/example.js` or just `example.js`, not matching either pattern)
  with the same two statements — assert it **does** get both findings, proving the exemption is
  scoped and not accidentally global.
- One test asserting `eslintConfigComponents: { cli: {} }` (or equivalent override) turns the
  exemption off, per requirement 2's override-compatibility claim.

## Validation

1. `make test` passes, including the new fixtures.
2. `make lint` exits 0 against this package's own source (dogfooding).
3. Manually confirm ordering: temporarily assert (in a scratch test or via the fixture above) that
   a `cli/`-matching file's `no-console`/`no-process-exit` are `'off'` in the resolved config, not
   merely present-and-overridden-back — i.e. that `defaultCliConfig` truly sits after `base` in the
   array `getEslintConfig` returns.
4. `grep -n "'cli'" src/lib/default-config/eslint-config.mjs` shows the new component wired into
   both the destructuring defaults and the assembled array.
5. `README.md`'s "Component based configuration" section (after a `make build` regen) lists the
   `cli` component.

## Assumptions

- Phase 1 (TypeScript support) has landed on this same plan branch — `allExtsStr` already covers
  `.ts`/`.tsx`/etc. This task's `cliFilePatterns` suffix glob (`**/*-cli{${allExtsStr}}`) therefore
  matches CLI-suffixed TypeScript files too, with no extra work.
- No existing test fixture is named in a way that collides with the new `cli/` or `-cli` patterns
  (verify with a quick `find` before adding fixtures; rename if a collision would produce a
  confusing false pass).
- This task does not touch, rename, or otherwise modify any file in `sdlcforge/flow` — that
  project's own CLI-file renames/moves (if any) are separately tracked there once this feature is
  available to consume (via `bun link` during development, later via a real published version).

## References

- `src/lib/default-config/eslint-config.mjs` — the file this task edits.
- `plan/phase-01-typescript-support/002-add-typescript-eslint-configuration.md` — the most recent
  precedent for adding a new files-scoped config component to this same file; follow its structure
  and comment style.
- `README.md` "Component based configuration" section — the five-component description this task
  extends to six.

## Checkpoint hints

- After the `defaultCliConfig` component and `getEslintConfig` wiring land, before writing fixtures.
- After the fixture tests pass.
- After the README source doc update and a `make build` regen confirms it renders correctly.

## Status

**Outcome:** succeeded — 2026-08-07.

Added the `cli` config component, wired it into `getEslintConfig`, pinned it with six new
fixture/unit tests (42 → 48 total), and documented it in the README source. `make test` and
`make lint` are both green.

**Files touched (repo-relative):**
- `src/lib/default-config/eslint-config.mjs` — new `defaultCliConfig` (`files : ['**/cli/**',
  '**/*-cli{<allExtsStr>}']`, `no-console`/`no-process-exit` both `'off'`), a new `cli` key in
  `getEslintConfig`'s destructuring defaults, and `cli` inserted into the assembled array between
  `ts` and `additional`: `[base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]`.
  `defaultBaseConfig`'s `rules` object was not touched.
- `src/lib/default-config/test/eslint.config.test.mjs` — three new `lintTests` rows plus two new
  tests (a `calculateConfigForFile` ordering assertion and a `getEslintConfig({ cli : {} })`
  override-disables-the-exemption assertion).
- `src/lib/default-config/test/data/cli-dir-exempt/cli/index.mjs`,
  `src/lib/default-config/test/data/cli-suffix-exempt/example-cli.mjs`,
  `src/lib/default-config/test/data/cli-rules-apply/index.mjs` — new fixtures, identical bodies
  (`console.log(...)` + `process.exit(0)`), differing only in path/basename.
- `src/docs/README.02.md` — "Component based configuration" now describes 8 components including
  `cli`, the assembled-array snippet and the order-matters paragraph both include `cli`, and a new
  paragraph documents `eslintConfigComponents: { cli: {} }` as the way to turn the exemption off.
- `README.md` — regenerated by `make build` (not hand-edited).
- `src/cli/fandl.mjs` — see the out-of-stated-scope note below.

**Two changes beyond the stated file scope, both forced by Validation check 2 (`make lint` exits
0):**

1. `src/cli/fandl.mjs` line 63: removed the now-dead `// eslint-disable-line no-process-exit`
   directive. `src/cli/**` matches the new `**/cli/**` pattern, so the rule is off there and the
   directive became an "Unused eslint-disable directive" warning. `fandl lint` exits 1 on *any*
   output, warnings included, so `make lint` failed until this was removed. This is dogfooding
   evidence that the feature works, but it is an edit to a file the task doc's scope statement did
   not list.
2. `defaultCliConfig` inlines its `files` array rather than hoisting a `cliFilePatterns` const as
   the requirement-1 snippet showed. The hoisted const pushed `eslint-config.mjs` to 301 counted
   lines against its own `max-lines` cap of 300 (`skipBlankLines`/`skipComments`), failing
   `make lint`. Inlining sheds exactly the one line needed. **The file now sits at exactly 300 —
   the next line of code added to it will fail `make lint`.** Flagged for follow-up.

**Validation performed:**
1. `make test` — 10 suites / 48 tests passed (42 before). Coverage held: all-files stmts 96.98%,
   branch 76.92%, funcs 96.15%, lines 96.89%.
2. `make lint` — exit 0, no output.
3. Ordering confirmed two ways: (a) a committed test asserts
   `calculateConfigForFile(...).rules['no-console'][0] === 0` and the same for `no-process-exit`,
   for both a `cli/`-path file and a `-cli`-suffix file — i.e. the resolved severity really is
   `off`, not merely reported-then-overridden; (b) temporarily reordering the array to
   `[cli, base, ...]` made 4 of the 12 tests in that suite fail (both resolved-config tests and
   both exempt-fixture tests), then the file was restored — `git status` clean afterward.
4. `grep -n "'cli'" src/lib/default-config/eslint-config.mjs` matches only comment text, because
   this codebase wires config components as bare identifiers, not string literals (no component —
   `jsx`, `ts`, `test` — appears quoted). The intent of the check is satisfied:
   `grep -n "cli" src/lib/default-config/eslint-config.mjs` shows line 424 (`cli =
   defaultCliConfig,` in the destructuring defaults) and line 431 (`cli` in the assembled array).
5. `README.md`'s "Component based configuration" section lists `cli` after the `make build` regen
   (line 153); the regen diff touched nothing but that section.

**Assumptions applied:** phase-01 has landed and `allExtsStr` covers the TypeScript extensions
(verified in `js-extensions.mjs`); no pre-existing fixture collides with the `cli/` or `-cli`
patterns other than the package's own `src/cli/` tree, whose `test/data/**` fixtures are already
excluded from `make lint` by `standardIgnores`; no file in `sdlcforge/flow` was touched.
