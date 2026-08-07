# Update TypeScript Documentation

## Purpose and scope

Document fandl's new TypeScript and TSX support for consumers: the extensions now processed by
default, the new configuration components, the TypeScript style behavior, and the known limitations.

`README.md` is **generated** by the Makefile's `$(README_MD)` target, which concatenates
`src/docs/README.01.md`, `npx jsdoc2md` output over `src/**/*`, and `src/docs/README.02.md`. Edit
the two `src/docs/` fragments and regenerate — never hand-edit `README.md`.

Files in scope: `src/docs/README.01.md`, `src/docs/README.02.md`, `DEVELOPER_NOTES.md`, and the
regenerated `README.md`.

## Requirements

### 1. `src/docs/README.01.md` — usage-facing

- The CLI example at line 29 reads
  `npx fandl --files '**/weird-src/**/*.{js,mjs,cjs,jsx}' # specify files pattern`. Update it to
  include the TypeScript extensions.
- Add a short subsection stating which extensions fandl processes by default:
  `.js`, `.cjs`, `.mjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`. State plainly that `.d.ts`
  declaration files are excluded by the standard ignores and can be included with
  `--no-standard-ignores`.
- State the scope of TypeScript support explicitly, because the boundary matters to adopters:
  **syntax-level linting and prettier formatting only**. fandl does not run the TypeScript type
  checker, requires no `tsconfig.json`, and enables no type-aware lint rules. Consumers should keep
  running `tsc --noEmit` (or equivalent) separately.
- Keep the existing table-of-contents list at lines 6–12 in sync with any new heading you add.

### 2. `src/docs/README.02.md` — configuration-facing

- The "Component based configuration" section lists five components (`base`, `jsdoc`, `jsx`, `test`,
  `additional`). Update it for the components task 002 adds: `ts` (TypeScript rule overrides) and
  `tsJsdoc` (TypeScript-flavored JSDoc rules). Describe what each does and note that `jsx` now
  covers `.tsx` as well as `.jsx` (it supplies browser globals).
- Document the component **ordering**, since callers overriding one component need to know what wins
  for a TypeScript file: `[base, jsdoc, tsJsdoc, jsx, test, ts, additional]`.
- The "Reformatting process overview" section documents fandl's aligned-colon house style. Add a
  TypeScript note: object literals keep the aligned-colon style in TypeScript sources, while **type
  annotations use idiomatic TypeScript spacing** (`hostName: string`, not `hostName : string`).
  Show the contrast, which is the thing an adopter will notice first:

  ```ts
  interface Config {
    hostName: string          // idiomatic TS: no space before the colon
    aVeryLongPortName?: number
  }

  export const defaults: Config = {
    hostName          : 'localhost',   // fandl house style: aligned colons
    aVeryLongPortName : 8080,
  }
  ```

- Add a "Known TypeScript limitations" subsection covering:
  - **`no-unused-vars` and constructor parameter properties.** `constructor(public name: string)`
    reports `'name' is defined but never used` even when `this.name` is used, because
    `@babel/eslint-parser`'s scope analysis does not link a parameter property to its generated
    class field. Workaround: `// eslint-disable-next-line no-unused-vars`. fandl keeps
    unused-argument detection on for TypeScript deliberately.
  - **`no-undef` is disabled for TypeScript files.** Core `no-undef` cannot see the TypeScript type
    namespace and reports every type identifier as undefined. Undefined-identifier checking for
    TypeScript is the type checker's job.
  - **No type-aware rules.** Restate the boundary from requirement 1.

### 3. `DEVELOPER_NOTES.md` — maintainer-facing

Add a section recording the `eslint-config-standard-kit` finding, so the next maintainer does not
rediscover it or "fix" it unknowingly: `standardConfig()` in v1.0.0 returns a flat-config **array**,
not a plugin object, so `standardPlugin.rules` is `undefined` and none of its 244 rules are actually
in effect; the adjacent `delete rules[...]` block deletes keys that were never added; and repairing
it would both activate those 244 rules across all JavaScript sources and switch TypeScript files
onto `@typescript-eslint/parser` with `projectService: true` (full type-aware linting, requiring a
`tsconfig.json` in every consumer project).

This fits the file's existing character — it already records the "Dropping standard rules" and
"Weird dependency" gotchas in the same spirit.

### 4. Regenerate `README.md`

Run `make README.md` (or `make build`, which depends on it). Requires `npx jsdoc2md` and the
`dmd-readme-api` plugin, both already devDependencies.

Review the regenerated diff: the JSDoc-derived middle section should change only where task 003's
work touched a documented JSDoc block — and task 003 was required to leave `formatAndLint`'s JSDoc
untouched, so ideally that section is unchanged. Unexpected churn in the generated middle means
something upstream changed a doc comment; investigate rather than committing it blind.

### 5. Do not change the coverage badge

The `[![coverage: 97%]...]` badge at `src/docs/README.01.md` line 2 is generated content managed
through `.sdlc-data.yaml` by an external badge builder. Leave it alone even if measured coverage
has shifted.

## Validation

- `make README.md` regenerates cleanly with no jsdoc2md errors.
- `git diff README.md` shows the expected content changes from `src/docs/README.01.md` and
  `src/docs/README.02.md`, and no unexplained churn in the JSDoc-generated middle section.
- `make lint` and `make test` still pass (documentation-only changes should not affect either, but
  the Makefile's `$(README_MD)` target depends on `$(ALL_NON_TEST_JS_FILES_SRC)`, so confirm the
  regeneration did not itself perturb anything).
- Every extension listed in the docs matches `allExts` in
  `src/lib/default-config/js-extensions.mjs` exactly — cross-check the two lists element by element.
- Every component name listed in `src/docs/README.02.md` matches the destructured parameter names in
  `getEslintConfig` in `src/lib/default-config/eslint-config.mjs`, and the documented ordering
  matches the array that function returns.
- The documented type-annotation-versus-object-literal example matches the actual
  `index.formatted.txt` expectation committed by task 004 — if they disagree, the docs are wrong.
- `grep -rn "js,mjs,cjs,jsx" src/docs/ README.md` returns no stale extension lists.

## Assumptions

- Tasks 001–004 have all landed; this task documents their shipped behavior rather than a plan.
- `npx jsdoc2md` and the `dmd-readme-api` plugin work in the task worktree. If `node_modules` is not
  provisioned there, install before regenerating.
- No version bump is performed in this task. The release (`1.0.0-alpha.32`) runs through
  `npm version prerelease` at the maintainer's hand after the plan merges — a task agent must not
  hand-edit `package.json`'s `version` field or run `npm version`, either of which would create a
  stray commit and tag on a task branch.

## References

- [TypeScript rule conflicts and verified resolution](../notes/typescript-rule-conflicts.md) — the
  source for the style contrast example and the `no-unused-vars` limitation text.
- [`eslint-config-standard-kit` and its `typescript: true` flag](../notes/standard-kit-typescript-flag.md)
  — the source for the `DEVELOPER_NOTES.md` section.
- `Makefile` lines 92–106 — the `$(README_MD)` generation target.

## Checkpoint hints

- After updating `src/docs/README.01.md`.
- After updating `src/docs/README.02.md`.
- After adding the `DEVELOPER_NOTES.md` section.
- After regenerating `README.md` and reviewing its diff.
