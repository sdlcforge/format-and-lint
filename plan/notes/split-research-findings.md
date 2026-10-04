# eslint-config.mjs split: findings (read-only research)

> Planning note: copied verbatim from the research pass. The plan deviates in two places: the tests component file is named `tests.mjs` (not `test.mjs`), and the equivalence snapshot (not mentioned here) is added in task 001. Line numbers refer to the pre-split file.

File: src/lib/default-config/eslint-config.mjs, 443 lines total. The `max-lines` rule counts only non-blank, non-comment lines (limit 300), so the real count is roughly 330. The disable comment at line 11 hides that.

## Current structure (line ranges)
- 1-30: header and imports (~20 code lines)
- 31-52: `babelConfigPath` resolution (throws if not found) and `package.json` read at module load (~22)
- 54-93: `standardPlugin` (inert, CAUTION comment), `usesReact`/`reactSettings`, `stylisticConfig`, `plugins` (~30 code, ~15 comment)
- 95-119: `baseIndentOptions` (25)
- 121-264: `rules` table plus the `delete rules[...]` block (~110 code; the biggest chunk)
- 266-312: `allFiles`, `defaultBaseConfig`, and the `engines?.node` mutation (~45)
- 314-343: jsdoc and tsJsdoc (~30)
- 345-361: jsx, tests (~17)
- 363-420: ts, cli (~35 code, ~25 comment)
- 422-443: `getEslintConfig` and its export (~20, with ordering comment)

## Public surface
- The only export is `getEslintConfig`. The module has no other exports.
- The `default*Config` consts are module-private and are not tested directly.

## Proposed layout
Keep `eslint-config.mjs` as the assembler and the public path, so no importer changes. Put the parts in a new sibling directory, `src/lib/default-config/eslint-components/`. The existing `lib/` dir is for helpers, so `components/` or `eslint/` would also work.

| file | contents | ~code lines |
|---|---|---|
| `eslint-config.mjs` | imports components, `getEslintConfig`, ordering comment, export | ~45 (30 of them comment) |
| `eslint-components/shared.mjs` | `babelConfigPath`, `packageJSON`/`dependencies`/`devDependencies`/`engines`, `usesReact`, `allFiles` | ~35 |
| `eslint-components/indent-options.mjs` | `baseIndentOptions` | ~30 |
| `eslint-components/base-rules.mjs` | `rules` table and `delete` cleanup; also builds `standardPlugin`, `stylisticConfig` | ~150 |
| `eslint-components/base.mjs` | `defaultBaseConfig` (plugins, settings, node block) | ~70 |
| `eslint-components/jsdoc.mjs` | `defaultJsdocConfig` | ~20 |
| `eslint-components/ts-jsdoc.mjs` | `defaultTsJsdocConfig` | ~20 |
| `eslint-components/jsx.mjs`, `test.mjs`, `cli.mjs` | one const each | ~10 to 20 each |
| `eslint-components/ts.mjs` | `defaultTsConfig` (imports `baseIndentOptions`) | ~45 |

Every file stays under 300 lines. `base-rules.mjs` is the largest. It could be split again into `rules-stylistic.mjs`, `rules-quality.mjs` and `rules-cleanup`, but that is not needed. The jsdoc/tsJsdoc duplication (three identical rule lines) could be factored out later, but that is optional.

## Shared state and cycle avoidance
The dependency graph is a DAG with no cycles:
- Leaves: `../js-extensions` and `../lib/linebreak-types-except` (both already exist).
- Next layer: `shared.mjs` (imports `js-extensions`, node built-ins) and `indent-options.mjs` (no imports).
- Then `base-rules.mjs` (imports `indent-options` and `linebreak-types-except`), and `ts.mjs` (imports `indent-options` and `js-extensions`).
- Then `base.mjs` (imports `shared`, `base-rules`, `js-extensions`).
- The other components import only `js-extensions` and `shared`.
- `eslint-config.mjs` imports all of them.
- Nothing imports `eslint-config.mjs`, so a cycle cannot form.
- `baseIndentOptions` must stay one shared object that `ts.mjs` spreads; the existing comment says the two copies must not drift. Do not duplicate it.
- `rules` is mutated by `delete`, so keep that inside the module that builds it (`base-rules.mjs`). `base.mjs` then does `Object.assign(defaultBaseConfig.rules, ...)` on that same object. That is current behavior, so it is preserved. Because modules are singletons, `base.rules` stays the same shared object. Unchanged behavior, but note it. Do not export `rules` to other components.
- Keep the `engines`/node block (plugin, globals, rules) inside `base.mjs`. It mutates `defaultBaseConfig`, and it should not be shared.

