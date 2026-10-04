# Snapshot Shared Indent

## Purpose and scope

First task of the split. It does three things, none of which changes `src/lib/default-config/eslint-config.mjs`:

1. Capture a baseline snapshot of the fully resolved config from the **untouched** source, so task 004 can prove the split changed nothing.
2. Create `src/lib/default-config/eslint-components/shared.mjs`.
3. Create `src/lib/default-config/eslint-components/indent-options.mjs`.

The new modules are not imported by anything yet; the original file stays authoritative until task 004.

## Requirements

### Baseline snapshot (do this first, before creating any component module)

- Create a temporary Jest test, `src/lib/default-config/test/zz-config-snapshot.test.mjs`. Plain Node cannot run the source (extensionless imports), so the snapshot must run under the project's Jest setup (`make test TEST=<pattern>` or the equivalent in the Makefile; `dist/babel/babel.config.cjs` must exist, so run `make build` first if `dist/` is stale).
- The test imports `getEslintConfig` from `../eslint-config` and serializes `getEslintConfig()` into a deterministic JSON string:
  - Preserve array order (order is load-bearing).
  - Sort object keys recursively (key order is not semantic).
  - Replace functions with `"[Function <name>]"`; guard against cycles with `"[Circular]"`.
  - Plugins and the babel parser are large objects of functions; serialize each as its key list plus `meta` (name, version) rather than walking every nested rule definition. Keep the full `rules` tables, `files`, `ignores`, `settings`, `languageOptions` (including `parserOptions.babelOptions.configFile`) and `plugins` key sets.
  - Replace `process.cwd()` occurrences with `<ROOT>` so the snapshot is stable across worktree locations.
- Behavior by env var `CONFIG_SNAPSHOT`: `write` writes `plan/resources/config-snapshot.baseline.json` (create `plan/resources/` if absent); `compare` reads that file and asserts string equality, printing a readable diff of differing top-level array indices on failure. With the variable unset the test is skipped (use `test.skip`/conditional `describe`), so a plain `make test` is unaffected.
- Additionally snapshot two override variants in the same file and baseline: `getEslintConfig({ cli : {} })` and `getEslintConfig({ additional : { rules : { 'x' : 'off' } } })`. This pins the destructured-default wiring.
- Run it once with `CONFIG_SNAPSHOT=write` against the untouched source and commit the baseline JSON together with the test. Task 004 removes the test file; the baseline stays under `plan/resources/` until plan finalization.
- Sanity-check the harness: run `CONFIG_SNAPSHOT=compare` immediately and confirm it passes, then confirm it detects a deliberate one-character change (revert it afterward).

### `shared.mjs`

Move, verbatim in behavior, from `eslint-config.mjs` lines 31-52, 80 and 266:

- The `__dirname` computation, `babelConfigPathInstalled`, `babelConfigPathTest`, the `existsSync` resolution and the `throw new Error('Could not find babel config file.')`.
- `readFileSync('./package.json', { encoding : 'utf8' })` / `JSON.parse`, and the `{ dependencies = {}, devDependencies = {}, engines = { node : true } }` destructuring with its defaults unchanged.
- `usesReact` and `allFiles` (`[\`**/*{${allExtsStr}}\`]`, importing `allExtsStr` from `'../js-extensions'`).
- Export: `babelConfigPath`, `engines`, `usesReact`, `allFiles`. Do not export the package contents; no other module may read `package.json`.

**Depth fix (critical).** The dev/test fallback `babelConfigPathTest` currently uses three `..` because the file sits at `src/lib/default-config/`. `shared.mjs` sits one level deeper, at `src/lib/default-config/eslint-components/`, so it needs **four** `..` to reach the repo root (`dist/babel/babel.config.cjs`). Update the explanatory comment to name the new location and count. Leave `babelConfigPathInstalled` (`join(__dirname, 'babel', 'babel.config.cjs')`) unchanged: in the rollup bundle `import.meta.url` is the bundle file under `dist/`, so `__dirname` is `dist/` and this path resolves to `dist/babel/`. Keep both anchored on `__dirname`, never `process.cwd()`.

The `package.json` read and the babel-config `throw` are one-shot import-time effects. They must appear exactly once in the codebase (here). ES module singletons guarantee they run once, in dependency order, at first import.

### `indent-options.mjs`

Move `baseIndentOptions` (lines 95-119) unchanged, including its explanatory comment (reword "further down" to say the TypeScript component in `ts.mjs` extends this exact object). Export it as a single shared object; it must not be duplicated or cloned anywhere, because the TS component spreads it and the two must not drift. This module has no imports.

### General

- New files are `.mjs`, use the repo's style (aligned-colon `key-spacing`, extensionless relative imports, `@file` header comment optional but welcome).
- No `eslint-disable` comments in the new files.

## Validation

- Baseline file exists at `plan/resources/config-snapshot.baseline.json`, is non-empty, contains `<ROOT>` placeholders and no absolute worktree path (`grep -c "$PWD" ...` returns 0).
- `CONFIG_SNAPSHOT=compare` passes against the unmodified `eslint-config.mjs`; a deliberate edit makes it fail.
- Confirm the four-`..` depth directly: a throwaway check (Jest test or one-off node snippet, not committed) that `existsSync(join(<dir of shared.mjs>, '..','..','..','..','dist','babel','babel.config.cjs'))` is true after `make build`, and that importing `shared.mjs` under Jest resolves `babelConfigPath` to that file.
- `grep -rn "package.json" src/lib/default-config/eslint-components/` shows exactly one read.
- `git diff` shows `src/lib/default-config/eslint-config.mjs` is untouched.
- `make test` passes (the new snapshot test is skipped when `CONFIG_SNAPSHOT` is unset) and `make lint` passes for the new files.

## Checkpoint hints

- After the baseline snapshot test and baseline JSON are committed.
- After `shared.mjs`.
- After `indent-options.mjs`.

## References

- [Plan overview](../overview.md) and [research findings](../notes/split-research-findings.md), risks 1, 2, 3.
- `src/lib/default-config/eslint-config.mjs` (source of the moved code).
- `src/lib/default-config/test/eslint.config.test.mjs` (existing integration test, shows how tests call `getEslintConfig`).
