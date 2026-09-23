# Plan Summary: typescript-support

## What was planned and why

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

## What shipped

### Phase 01 — TypeScript Support

1. **Add TypeScript Extension Definitions** (`001-add-typescript-extension-definitions.md`, tier `sonnet-med`) — Extended js-extensions.mjs with tsExts/tsxExts/allTsExts/jsxLikeExts and widened allExts to all 8 extensions with no duplicates; threaded through select-files-from-options.mjs and the Makefile's find patterns; added a full unit test at 100% coverage. Deliberately did not touch eslint-config.mjs (task 002 scope) or the .jsx Makefile gap (out of scope).
   Commit `7f48943`, merged at `7e3edfe2037eb241f25ea9fb29828b895dc92d86`.

2. **Add TypeScript Eslint Configuration** (`002-add-typescript-eslint-configuration.md`, tier `opus-med`) — Added TypeScript support to fandl's ESLint config via two new TS-scoped flat-config components addressing the three verified rule conflicts (no-undef on type identifiers, circular key-spacing/type-annotation-spacing fixer loop, de-indented enum/namespace bodies) plus TS-aware JSDoc handling. JS behavior provably unchanged. One necessary deviation from the plan's prescribed fix (TSEnumDeclaration vs inert TSEnumBody).
   Commit `a2c0a18`, merged at `769240d366ca4b27b82e83cdbc0e25df6587ff8a`.

3. **Add TypeScript Prettier Parser Selection** (`003-add-typescript-prettier-parser-selection.md`, tier `sonnet-high`) — Replaced the unconditional parser:'babel' with per-file selection via getPrettierConfigFor: babel-ts for TypeScript extensions (from task 001's allTsExts), babel otherwise. Fixes the TypeScript parsing hard-blocker without touching ESLint config (task 002's scope) or formatAndLint's public signature/JSDoc.
   Commit `f20e979`, merged at `d9a975aff579cb3eeb31e17752cdba3a302438b6`.

4. **Add TypeScript Fixture Tests** (`004-add-typescript-fixture-tests.md`, tier `sonnet-high`) — Added end-to-end TS/TSX fixture coverage across lint-detection, format/autofix, and idempotence axes. All 8 new tests pass alongside the 34 pre-existing ones; coverage improved; no production source touched; no defects found in tasks 001-003.
   Commit `10c502e`, merged at `7af55eeb4877d7a269f74d5509230e618a56284f`.

5. **Update TypeScript Documentation** (`005-update-typescript-documentation.md`, tier `sonnet-med`) — Documented fandl's shipped TypeScript/TSX support across README.01.md, README.02.md, DEVELOPER_NOTES.md, and regenerated README.md. Covers default extensions, component list (7 components incl. tsJsdoc/ts), known limitations (no-unused-vars constructor-property false positive, disabled no-undef, no type-aware rules, comma-dangle/enum cosmetic quirk). All docs cross-checked against actual shipped source, not stale plan notes.
   Commit `5f34389`, merged at `6a874b03a28470a57b83050f30d5c2327c1aedf3`.

### Phase 02 — Documentation Updates

1. **Update Architecture Docs** (`001-update-architecture-docs.md`, tier `sonnet-high`) — Conformance-reviewed fandl's architecture/spec documentation (src/docs/README.01.md, src/docs/README.02.md, generated README.md, DEVELOPER_NOTES.md) against the shipped Phase 01 TypeScript/TSX work. Everything task 005 wrote was already accurate and cross-checks clean against the shipped source. Found and fixed one real staleness: a stale 'future work' bullet in README.02.md. Regenerated README.md cleanly (one-line diff, no JSDoc churn); make test and make lint both pass.
   Commit `da13869`, merged at `b0218c1adcd462cfd03afac89057df5144bce13b`.

### Phase 03 — CLI Rule Exemption

