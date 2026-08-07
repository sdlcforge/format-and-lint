# TypeScript and TSX Support

## Purpose and scope

Add first-class TypeScript (`.ts`, `.mts`, `.cts`) and TSX (`.tsx`) support to
`@sdlcforge/format-and-lint` (fandl), so that TypeScript sources receive the same prettier
formatting plus syntax-level ESLint treatment that fandl already gives `.js`/`.cjs`/`.mjs`/`.jsx`.

This is a hard blocker for a downstream rollout of fandl into six ModuleForge React/TypeScript GUI
projects (`mod-core`, `mod-contacts`, `mod-tasks`, `mod-users`, `mod-tags`, `app-mftodo`), which are
essentially 100% `.tsx` component code that fandl currently does not process at all.

### What must change

1. The file-extension whitelist in `src/lib/default-config/js-extensions.mjs` must recognize
   TypeScript extensions, and every consumer of those exports must be threaded through — the CLI's
   default file-discovery globs, the ESLint config's `files` globs, the `babel-module` import
   resolver's `extensions` list, and fandl's own `Makefile` `find` patterns.
2. A TypeScript-scoped ESLint config component must be added to resolve the rule conflicts that a
   naive extension-list change exposes. This is the substance of the work, not a detail — see
   [TypeScript rule conflicts and verified resolution](./notes/typescript-rule-conflicts.md).
3. Prettier's parser must be selected per file. `src/lib/format-and-lint.mjs` hardcodes
   `parser: 'babel'`, which cannot parse TypeScript at all.
4. Representative `.ts` and `.tsx` fixture tests must cover both lint detection and autofix, per
   fandl's existing 97% coverage bar.
5. User-facing documentation (`src/docs/README.01.md`, `src/docs/README.02.md`, and the regenerated
   `README.md`) must describe the new extensions, the new config component, and the known
   limitations.

### What must not change

- **Type-aware linting stays out of scope.** No `@typescript-eslint/parser` and no
  `@typescript-eslint/eslint-plugin` wiring, no `tsconfig.json` requirement, no TypeScript type
  checker in the lint path. The goal is syntax-level linting plus prettier formatting, matching what
  fandl already does for JavaScript.
- **Behavior for existing `.js`/`.cjs`/`.mjs`/`.jsx` sources must be unchanged.** Every new rule
  override is scoped to a TypeScript-only `files` glob. fandl's existing test suite must pass
  untouched.
- **No new runtime dependencies.** The Babel TypeScript preset and prettier's `babel-ts` parser are
  both already available; see [TypeScript parsing layer](./notes/typescript-parsing-layer.md).
- **No changes to downstream consumer projects.** `sdlcforge/flow` and the six ModuleForge GUI
  projects are separately tracked and will consume this package's next published version.
- **Do not repair the `eslint-config-standard-kit` array-consumption defect** described in
  [the standard-kit note](./notes/standard-kit-typescript-flag.md). Fixing it would activate 244
  previously-inactive rules across all JavaScript sources and would pull in type-aware TypeScript
  linting — a sweeping, unrelated behavior change.

### Success criteria

- `fandl` and `fandl lint` discover and process `.ts`, `.mts`, `.cts`, and `.tsx` files under the
  default discovery patterns, with no `--files` override required.
- Idiomatic TypeScript and TSX sources produce **zero spurious diagnostics** — no `no-undef` on type
  identifiers, no circular-fix warnings, no de-indented `enum` bodies, no JSDoc type demands, no
  unresolved local `./foo` imports resolving to `foo.ts`.
- Genuine diagnostics still fire on TypeScript sources (`no-unused-vars`, `prefer-regex-literals`,
  `@stylistic/comma-dangle`, and the rest of the existing rule set).
- Formatting is idempotent: a second full prettier-then-ESLint pass over an already-formatted `.ts`
  or `.tsx` file produces byte-identical output.
- fandl's house aligned-colon object-literal style is preserved in TypeScript sources, while type
  annotations use idiomatic TypeScript spacing.
- `make qa` (test + lint) passes.

## Current status

Planning is complete and all investigation questions from the change request have been answered
empirically against the working tree at `1.0.0-alpha.31`. Execution begins at **Phase 01 —
TypeScript Support**, task `001-add-typescript-extension-definitions`. No pre-conditions block the
start.

