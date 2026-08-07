# TypeScript Parsing Layer Research

## Purpose and scope

Findings on whether fandl's two parsing layers — Babel (for ESLint) and Prettier — can handle
`.ts`/`.tsx` today. Answers investigation questions 2 and 4 from the change request. All findings
below were verified empirically against the working tree at `1.0.0-alpha.31` (commit `e21bcd1`).

## Babel layer: already TypeScript-capable, no changes needed

fandl's ESLint config points `@babel/eslint-parser` at `dist/babel/babel.config.cjs`, copied
verbatim from `@sdlcforge/packjs` (`node_modules/@sdlcforge/packjs/dist/babel/babel.config.cjs`;
verified byte-identical to the copy in `dist/babel/` by `diff -r`). That config pulls
`babelPresets` from `babel-shared.config.cjs`, which already contains:

```js
const babelPresets = [
  ['@babel/preset-env', presetEnvOptions],
  '@babel/preset-react',
  // TypeScript support - Babel strips types without type checking, which is ideal for transpilation
  '@babel/preset-typescript'
]
```

`@babel/preset-typescript@7.28.5` is present in `node_modules` as a declared direct dependency of
`@sdlcforge/packjs`, so it resolves from the config file's own directory. **No Babel-layer change is
required.**

### TSX vs. TS is handled correctly and automatically

`@babel/preset-typescript` installs extension-keyed overrides internally, so `@babel/eslint-parser`
(which passes `filename` through to Babel) gets JSX parsing enabled for `.tsx` and disabled for
`.ts` — even though `@babel/preset-react` and fandl's own `ecmaFeatures: { jsx: true }` are applied
unconditionally. **A separate `tsxExts` bucket is not needed for parser configuration.** Verified
clean parses of:

- `.tsx` — `interface` declarations, typed destructured props, JSX elements, `React.ReactElement`
  return annotations.
- `.ts` — bare generic arrow functions (`const identity = <T>(x: T): T => x`, the construct that
  would be a JSX open tag if JSX were enabled), `enum`, `class` access modifiers, constructor
  parameter properties, `K extends keyof T` constraints.
- `.mts` and `.cts` — both parse clean.
- `.d.ts` — parses clean (`declare module`, `export declare const`).

The one place a distinct TSX bucket *is* needed is the browser-globals config component
(`defaultJsxConfig`), which currently matches `**/*{.jsx}` only. `.tsx` files need the same
`globals.browser` treatment, so the `files` glob for that component must cover `.jsx` **and**
`.tsx`.

## Prettier layer: hardcoded `parser: 'babel'` is a hard blocker

`src/lib/format-and-lint.mjs` line 73 sets, unconditionally:

```js
prettierParseConfig.parser = 'babel'
```

Prettier's `babel` parser cannot parse TypeScript. Every TS/TSX fixture failed:

| Prettier parser | `.ts` | `.tsx` | Notes |
|---|---|---|---|
| `babel` | FAIL `Unexpected token` | FAIL `Unexpected token` | current hardcoded value |
| `babel-ts` | OK | OK | `@babel/parser`-backed; no new dependency |
| `typescript` | OK | OK | requires the `typescript` package |

`babel-ts` and `typescript` produced byte-identical output on every fixture. **`babel-ts` is the
recommended choice**: it keeps the Babel family consistent with the ESLint layer and depends only on
`@babel/parser`, which prettier already bundles, whereas the `typescript` parser would make fandl
depend on the `typescript` package (currently present only as a transitive dependency of
`eslint-config-standard-kit`, undeclared by fandl).

Because `parser` is set in `formatAndLint` — before per-file iteration — while the file path is only
known inside `processSource`, the parser selection has to move down into `processSource` (or the
per-file config has to be derived there from `file`).

`@trivago/prettier-plugin-sort-imports` works unchanged with `babel-ts` on TS and TSX sources.

## Prettier/ESLint round-trip stability

Because fandl runs prettier first and then ESLint `--fix`, disagreements between the two can produce
churn. Verified over four successive full passes on a `.tsx` fixture: output converges after pass 1
and is byte-stable thereafter.

Two disagreements exist but are benign:

- Prettier `babel-ts` emits `<T,>` for a generic arrow function in a `.ts` file; `@stylistic/comma-dangle`
  strips the trailing comma back to `<T>`. Every run ends at `<T>`, so file content is stable.
- In a `.tsx` file the same `<T,>` is **preserved** by ESLint (stripping it there would make the
  file unparseable). Verified stable across three passes.

## Import resolution

`eslint-config.mjs` configures the `babel-module` import resolver with
`extensions: ['.js', '.jsx', '.es', '.es6', '.mjs', '.cjs']`. With TS extensions absent from that
list, `import { helper } from './helper'` resolving to `helper.ts` raises
`import/no-unresolved: Unable to resolve path to module './helper'`. Verified. The TS extensions
must be added to that array.
