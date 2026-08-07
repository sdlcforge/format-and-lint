# Add TypeScript Extension Definitions

## Purpose and scope

Extend fandl's file-extension whitelist to recognize TypeScript and TSX sources, and thread the new
extensions through every place the existing extension exports are consumed for **file discovery**
and **build dependency tracking**.

This task deliberately stops short of the ESLint and prettier configuration changes, which are
tasks 002 and 003. Its output is the vocabulary those tasks import.

Files in scope:

- `src/lib/default-config/js-extensions.mjs` (the extension definitions)
- `src/lib/lib/select-files-from-options.mjs` (default discovery globs and standard ignores)
- `Makefile` (fandl's own build dependency `find` patterns)
- a new unit test for the extension exports

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. `src/lib/default-config/js-extensions.mjs`

The file currently reads, in full:

```js
export const stdExts = ['.js', '.cjs', '.mjs']
export const jsxExts = ['.jsx']
export const allExts = [...stdExts, ...jsxExts]
export const stdExtsStr = stdExts.join(',')
export const jsxExtsStr = jsxExts.join(',')
export const allExtsStr = allExts.join(',')
```

Extend it so that it exports, in addition to the six existing names (all of which keep their current
names and semantics):

| Export | Value | Purpose |
|---|---|---|
| `tsExts` | `['.ts', '.mts', '.cts']` | non-JSX TypeScript, parallel to `stdExts` |
| `tsxExts` | `['.tsx']` | TSX, parallel to `jsxExts` |
| `allTsExts` | `[...tsExts, ...tsxExts]` | every TypeScript extension |
| `jsxLikeExts` | `[...jsxExts, ...tsxExts]` | every extension that may contain JSX |
| `tsExtsStr`, `tsxExtsStr`, `allTsExtsStr`, `jsxLikeExtsStr` | `.join(',')` of the above | brace-glob fragments |

`allExts` must be redefined as `[...stdExts, ...jsxExts, ...allTsExts]` — that is,
`['.js', '.cjs', '.mjs', '.jsx', '.ts', '.mts', '.cts', '.tsx']` — with `allExtsStr` following from
it. Every extension must appear in `allExts` exactly once; `allTsExts` is the single TypeScript
source so `.tsx` is not duplicated.

`.mts` and `.cts` are included deliberately: all three were verified to parse cleanly through
fandl's Babel layer, and `eslint-config-standard-kit`'s own TypeScript config treats them as
first-class. Their inclusion costs nothing.

### 2. `src/lib/lib/select-files-from-options.mjs`

Two changes:

- **Root-index indicators.** `rootSrcIndicatorFiles` is currently
  `['index.js', 'index.mjs', 'index.cjs']`. Add `'index.ts'`, `'index.mts'`, `'index.cts'`, and
  `'index.tsx'` so a TypeScript project rooted on a top-level index file gets the same
  `**/*@(...)` default pattern a JavaScript project gets. Keep the array literal — do not try to
  derive it from `allExts`, since the existing entries are `index.js`/`index.mjs`/`index.cjs` and
  deriving would silently add `index.jsx`, changing behavior for JavaScript projects.
- **Standard ignores.** Add `'**/*.d.ts'` to the `standardIgnores` array. TypeScript declaration
  files are matched by any `**/*.ts` glob, are usually generated output, and are a poor fit for the
  complexity, JSDoc, and `no-unused-vars` rules. Users who do want them linted can already pass
  `--no-standard-ignores`.

The `allExtsMatch` construction (`` `@(${allExts.join('|')})` ``) needs no change — it picks the new
extensions up automatically.

### 3. `Makefile`

Three `find` invocations enumerate source extensions for build dependency tracking:

```make
ALL_JS_FILES_SRC:=$(shell find $(SRC) -name "*.js" -o -name "*.cjs" -o -name "*.mjs")
ALL_LIB_JS_FILES_SRC:=$(shell find $(SRC)/lib -name "*.js" -o -name "*.cjs" -o -name "*.mjs")
ALL_NON_TEST_JS_FILES_SRC:=$(shell find $(SRC) \( -name "*.js" -o -name "*.cjs" -o -name "*.mjs" \) -not -path "**/test/**")
```

Add `-o -name "*.ts" -o -name "*.mts" -o -name "*.cts" -o -name "*.tsx"` to `ALL_JS_FILES_SRC` and
`ALL_LIB_JS_FILES_SRC`, and the same terms **inside the existing parentheses** for
`ALL_NON_TEST_JS_FILES_SRC` (that one already parenthesizes its `-o` group so the trailing
`-not -path` applies to all alternatives; keep that structure intact).

`.jsx` is absent from these patterns today. Adding it is out of scope — do not add it, and do not
"fix" it. Note it in your report instead.

Why this matters even though fandl's own source contains no TypeScript: task 004 adds `.ts`/`.tsx`
fixture files under `src/`, and without this change `make test`/`make lint` will not re-run when
those fixtures are edited.

### 4. Unit test for the extension exports

Add `src/lib/default-config/test/js-extensions.test.mjs` asserting:

- `stdExts`, `jsxExts`, `tsExts`, `tsxExts` have their exact expected contents.
- `allTsExts` and `jsxLikeExts` compose correctly.
- `allExts` contains every extension exactly once (assert no duplicates explicitly — this is the
  regression the composition is most likely to introduce) and covers all four buckets.
- Each `*Str` export equals the comma-join of its array counterpart.

Follow the conventions of the neighbouring test files: ESM, extensionless relative imports, Jest
`describe`/`test`, two-space indent, no semicolons, single quotes, aligned colons in object
literals.

## Validation

- `make test` passes, including the new `js-extensions.test.mjs`.
- `make lint` passes on the changed sources.
- `node -e` (or a scratch test) confirms `allExts` is
  `['.js','.cjs','.mjs','.jsx','.ts','.mts','.cts','.tsx']` with no duplicates.
- `grep -rn "allExts\|stdExts\|jsxExts\|tsExts\|tsxExts\|jsxLikeExts" src/` shows every consumer
  accounted for; confirm no consumer outside `select-files-from-options.mjs` and
  `eslint-config.mjs` exists (`eslint-config.mjs` is task 002's responsibility — do not edit it
  here).
- `make` (build) succeeds and the regenerated `dist/fandl-exec.js` is produced without error.
- Confirm the Makefile edits are syntactically sound: `make -n test` runs without a `find` usage
  error, and `$(shell find ...)` still returns the existing `.mjs` files (a mis-parenthesized `-o`
  chain silently returns the wrong set rather than erroring — check the file count is at least what
  it was before).
- Existing behavior unchanged for JavaScript: the pre-existing tests in
  `src/lib/lib/test/select-files-from-options.test.mjs` pass without modification.

## Assumptions

- fandl's own source tree contains no TypeScript files at task start, so widening `allExts` does not
  cause fandl to begin linting anything new in its own repository. `make lint` should therefore
  report exactly what it reported before.
- Widening `allExts` before tasks 002 and 003 land means a hypothetical TypeScript file linted at
  this exact commit would be handled badly. That is acceptable: fandl is only consumed through
  published releases, no release happens mid-plan, and fandl's own sources are unaffected.

## References

- [TypeScript parsing layer](../notes/typescript-parsing-layer.md) — why `.mts`/`.cts`/`.tsx` all
  parse, and where the extension list is consumed.
- [TypeScript rule conflicts and verified resolution](../notes/typescript-rule-conflicts.md) — the
  `.d.ts` rationale.
- `src/lib/lib/test/select-files-from-options.test.mjs` — existing discovery tests that must keep
  passing.

## Checkpoint hints

- After extending `src/lib/default-config/js-extensions.mjs` and adding its unit test.
- After updating `src/lib/lib/select-files-from-options.mjs`.
- After updating the `Makefile` `find` patterns.
