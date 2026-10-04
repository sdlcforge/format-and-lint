# Rewrite Assembler

## Purpose and scope

Rewrite `src/lib/default-config/eslint-config.mjs` as a thin assembler of the components created in tasks 001-003, remove the file-level `max-lines` disable, and prove the behavior is unchanged. This task also resolves followup `t0xt` ("eslint-config.mjs at max-lines cap"): once it lands, that followup is obsolete and the manager should remove it from `plan/followups.yaml` (do not edit `followups.yaml` yourself; mention `t0xt` in your report).

## Requirements

Depends on tasks 001, 002 and 003.

- Keep the path `src/lib/default-config/eslint-config.mjs` and the single named export `getEslintConfig`; `src/lib/lib/get-eslint.mjs` and `src/lib/default-config/test/eslint.config.test.mjs` keep their extensionless `../eslint-config` import unchanged.
- Keep the file's `@file` header. **Delete the line `/* eslint-disable max-lines -- ... */`.** No other `eslint-disable` may replace it.
- Import `defaultBaseConfig`, `defaultJsdocConfig`, `defaultTsJsdocConfig`, `defaultJsxConfig`, `defaultTestsConfig`, `defaultTsConfig`, `defaultCliConfig` from `./eslint-components/<file>`.
- Keep `getEslintConfig` and its long ordering comment (lines 422-427) verbatim in the assembler, with the same destructured defaults referencing the imported consts, and the returned array exactly `[base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]`. The order is defined only here.
- Delete everything else from the file (it now lives in components). Expect the file to be roughly 45 lines.
- Confirm no leftover duplicate of moved code, and that `package.json` is read only in `shared.mjs`.
- Preserve `node/shebang` semantics: `'error'` in base, `'off'` in cli, and the untouched fix predicate in `src/lib/lib/get-eslint.mjs`.

## Validation

1. Equivalence: run the temporary snapshot test with `CONFIG_SNAPSHOT=compare` against `plan/resources/config-snapshot.baseline.json` (created in task 001). It must pass for the default config and both override variants. If it fails, fix the split, never the baseline. Then delete `src/lib/default-config/test/zz-config-snapshot.test.mjs` (leave the baseline in `plan/resources/`).
2. `make test` passes in full, including `src/lib/default-config/test/eslint.config.test.mjs` (it exercises the dev fallback babel path under Jest, so a wrong `..` depth would fail here).
3. `make lint` passes with the disable comment gone; confirm with `grep -rn "eslint-disable" src/lib/default-config/` that no `max-lines` disable remains. Check `wc -l` and a manual count so that every file under `src/lib/default-config/` is comfortably below the 300 counted-line cap.
4. Built-bundle smoke test (rollup bundles change `import.meta.url` to the `dist/` file, so the installed babel path branch is the one used): run `make build`, then confirm `dist/fandl.js` and `dist/fandl-exec.js` exist and contain no unresolved `eslint-components` import (`grep -c "eslint-components" dist/fandl-exec.js` should show only comment/sourcemap references, if any). Create a scratch directory outside the repo with a small `.mjs` file that has deliberate style problems (for example a missing trailing comma in a multi-line object, a double-quoted string) and a `package.json`, run `dist/fandl-exec.js` against it from that directory (check mode first, then fix mode), and confirm it reports/fixes the expected rules rather than throwing `Could not find babel config file.`. Also run it against a file with a shebang and confirm `node/shebang` is reported but not auto-fixed.
5. `git diff --stat` shows changes limited to `eslint-config.mjs` (shrunk), the new component files, and removal of the temporary snapshot test.

## Assumptions

- `make build` requires the `@sdlcforge/packjs` rollup config to be installed (already needed by the existing Makefile).
- If `make lint` mutates files through `lint-fix`, use only the `lint` target, which is check-only.

## Checkpoint hints

- After rewriting the assembler.
- After the snapshot comparison passes and the temporary test is removed.
- After the dist smoke test passes.

## References

- [Plan overview](../overview.md), [research findings](../notes/split-research-findings.md) risks 1, 4, 6.
- Followup `t0xt` (resolved by this task).
- `Makefile` targets `build`, `test`, `lint`.
