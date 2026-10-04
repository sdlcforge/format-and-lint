# @sdlcforge/format-and-lint
[![coverage: 97%](./.readme-assets/coverage.svg)](https://github.com/liquid-labs/format-and-lint/pulls?q=is%3Apr+is%3Aclosed)

Pre-configured formatting and lint tool combining the best of prettier and eslint. Aka, fandl.

- [Install](#instal)
- [Usage](#usage)
  - [CLI](#cli)
  - [API](#api)
  - [TypeScript support](#typescript-support)
- [API reference](#api-reference)
- [Component based configuration](#component-based-configuration)
- [Reformatting process overview](#reformatting-process-overview)

## Install

```bash
npm i @sdlcforge/format-and-lint
```

## Usage

Note this is an ESM only package. We would [like to support CJS](https://github.com/sdlcforge/format-and-lint/issues/52) in the production release.

### CLI

```bash
npx fandl lint # runs lint checks only with no changes to files
npx fandl # fixes what it can and reports on the rest
npx fandl --files '**/weird-src/**/*.{js,cjs,mjs,jsx,ts,mts,cts,tsx}' # specify files pattern
```

### API

```javascript
import { formatAndLint } from '@sdlcforge/format-and-lint'

// in the API, we provide actual file paths, which may be relative or absolute
const files = ['index.js', 'src/foo.js', 'src/bar.js']
const { eslint, lintResults } = formatAndLint({ files })
// process the results; the following is essentially what the fandl CLI does
const formatter = await eslint.loadFormatter('stylish')
const resultText = formatter.format(lintResults)

stdout.write(resultText)
// if we had something to say, then that indicates an error/warning in the source
if (resultText !== '') {
  process.exit(1)
}
```

### TypeScript support

Fandl processes these extensions by default: `.js`, `.cjs`, `.mjs`, `.jsx`, `.ts`, `.mts`, `.cts`,
`.tsx`. `.d.ts` declaration files are excluded by the standard ignores; pass
`--no-standard-ignores` if you want them included too.

TypeScript support is **syntax-level linting and prettier formatting only**. Fandl does not run the
TypeScript type checker, requires no `tsconfig.json`, and enables no type-aware lint rules. Keep
running `tsc --noEmit` (or equivalent) separately as part of your build/CI.


##  API reference
_API generated with [dmd-readme-api](https://www.npmjs.com/package/dmd-readme-api)._

<span id="global-function-index"></span>
- Functions:
  - [`formatAndLint()`](#formatAndLint): Parses, lints, and (when `check` is false) reformats the `files` text.
  - [`getPrettierConfigFor()`](#getPrettierConfigFor): Determines the prettier config to use for `file`, based on its extension.
  - [`linebreakTypesExcept()`](#linebreakTypesExcept): A helper function used to sanely build 'blankline' entries in the '@stylistic/padding-line-between-statements' rule.

<a id="formatAndLint"></a>
### `formatAndLint(options)` ⇒ `Promise.<{eslint: object, lintResults: Array.<object>}>` <sup>↱<sup>[source code](./src/lib/format-and-lint.mjs#L61)</sup></sup> <sup>⇧<sup>[global index](#global-function-index)</sup></sup>

Parses, lints, and (when `check` is false) reformats the `files` text. By default, this function will update the
`files` in-place.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `object` |  | The input options. |
| [`options.check`] | `boolean` | `false` | If `true` then the files are linted, but not reformatted. |
| [`options.noWrite`] | `boolean` | `false` | If `true`, then the files are not updated in placed. Has no effect when   `check = false`, but when combined with `check = true`, means that the text is reformatted and attached to the   `LintResult`s, but the files themselves are not updated. You can access reformatted text as part of the   `result.lintResults[0].output`. Unlike results directly from `ESLint`, `output` is   always present on the `LintResult` object (rather than only being set if the text is changed. |
| [`options.eslintConfig`] | `object` | `<default eslint config>` | A flat (9.x) style array of [eslint configuration   object](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-objects) to be used in   place of the default, out of the box configuration. This may not be specified along with `eslintConfigComponents`. |
| [`options.eslintConfigComponents`] | `object` |  | An object with zero or more keys corresponding to the   `base`, `jsdoc`, `tsJsdoc`, `jsx`, `test`, `ts`, `cli`, or `additional` as discussed in the [component based   configuration](#component-based-configuration). This may not be specified along with `eslintConfig`. |
| [`options.prettierConfig`] | `object` | `<default prettier config>` | A prettier [options   object](https://prettier.io/docs/en/options). |
| [`options.eslint`] | `object` |  | A pre-configured   [`ESLint`](https://eslint.org/docs/latest/integrate/nodejs-api#eslint-class) instance. If this is defined, then   `eslintConfig` and `eslintConfigComponents` will be ignored. |
| [`options.outputDir`] | `string` |  | If provided, then output files (whether reformatted or not) will be   written to the specified directory relative to their location in the source. With `src/index.mjs` =>   `<outputDir>/src/index.mjs`, `src/foo/bar.mjs` => `<outputDir>/src/foo/bar.mjs`. This option has no effect if   `check = true` or `noWrite = true`. The relative starting point is controlled with the `relativeStem` option. |
| [`options.relativeStem`] | `string` | process.cwd() | Controls the starting point for determining the relative   position of files when emitting to `outputDir` rather than updating in place. Impossible stems will result in an   error. E.g., given file `src/index.mjs`, `relativeStem = 'src/foo'` is invalid. |

**Returns**: `Promise.<{eslint: object, lintResults: Array.<object>}>` - Resolves to an object with two fields. `eslint` points
to the an instance of [`ESLint`](https://eslint.org/docs/latest/integrate/nodejs-api#eslint-class). `lintResults`
points to an array of [`LintResult`](https://eslint.org/docs/latest/integrate/nodejs-api#-lintresult-type)s.

<a id="getPrettierConfigFor"></a>
### `getPrettierConfigFor(file, baseConfig)` ⇒ `object` <sup>↱<sup>[source code](./src/lib/format-and-lint.mjs#L22)</sup></sup> <sup>⇧<sup>[global index](#global-function-index)</sup></sup>

Determines the prettier config to use for `file`, based on its extension. TypeScript sources (per `allTsExts` in
'./default-config/js-extensions') use the `babel-ts` parser; everything else uses `babel`. Always returns a fresh
clone of `baseConfig` so callers may safely invoke this once per file without sharing mutable state across
concurrent calls.


| Param | Type | Description |
| --- | --- | --- |
| `file` | `string` | The (absolute) path of the file being processed. |
| `baseConfig` | `object` | The prettier options object to clone and apply the `parser` field to. |

**Returns**: `object` - A clone of `baseConfig` with `parser` set appropriately for `file`.

<a id="linebreakTypesExcept"></a>
### `linebreakTypesExcept(...types)` ⇒ `Array.<string>` <sup>↱<sup>[source code](./src/lib/default-config/lib/linebreak-types-except.mjs#L67)</sup></sup> <sup>⇧<sup>[global index](#global-function-index)</sup></sup>

A helper function used to sanely build 'blankline' entries in the '@stylistic/padding-line-between-statements' rule.
Basically, what we often want is to say "we want a blank line between expression type A and all other expression
except for B, C, and D." This is useful because the '@stylistic/padding-line-between-statements' rule requires you
specify each type where a blank line is required, but it's generally easier to specify a set of expression types for
which a blank line is _NOT_ required.E.g.:

```javascript
'@stylistic/padding-line-between-statements' : [
  'error',
  { blankLine : 'always', prev : '*', next : 'class' },
  {
    blankLine : 'always',
    prev      : linebreakTypesExcept('cjs-export', 'export'),
    next      : 'export',
  },
]
```

Would require (and/or add) a blank line between a class declaration and anything else, and a blank line between
`import` statements and all other statements except `import` or `cjs-import` statements. That way, all your `import`
statements would be grouped together, but would have a blank line between the last `import` and whatever the next
non-import statement is.


| Param | Type | Description |
| --- | --- | --- |
| ...`types` | `string` | A list of the types to exclude from the rule (meaning all other known types are included). |

**Returns**: `Array.<string>` - - An array of the non-excluded types.

## Component based configuration

Fandl breaks up the configuration into 8 components:
- 'base' which applies to all Javascript src files,
- 'jsdoc' which defines JSDoc specific configuration and rules for all src files,
- 'tsJsdoc' which defines TypeScript-flavored JSDoc rules (it supersedes 'jsdoc' for TypeScript files, since the JavaScript JSDoc rules demand JSDoc types that a TypeScript type annotation already provides),
- 'jsx' which defines additional configuration and rules for JSX files -- and, since it supplies the browser globals JSX and TSX both need, for TSX files as well,
- 'test' which defines additional configuration and rules for test files,
- 'ts' which defines TypeScript-specific rule overrides,
- 'cli' which turns off `no-console` and `no-process-exit` for CLI code (printing to the console and exiting with a status code is exactly what CLI code is for, so both rules are false positives there); the exemption covers every file under a `cli/` path segment -- not just entrypoint scripts, but any file there, e.g. library helpers like `src/cli/lib/*.mjs` (the `src/lib` + `src/cli` layout convention) -- plus any file with a `-cli` basename suffix (`bump-version-cli.js`, `eval-flow-cli.ts`), a genuine single-file entrypoint that doesn't warrant a lib/cli split, and
- 'additional' which is just a catch all for whatever else you might want to add.

Rather than being forced to redefine the entire default configuration, you can override any one of the components individually by specifying `options.eslintConfigComponents`.

The components are combined, in order, into a single flat-config array:

```
[base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]
```

Order matters: for a given file, a later component's matching rules win over an earlier
component's. This is why 'tsJsdoc' sits right after 'jsdoc' (its rules supersede 'jsdoc' for
TypeScript files while staying overridable by anything later), why 'ts' sits after 'jsx' and
'test' (its overrides win for TypeScript files), why 'cli' sits after 'base' (its 'off' entries
have to win over base's 'error' for CLI entrypoints), and why 'additional' stays last (it can
override everything). Keep this ordering in mind when overriding an individual component.

Overriding a component also lets you turn it off: passing `eslintConfigComponents: { cli: {} }`
replaces the CLI exemption with an empty config, so `no-console` and `no-process-exit` apply to
CLI entrypoints too.

Note, the component structure is essentially a prototype at this point. Future versions will:
- Break up 'base' (which is very large) into different semantic types such "correctness", "complexity", and "style".
- Support arbitrary additional configuration components.

## Reformatting process overview

- The code is run through prettier first mainly because it does a much better job properly indenting code and fitting it within a target width (80 chars).[^1]
- The partially reformatted code is then reformatted by eslint because prettier (purposely) has very few options and we don't agree with all of them. Specifically, our out of the box configuration:
  - places operators at the beginning of the next line rather than the end of the previous line in multi-line expressions; e.g.:
  ```js
  const foo = bar // fandl style; generally accepted as easier to read
    && baz
  // vs
  const foo = bar && // prettier style
    baz
  ```
  - places `else if`/`else`/`catch`, etc. on a newline; e.g.:
  ```js
  const foo = bar // fandl style; generally accepted as easier to read
    && baz
  // vs
  const foo = bar && // prettier style
    baz
  ```
  - places `else if`/`else`/`catch`, etc. on a newline; e.g.:
  ```js
  if (a === 1) { // fandl style (Stroustrup); more consistent IMO
    ...
  }
  else { // and easier to scan the page
  ...
  }
  // vs
  if (a === 1) { // prettier default style ("one true brace style")
    ...
  } else { // IMO it's odd to have lexical overhead preceed the flow control keyword
  ...
  }
  ```
  - aligns the colons in object declarations; e.g.:
  ```js
  { // fandl style; easier to read, like a table
    foo           : 'hey',
    longFieldName : 'how are you?',
  }
  // vs
  { // prettier style
    foo : 'hey',
    longFieldName : 'how are you?',
  }
  ```
  - in TypeScript sources, object literals keep the same aligned-colon house style, but **type
    annotations use idiomatic TypeScript spacing** (`hostName: string`, not `hostName : string`) --
    fandl does not impose its aligned-colon style on type annotations, only on object literals:
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
[^1]: I perhaps falsely remember eslint actually doing a better re indenting code, but in any case there are two issue with the latest eslint based reformatting. First, it miscounts the correct indention level where '('s were involved in boolean expressions. Second, eslint failed automatically break up long lines. (As of @stylistic/eslint-plugin: 2.6.4, eslint: 8.50.0; have since upgraded but not retested since it's working as is.)

### Known TypeScript limitations

- **`no-unused-vars` and constructor parameter properties.** `constructor(public name: string)` reports `'name' is defined but never used` even when `this.name` is used, because `@babel/eslint-parser`'s scope analysis does not link a TypeScript parameter property to the class field it generates. Workaround: `// eslint-disable-next-line no-unused-vars`. This is deliberate: fandl keeps unused-argument detection on for TypeScript rather than setting `args: 'none'`, which would clear the false positive but also lose unused-argument detection across all TypeScript sources.
- **`no-undef` is disabled for TypeScript files.** Core `no-undef` cannot see the TypeScript type namespace -- type aliases, interface names, interface member names, type parameters, and enum members would otherwise all be reported as undefined. Undefined-identifier checking for TypeScript is the type checker's job, not `no-undef`'s.
- **No type-aware rules.** As noted above, TypeScript support is syntax-level linting and prettier formatting only. Fandl runs no TypeScript type checker, requires no `tsconfig.json`, and enables no type-aware lint rules; keep running `tsc --noEmit` (or equivalent) separately.

Fixed: multiline `enum` bodies used to lose the trailing comma on their last member because `@stylistic/comma-dangle`'s options didn't name an `enums` node type; the config now sets `enums: 'always-multiline'` alongside `arrays`/`objects`, so trailing commas are enforced there too.

See [docs/architecture.md](./docs/architecture.md) for a full description of the component-composition model and the prettier-then-ESLint reformatting pipeline, [DEVELOPER_NOTES.md](./DEVELOPER_NOTES.md) for maintainer-facing implementation notes and known gotchas, and [RELEASING.md](./RELEASING.md) for the release procedure.
