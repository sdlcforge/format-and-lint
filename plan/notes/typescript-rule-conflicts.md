# TypeScript Rule Conflicts and Verified Resolution

## Purpose and scope

What actually breaks when fandl's existing rule set is pointed at `.ts`/`.tsx` sources, and the
exact configuration that was verified to fix it. This is the substance of the change: extending the
extension whitelist alone produces an unusable result.

All results below come from running fandl's real `getEslintConfig()` (with the extension globs
widened to include `.ts`/`.tsx`) plus prettier `babel-ts` against TypeScript fixtures.

## Baseline: naive extension-whitelist-only change

Adding `.ts`/`.tsx` to `allExts` and nothing else produced, on three small idiomatic fixtures:

- **`no-undef` false positives on every type identifier.** Type aliases, interface names, interface
  member names, type parameters, and enum members were all reported as undefined: `'Id' is not
  defined`, `'Thing' is not defined`, `'T' is not defined`, `'payload' is not defined`,
  `'Color' is not defined`, `'Red' is not defined`. This is the well-known core-`no-undef`/TypeScript
  incompatibility — the rule has no visibility into the type namespace. Every non-trivial TS file
  would fail.
- **`@stylistic/key-spacing` vs. `@stylistic/type-annotation-spacing` — a fixer loop.** fandl
  overrides `key-spacing` to `{ align: 'colon', afterColon: true, beforeColon: true }` (its
  signature aligned-colon house style). That rule also fires on TS interface members and type
  annotations, where `@stylistic/type-annotation-spacing` (default options, from
  `stylistic.configs.recommended`) demands *no* space before the colon. ESLint emitted
  `ESLintCircularFixesWarning: Circular fixes detected ... It is likely that you have conflicting
  rules in your configuration`, and left mangled output such as `id      : Id` inside an interface
  body alongside an unfixed `payload: T`.
- **`@stylistic/indent` de-indents enum bodies.** Prettier correctly produced
  `enum Color {\n  Red,\n  Green,\n}`; ESLint `--fix` rewrote it to `enum Color {\nRed,\nGreen\n}`.
  The rule does not know how to offset the TS enum body node coming out of the Babel AST.
- **`jsdoc/require-param-type` demands JSDoc types on typed TS functions**, where the type
  annotation already carries the information. `jsdoc/require-jsdoc`'s fixer also inserted empty
  JSDoc blocks that then failed `require-param-description`.
- **`no-unused-vars` false positive on constructor parameter properties.**
- **`import/no-unresolved`** on local imports resolving to `.ts` files (covered in the
  [parsing-layer note](./typescript-parsing-layer.md#import-resolution)).

## Verified resolution

A TypeScript-scoped config component (`files: ['**/*{.ts,.mts,.cts,.tsx}']`) appended after the base
config, carrying these three rule overrides, cleared every spurious diagnostic while keeping every
genuine one:

```js
{
  'no-undef' : 'off',
  '@stylistic/key-spacing' : ['error', {
    align        : 'colon',
    afterColon   : true,
    beforeColon  : true,
    ignoredNodes : ['TSTypeLiteral', 'TSInterfaceBody', 'ClassBody'],
  }],
  '@stylistic/indent' : ['error', 2, { /* base options */, ignoredNodes : [
    /* ...existing base ignoredNodes... */, 'TSEnumBody', 'TSModuleBlock',
  ] }],
}
```

plus a TypeScript-flavored JSDoc component using
`jsdocPlugin.configs['flat/recommended-typescript-error'].rules` in place of
`flat/recommended-error`.

### Why `key-spacing` `ignoredNodes` is the right resolution

`@stylistic/key-spacing@5.10.0` accepts an `ignoredNodes` array whose values are constrained to a
closed enum: `ObjectExpression`, `ObjectPattern`, `ImportDeclaration`, `ExportNamedDeclaration`,
`ExportAllDeclaration`, `TSTypeLiteral`, `TSInterfaceBody`, `ClassBody`. (Passing
`TSPropertySignature`/`TSIndexSignature` is a schema violation and makes ESLint refuse to start —
worth knowing, since those are the intuitive names to reach for.)

Excluding the three TS-container nodes leaves `type-annotation-spacing` in sole control of type
annotations while `key-spacing` keeps full control of object literals. This preserves fandl's house
style exactly where the README documents it and produces idiomatic TypeScript everywhere else:

```ts
interface Config {
  hostName: string
  aVeryLongPortName?: number
}

export const defaults: Config = {
  hostName          : 'localhost',
  aVeryLongPortName : 8080,
}
```

Two alternatives were tried and rejected:

- **Make type annotations adopt the house style** (`type-annotation-spacing` with
  `{ before: true, after: true }`). Produced `name : string` / `count ?: number`, still left
  `@stylistic/no-multi-spaces` fighting the alignment inside interface bodies, still left unfixed
  `key-spacing` errors on optional members, and the `overrides.arrow` sub-option is deprecated in
  `@stylistic` v5. Not clean.
- **Drop alignment entirely in TS files** (`key-spacing` back to `{ afterColon: true,
  beforeColon: false }`). Clean output, but silently abandons fandl's signature aligned-colon style
  for object literals in TS files — an inconsistency between `.mjs` and `.ts` sources in the same
  project.

## Open decision: `no-unused-vars` and TS parameter properties

This one is **not** resolved by the configuration above and needs a policy call.

```ts
export class Svc {
  constructor(public name: string, private readonly id: number) {}

  describe(): string { return `${this.name}#${this.id}` }
}
```

reports `'name' is defined but never used` and `'id' is defined but never used`, even though both
are used via `this`. `@babel/eslint-parser`'s scope analysis does not connect a `TSParameterProperty`
to its generated class field. Verified: setting `args: 'none'` in the TS component clears it
completely; nothing else short of that does.

The trade-off:

- **Keep the default `args` behavior** (recommended). Preserves the deliberate choice recorded at
  `eslint-config.mjs` lines 196–197 — "the standard `no-unused-vars` ignores unused args, which we'd
  rather catch". Cost: a hard false positive on TS constructor parameter properties, suppressible
  with `// eslint-disable-next-line no-unused-vars`. Parameter properties are a class-based DI idiom
  and are rare in the React function-component code that motivates this change.
- **Set `args: 'none'` for TS files.** Removes the false positive; costs unused-argument detection
  across all TypeScript sources.

The recommendation is to keep the default and document the limitation, but this is a maintainer
style call, not a technical one.

## `.d.ts` handling

`.d.ts` files are matched by any `**/*.ts` glob and parse cleanly, but they are usually generated
output and the complexity/JSDoc/`no-unused-vars` rules make little sense against them. The
recommendation is to add `**/*.d.ts` to the `standardIgnores` array in
`src/lib/lib/select-files-from-options.mjs` (alongside `dist/**` and the test-data patterns), which
users can already opt out of with `--no-standard-ignores`.