## Importers, docs, tests, exports
- The only importers of `eslint-config` are `src/lib/lib/get-eslint.mjs:4` (`getEslintConfig`) and `src/lib/default-config/test/eslint.config.test.mjs:6`. Both use the extensionless path `../eslint-config`, so they are unchanged if the file keeps its path.
- `src/lib/index.mjs` does not re-export it. `package.json` has no `exports` field. It has `main: ./dist/fandl.js`, `bin`, and `files: ["dist/"]`.
- The Makefile bundles with rollup from `src/lib/index.mjs` and `src/cli/index.mjs`. The `ALL_*_SRC` find-globs pick up new files automatically, so no Makefile changes are needed. New files must be `.mjs` to match.
- Docs that name the file:
  - `docs/architecture.md`: lines 90, 116, 161, 165 and 175 say `eslint-config.mjs` or `src/lib/default-config/eslint-config.mjs`. Some of them point at where a comment lives, such as "the comment at the override site in eslint-config.mjs" (line 161). These need small wording updates to name the new files. Lines 90 and 116 may also warrant a note about the module layout.
  - `DEVELOPER_NOTES.md` (line 27 and nearby) says `eslint-config.mjs` calls `standardConfig`. That moves to `base-rules.mjs` (or wherever `standardPlugin` lands). Update it.
  - Code comments: the CAUTION block at lines 54-70 moves with `standardPlugin`.
  - `plan/summary.md` and `plan/plan-summary-typescript-support.md` also match the grep. They are historical, so leave them.
- Tests: `eslint.config.test.mjs` (81 lines) is an integration test. It runs `ESLint` with `getEslintConfig()` on fixture dirs and uses `calculateConfigForFile`. It has no mocks. `js-extensions.test.mjs` is unaffected. The integration test is a good safety net, because it would catch ordering and rule regressions.

## Risks
1. Babel config path. `babelConfigPathTest` uses `join(__dirname,'..','..','..','dist/babel/babel.config.cjs')`, which assumes the file sits at `src/lib/default-config/`. If the resolver moves into `eslint-components/`, it needs four `..`, or it can resolve from `default-config/` via `join(__dirname,'..')`. In the rollup bundle `import.meta.url` is the bundle (`dist/`), so the installed path `dist/babel/` still works. Put the resolver in `shared.mjs` and fix the depth. The tests run per-file under jest, where the dev path is the one exercised, so the integration test would catch a mistake.
2. Import-time side effects: `readFileSync('./package.json')` is relative to cwd, and the `throw` fires when the babel config is missing. Keep both in `shared.mjs` only. ES modules evaluate once, in dependency order, so the effects stay one-shot and run at first import. They are not lazy. Behavior is unchanged as long as no component re-reads `package.json`. Do not call them from multiple modules.
3. `engines` detection: `engines = { node : true }` is the default when the field is absent. That drives the node plugin. It must remain a single computation in `shared.mjs`. Note that fandl itself has `engines.node`, so the test run exercises the node branch. The no-`engines` branch is untested today.
4. Array order and mutation: the order `[base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]` is in `getEslintConfig` only, so it stays in the assembler, with its comment. The destructured defaults must continue to reference the imported consts. Consider adding a regression test for the order.
5. Shared object identity: `jsdoc`/`tsJsdoc` each have their own `plugins`/`rules`, so there is no sharing. The `delete` block mutates the shared `rules`. If any component imported `rules` before the delete ran, it would see stale keys. Avoid that by deleting inside `base-rules.mjs` before export.
6. Rollup and the lint/format pipeline: rollup's tree-shaking and externals should handle a new dir. Run `make` to verify. `max-lines` for the new files: the rules at line 247 apply, so no disables should be needed.
7. Readability, per the original disable reason ("splitting it would hurt readability"): the rules table is a single flat list, and it would stay whole inside `base-rules.mjs`. The split is only along component seams, which is what the doc already describes as eight named components.

## Can the `max-lines` disable be removed?
Yes. After the split, every file is under 300 non-blank, non-comment lines. The largest, `base-rules.mjs`, comes to about 150, even with a further comment block. Remove the `eslint-disable max-lines` comment at the same time, and check with `make lint`. Even without splitting, the file is borderline, at about 330 lines against a 300 limit. Trimming the verbose comments would not reach 300, because comments are already skipped.

## Recommendation
Do the split. It is low-risk because there is one export and two importers, and the integration test covers the assembled config. Keep `eslint-config.mjs` as the assembler and public entry, move components under `eslint-components/`, and put shared state in `shared.mjs`. The one thing to be careful about is the babel-path depth (risk 1).

## Task breakdown (rough, all sonnet-med unless noted)
1. Create `shared.mjs` (babel path with fixed depth, `packageJSON`, `usesReact`, `allFiles`) and `indent-options.mjs`. About 30 min.
2. Create `base-rules.mjs` (standard/stylistic plugin setup, `rules`, deletes) and `base.mjs` (base component with node block). Preserve the CAUTION comment. About 1 hr.
3. Create `jsdoc.mjs`, `ts-jsdoc.mjs`, `jsx.mjs`, `test.mjs`, `ts.mjs`, `cli.mjs`. About 45 min.
4. Rewrite `eslint-config.mjs` as the assembler; remove the `max-lines` disable. Run `make test` and `make lint`, and confirm `make` produces a working `dist` bundle (including running `dist/fandl-exec.js` against a sample file, since the babel path differs when bundled). About 30 min.
5. Update docs: `docs/architecture.md` (lines 90, 116, 161, 165, 175) and `DEVELOPER_NOTES.md`. Optionally add a test asserting the array order of `getEslintConfig()`, and one for the missing-`engines` branch. About 30 min.
Tasks 1 to 3 could be one task; 4 depends on them, and 5 can run in parallel with 4.
