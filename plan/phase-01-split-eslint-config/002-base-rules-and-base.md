# Base Rules And Base

## Purpose and scope

Extract the base component and its rules table into `src/lib/default-config/eslint-components/base-rules.mjs` and `src/lib/default-config/eslint-components/base.mjs`. Adds new files only; `eslint-config.mjs` is not edited (task 004 does that). Can run in parallel with task 003.

## Requirements

Depends on task 001 (`shared.mjs`, `indent-options.mjs`).

### `base-rules.mjs`

Move from `eslint-config.mjs`:

- The `standardPlugin = standardConfig({ prettier : true, sortImports : true, jsx : true, node : true, react : true, typescript : true })` call **with the full CAUTION comment block** (lines 54-70). The call arguments are untouched; do not "repair" it. Adjust only the comment's file-relative references: `'defaultTsConfig'/'defaultTsJsdocConfig', below` becomes a reference to `ts.mjs` and `ts-jsdoc.mjs`, and "the 'delete rules[...]' block below it" stays accurate since the delete block is in this file.
- `stylisticConfig = stylistic.configs['recommended']`.
- The whole `rules` table (lines 121-249), preserved as one flat list with every inline comment, and the `delete` cleanup (lines 251-264). Import `baseIndentOptions` from `./indent-options` and `linebreakTypesExcept` from `'../lib/linebreak-types-except'`, `js` from `@eslint/js`, `standardConfig`, `stylistic`.
- Exports: `rules`, `standardPlugin`, `stylisticConfig`. The `delete` calls run in this module at import time, before export, so no importer can see stale keys. Do not re-export `rules` from any other module and no component other than `base.mjs` may import it.

### `base.mjs`

Move `plugins` (lines 85-93), `reactSettings` (line 81), and `defaultBaseConfig` (lines 268-298) plus the `if (engines?.node !== undefined) { ... }` block (lines 300-312) unchanged, keeping that mutation inside this module (it mutates `defaultBaseConfig`, `plugins` and, through `Object.assign(defaultBaseConfig.rules, ...)`, the shared `rules` object, exactly as before). Import `babelConfigPath`, `engines`, `usesReact`, `allFiles` from `./shared`; `rules`, `standardPlugin`, `stylisticConfig` from `./base-rules`; `allExtsStr`-style imports from `'../js-extensions'` only if still needed; `babelParser`, `fixupPluginRules`, `importPlugin`, `promisePlugin`, `nPlugin`, `nodePlugin`, `globalsPkg`, `join`.

- Preserve the node block verbatim, in particular `'node/shebang' : 'error'` with its comment (never auto-fixed; see `src/lib/lib/get-eslint.mjs`). The cli component later turns it `'off'`; do not alter either side.
- Preserve `process.cwd()`-based `_lib`/`_cli` aliases and the `engines?.node !== undefined` condition exactly.
- Export `defaultBaseConfig` (a named export; keep the original const name).

### General

- `.mjs`, repo style, extensionless imports, no `eslint-disable` comments.
- Keep each file under the 300 counted-line cap; `base-rules.mjs` should come to roughly 150.
- Because the Object.assign into `rules` is observable behavior, note in a short comment in `base.mjs` that `rules` is the same object `base-rules.mjs` exports.

## Validation

- Compare the moved code against `git show HEAD:src/lib/default-config/eslint-config.mjs`: every `rules` key and inline comment is present (a quick diff of the table text is the check).
- `grep -n "node/shebang" src/lib/default-config/eslint-components/base.mjs` shows `'error'`.
- `grep -rn "readFileSync\|package.json" src/lib/default-config/eslint-components/base*.mjs` returns nothing.
- Cycle check: neither new file imports `../eslint-config` or any component other than `shared`, `base-rules`, `indent-options`.
- `make lint` passes for the new files (no `max-lines` complaints, no disable comments); `make test` still passes. Equivalence against the baseline snapshot is verified in task 004, since the assembler is not rewired yet.

## Checkpoint hints

- After `base-rules.mjs`.
- After `base.mjs`.

## References

- [Plan overview](../overview.md), [research findings](../notes/split-research-findings.md) (shared state and cycle avoidance; risks 3, 5).
- `DEVELOPER_NOTES.md` (the `typescript: true` no-op entry, whose referenced file task 005 updates).