1. **Add CLI Rule Exemption** (`001-add-cli-rule-exemption.md`, tier `opus-med`) — Added the cli ESLint config component (no-console/no-process-exit off for **/cli/** paths and *-cli basename files), wired into getEslintConfig between ts and additional ([base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]), pinned with six new fixture/unit tests (42 -> 48 total), and documented in the README source (regenerated, not hand-edited). make test and make lint both green.
   Commit `65e9c0d`, merged at `86ea84c1375014b4c52cd0995643e7429b2f51f4`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`VtkJ`** — **PLAN-ARTIFACT DEFECT: plan/notes/typescript-r** — PLAN-ARTIFACT DEFECT: plan/notes/typescript-rule-conflicts.md and task 002's own Requirement 2 prescribe 'TSEnumBody' which is inert under @babel/eslint-parser (it emits TSEnumDeclaration, not TSEnumBody) - the implementer added TSEnumDeclaration instead. Task 005 (documentation) must describe the actual shipped fix (TSEnumDeclaration), not the plan note's inert prescription.

- **`RwsR`** — **Known limitation confirmed for task 005 to do** — Known limitation confirmed for task 005 to document: no-unused-vars false-positives on TS constructor parameter properties (e.g. `constructor(public name: string)`) even though used via `this`; args:'none' deliberately not added per the task's own instruction to keep the default.

- **`LA4q`** — **Minor: plan doc's fixture-C 'expected output'** — Minor: plan doc's fixture-C 'expected output' pairing with a single-line source fixture isn't reachable as prettier (printWidth 120) keeps that source on one line - output is still correct, just unpadded. Doc/fixture pairing is slightly off; not an implementation defect.

- **`p06R`** — **Follow-up candidate (out of scope for this ta** — Follow-up candidate (out of scope for this task): @stylistic/comma-dangle strips trailing commas from multiline enum bodies since fandl's comma-dangle options don't name 'enums' (or 'generics'/'tuples'). Cosmetic only, file content byte-stable.

- **`8Wi2`** — **Minor robustness note (out of scope): src/lib** — Minor robustness note (out of scope): src/lib/default-config/eslint-config.mjs's babelConfigPathTest fallback is a relative path that fails when the module is imported from outside this repo's cwd; harmless for all shipped paths since the installed dist/ layout hits the absolute branch first.

- **`EB9P`** — **plan/notes/typescript-rule-conflicts.md remai** — plan/notes/typescript-rule-conflicts.md remains stale on the TSEnumBody-vs-TSEnumDeclaration point; will be corrected as part of task 005's documentation pass.

- **`azET`** — **plan/notes/typescript-rule-conflicts.md still** — plan/notes/typescript-rule-conflicts.md still states TSEnumBody; shipped code uses TSEnumDeclaration. New user-facing docs are correct but the note itself wasn't in this task's file scope. Consider a follow-up to correct the note file directly.

- **`y0Tu`** — **src/lib/format-and-lint.mjs's JSDoc on option** — src/lib/format-and-lint.mjs's JSDoc on options.eslintConfigComponents still lists only the original 5 component keys, not tsJsdoc/ts — that file wasn't in this task's scope (task 003 was required to leave its JSDoc untouched). Worth a follow-up to update that JSDoc comment so the generated API reference lists all 7 keys.

- **`t0xt`** — **eslint-config.mjs at max-lines cap** — src/lib/default-config/eslint-config.mjs is now at exactly 300 counted lines against its own 'max-lines' rule cap (max: 300, skipBlankLines/skipComments) — landed at the edge by the phase-03 cli-rule-exemption task, which had to inline a files-array literal instead of hoisting a const specifically to stay under the cap. The next line of code added to this file will fail `make lint`. Split the file (e.g. extract each named config component — base/jsdoc/jsx/test/ts/tsJsdoc/cli — into its own module) before adding another component, rather than raising the cap.

- **`iTol`** — **cli-rule-exemption minor notes** — Two minor notes from the cli-rule-exemption task (informational, no action forced): (1) the `**/cli/**` glob matches everything under any `cli/` directory, not just entrypoint scripts -- e.g. library helpers like src/cli/lib/*.mjs also lose no-console/no-process-exit, which is what the task doc specified but is broader than the "entrypoints" framing implies; consumers with a large cli/ tree should be aware. (2) plan/phase-03-cli-rule-exemption/001-add-cli-rule-exemption.md's requirement-2 code snippet shows a pre-phase-01 getEslintConfig signature (missing the ts/tsJsdoc components phase-01 added) -- stale if that doc is ever reused as a reference.

- **`uWT9`** — **Recommendation only, not actioned: a dedicate** — Recommendation only, not actioned: a dedicated docs/architecture.md is now warranted for fandl. A full proposed outline is recorded in the task document's Status section for the maintainer to act on or decline. Creating it was out of this task's scope per the task doc's own instruction.

- **`xBLY`** — **Pre-existing, unrelated to this plan: phase-0** — Pre-existing, unrelated to this plan: phase-03 (cli-rule-exemption) shows done: false in plan/TODO.yaml despite having a populated merge SHA and its commits already present in this branch's history (86ea84c, 65e9c0d, f824625). Not something the task agent touched or investigated further, but the manager may want to reconcile TODO.yaml's bookkeeping for that task.

- **`TNYF`** — **src/docs/*.md orphaned from README link chain** — Phase-02 link-chain gate: src/docs/README.01.md and src/docs/README.02.md are not linked from README.md or any other project doc, so the link-chain reachability check flags them as orphans (minor, medium confidence). Structurally these are README build-source fragments (Makefile copies/cats them into the generated README.md), not separate reader-facing docs, so the content itself isn't lost — but the literal link-chain rule keeps flagging them. Recommendation: either document (in README.md's build/contributing notes, or in DEVELOPER_NOTES.md) that src/docs/*.md are generator-input fragments exempt from the link-chain rule the way plan/** is exempted, or add a lightweight link from README.md if a build/contributing section exists. Judgment call for the maintainer, not a mechanical fix.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — TypeScript Support

- [x] [001-add-typescript-extension-definitions.md](./phase-01-typescript-support/001-add-typescript-extension-definitions.md) — tier `sonnet-med` · branch `plan/typescript-support-01-001` · commit `7f48943` · merge `7e3edfe2037eb241f25ea9fb29828b895dc92d86`
- [x] [002-add-typescript-eslint-configuration.md](./phase-01-typescript-support/002-add-typescript-eslint-configuration.md) — tier `opus-med` · branch `plan/typescript-support-01-002` · commit `a2c0a18` · merge `769240d366ca4b27b82e83cdbc0e25df6587ff8a`
- [x] [003-add-typescript-prettier-parser-selection.md](./phase-01-typescript-support/003-add-typescript-prettier-parser-selection.md) — tier `sonnet-high` · branch `plan/typescript-support-01-003` · commit `f20e979` · merge `d9a975aff579cb3eeb31e17752cdba3a302438b6`
- [x] [004-add-typescript-fixture-tests.md](./phase-01-typescript-support/004-add-typescript-fixture-tests.md) — tier `sonnet-high` · branch `plan/typescript-support-01-004` · commit `10c502e` · merge `7af55eeb4877d7a269f74d5509230e618a56284f`
- [x] [005-update-typescript-documentation.md](./phase-01-typescript-support/005-update-typescript-documentation.md) — tier `sonnet-med` · branch `plan/typescript-support-01-005` · commit `5f34389` · merge `6a874b03a28470a57b83050f30d5c2327c1aedf3`

### Phase 02 — Documentation Updates

- [x] [001-update-architecture-docs.md](./phase-02-doc-updates/001-update-architecture-docs.md) — tier `sonnet-high` · branch `plan/typescript-support-02-001` · commit `da13869` · merge `b0218c1adcd462cfd03afac89057df5144bce13b`

### Phase 03 — CLI Rule Exemption

- [x] [001-add-cli-rule-exemption.md](./phase-03-cli-rule-exemption/001-add-cli-rule-exemption.md) — tier `opus-med` · branch `plan/typescript-support-03-001` · commit `65e9c0d` · merge `86ea84c1375014b4c52cd0995643e7429b2f51f4`