Three findings materially shaped the plan and are recorded in `plan/notes/`:

- [TypeScript parsing layer](./notes/typescript-parsing-layer.md) — the Babel layer already ships
  `@babel/preset-typescript` and needs no change; prettier's hardcoded `babel` parser is a second
  hard blocker the change request did not anticipate.
- [TypeScript rule conflicts and verified resolution](./notes/typescript-rule-conflicts.md) — a
  whitelist-only change yields an unusable result; the exact three-rule override set that fixes it
  has been verified end to end.
- [`eslint-config-standard-kit` and its `typescript: true` flag](./notes/standard-kit-typescript-flag.md)
  — that flag is a total no-op, and repairing the underlying defect is deliberately out of scope.

Two items need a maintainer decision but do not block execution; each task document implements the
recommended default and names the alternative:

- **`no-unused-vars` on TypeScript constructor parameter properties.** A hard false positive that
  only `args: 'none'` clears, at the cost of unused-argument detection across all TypeScript
  sources. Recommendation: keep the default and document the limitation.
- **Version bump and release.** fandl is at `1.0.0-alpha.31` and consumers pin exact alpha versions,
  so this feature needs a publish (`1.0.0-alpha.32`) before any downstream project can adopt it. No
  task performs the bump: `package.json` wires `preversion` to `make test && make lint`, so the
  release runs through `npm version prerelease` at the maintainer's hand after this plan merges. A
  task agent hand-editing `version` or running `npm version` on a task branch would create a stray
  tag and commit.

## Overview

A single implementation phase followed by the standard documentation-conformance phase.

### Phase 01 — TypeScript Support (5 tasks)

Extends the extension surface, adds the TypeScript ESLint and prettier handling, proves it with
fixtures, and documents it.

1. **`001-add-typescript-extension-definitions`** — Add TypeScript extension buckets to
   `src/lib/default-config/js-extensions.mjs` (`tsExts`, `tsxExts`, `allTsExts`, `jsxLikeExts` and
   their `*Str` forms), extend `allExts`, thread the new extensions through
   `src/lib/lib/select-files-from-options.mjs` (root-index indicators, `**/*.d.ts` standard ignore),
   and update fandl's own `Makefile` `find` patterns. Adds a unit test for the exports.
2. **`002-add-typescript-eslint-configuration`** — The crux. Add a TypeScript-scoped config
   component and a TypeScript-flavored JSDoc component to
   `src/lib/default-config/eslint-config.mjs`, widen the browser-globals component to cover `.tsx`,
   add TypeScript extensions to the `babel-module` import resolver, and expose the new components
   through `getEslintConfig`'s component options.
3. **`003-add-typescript-prettier-parser-selection`** — Replace the hardcoded `parser: 'babel'` in
   `src/lib/format-and-lint.mjs` with per-file extension-driven selection (`babel-ts` for
   TypeScript, `babel` otherwise).
4. **`004-add-typescript-fixture-tests`** — Add `.ts` and `.tsx` fixture directories and tests
   covering lint detection, autofix, and formatting idempotence.
5. **`005-update-typescript-documentation`** — Update `src/docs/README.01.md` and
   `src/docs/README.02.md`, regenerate `README.md`, and record the known limitations.

**Dependencies and parallelism.** Task 001 must land first — 002 and 003 both consume its exports.
**Tasks 002 and 003 are parallel-eligible**: they touch disjoint files
(`src/lib/default-config/eslint-config.mjs` versus `src/lib/format-and-lint.mjs`) and neither reads
the other's output. Task 004 requires both 002 and 003. Task 005 runs last, since regenerating
`README.md` must reflect the final JSDoc state of the source tree.

### Phase 02 — Documentation Updates (1 task)

The standard architecture-conformance review, triggered because this plan changes a documented
public API surface: `getEslintConfig`'s component-based configuration gains new components, and the
set of file extensions fandl processes by default changes.

1. **`001-update-architecture-docs`** — Review fandl's architecture and specification documentation
   against the shipped change. Note that this repository has no `docs/` directory: its architectural
   surface is documented in `src/docs/README.02.md` (component-based configuration, reformatting
   process overview), which `README.md` is generated from.
