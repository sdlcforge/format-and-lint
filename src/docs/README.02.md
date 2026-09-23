## Component based configuration

Fandl breaks up the configuration into 8 components:
- 'base' which applies to all Javascript src files,
- 'jsdoc' which defines JSDoc specific configuration and rules for all src files,
- 'tsJsdoc' which defines TypeScript-flavored JSDoc rules (it supersedes 'jsdoc' for TypeScript files, since the JavaScript JSDoc rules demand JSDoc types that a TypeScript type annotation already provides),
- 'jsx' which defines additional configuration and rules for JSX files -- and, since it supplies the browser globals JSX and TSX both need, for TSX files as well,
- 'test' which defines additional configuration and rules for test files,
- 'ts' which defines TypeScript-specific rule overrides,
- 'cli' which exempts CLI entrypoints from `no-console` and `no-process-exit` (printing to the console and exiting with a status code is exactly what a CLI entrypoint is for, so both rules are false positives there); a file counts as a CLI entrypoint if it either sits under a `cli/` path segment (the `src/lib` + `src/cli` layout convention) or carries a `-cli` basename suffix (`bump-version-cli.js`, `eval-flow-cli.ts`) for a single-file script that doesn't warrant a lib/cli split, and
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
- **Trailing commas in multiline `enum` bodies.** `@stylistic/comma-dangle`'s options don't name an `enums` node type, so a multiline `enum`'s last member loses its trailing comma even though fandl otherwise enforces trailing commas on multiline arrays and objects. Cosmetic only.
