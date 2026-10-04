# Remaining Components

## Purpose and scope

Extract the six remaining named components into `src/lib/default-config/eslint-components/`: `jsdoc.mjs`, `ts-jsdoc.mjs`, `jsx.mjs`, `tests.mjs`, `ts.mjs`, `cli.mjs`. Mostly mechanical moves of existing consts. New files only; `eslint-config.mjs` is not edited. Can run in parallel with task 002.

## Requirements

Depends on task 001. Move each const verbatim with its comments, exporting it under its original name as a named export:

| file | const | source lines | imports |
|---|---|---|---|
| `jsdoc.mjs` | `defaultJsdocConfig` | 314-327 | `jsdocPlugin`; `allExtsStr` from `'../js-extensions'`; `allFiles` from `./shared` |
| `ts-jsdoc.mjs` | `defaultTsJsdocConfig` | 329-343 (keep the comment above it) | `jsdocPlugin`; `allTsExtsStr` from `'../js-extensions'` |
| `jsx.mjs` | `defaultJsxConfig` | 345-350 | `globalsPkg`; `jsxLikeExtsStr` from `'../js-extensions'` |
| `tests.mjs` | `defaultTestsConfig` | 352-361 | `globalsPkg`; `allExtsStr` from `'../js-extensions'` |
| `ts.mjs` | `defaultTsConfig` | 363-404 | `baseIndentOptions` from `./indent-options`; `allTsExtsStr` from `'../js-extensions'` |
| `cli.mjs` | `defaultCliConfig` | 406-420 (keep the comment above it) | `allExtsStr` from `'../js-extensions'` |

Constraints:

- Name the tests file `tests.mjs`, not `test.mjs`, so it can never be confused with a Jest or ESLint test glob. Also confirm the Jest config (`npm explore @liquid-labs/sdlc-resource-jest -- pwd`, `dist/jest.config.js`) `testMatch`/`testRegex` does not pick up any of the new filenames as tests.
- `ts.mjs` must import the single `baseIndentOptions` from `./indent-options` and spread it as today; do not copy the object.
- `cli.mjs` keeps `'node/shebang' : 'off'` and its comment verbatim. This is the shebang change from the recently merged `node/shebang` work and must not be altered.
- Only import what each file uses (`import/no-unused` style rules apply). `jsdoc.mjs`/`ts-jsdoc.mjs`/`jsx.mjs`/`tests.mjs`/`ts.mjs`/`cli.mjs` do not import `babelConfigPath`, `engines` or anything that reads `package.json`; only `jsdoc.mjs` needs `./shared` (for `allFiles`), and importing it there is fine because shared effects are one-shot.
- Do not factor out the duplicated jsdoc rule lines between `jsdoc.mjs` and `ts-jsdoc.mjs`; that is explicitly out of scope.
- `.mjs`, repo style, extensionless imports, no `eslint-disable` comments. Adjust only comments whose "above"/"below" references became wrong (for example the `ts.mjs` text pointing at the tests component).

## Validation

- Six new files exist under `src/lib/default-config/eslint-components/` with the names above; no other file under `src/` changed.
- Diff each const body against `git show HEAD:src/lib/default-config/eslint-config.mjs` and confirm only comments and import wiring differ.
- `grep -rn "baseIndentOptions" src/lib/default-config/eslint-components/` shows one definition (in `indent-options.mjs`) and one use in `ts.mjs`.
- `grep -rn "node/shebang" src/lib/default-config/eslint-components/cli.mjs` shows `'off'`.
- `make lint` and `make test` pass. Equivalence is verified in task 004.

## Checkpoint hints

- After `jsdoc.mjs` and `ts-jsdoc.mjs`.
- After `jsx.mjs` and `tests.mjs`.
- After `ts.mjs` and `cli.mjs`.

## References

- [Plan overview](../overview.md), [research findings](../notes/split-research-findings.md).
- `src/lib/default-config/js-extensions.mjs` (the extension string exports).

## Status

- Outcome: succeeded (2026-10-04). Six component files created under `src/lib/default-config/eslint-components/` (`jsdoc`, `ts-jsdoc`, `jsx`, `tests`, `ts`, `cli`), each const moved verbatim and exported by name via trailing `export { ... }` (repo style). `make lint` and `make test` pass; bodies verified identical to HEAD source lines; `baseIndentOptions` defined once and used in `ts.mjs`; `node/shebang` is `'off'` in `cli.mjs`.
