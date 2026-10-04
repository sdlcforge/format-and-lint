import { allTsExtsStr } from '../js-extensions'

import { baseIndentOptions } from './indent-options'

const defaultTsConfig = {
  files : [`**/*{${allTsExtsStr}}`],
  rules : {
    // TypeScript type identifiers (type aliases, interface names, type parameters, enum members,
    // interface member names) are invisible to core 'no-undef', which reports every one of them as
    // undefined. Disabling it for TS files is the standard resolution; the TypeScript compiler is
    // the right tool for that check.
    'no-undef'               : 'off',
    // Our aligned-colon 'key-spacing' override collides head-on with the @stylistic
    // 'type-annotation-spacing' rule inside TS type containers, producing a circular fixer loop.
    // Excluding the TS containers leaves 'type-annotation-spacing' in sole control of type
    // annotations while 'key-spacing' keeps full control of object literals -- so TS sources get
    // idiomatic `name: string` annotations and fandl's aligned `name : 'value'` object literals.
    // NOTE: 'ignoredNodes' takes a closed enum; 'TSPropertySignature'/'TSIndexSignature' are NOT
    // valid values and make ESLint refuse to start.
    '@stylistic/key-spacing' : [
      'error',
      {
        align        : 'colon',
        afterColon   : true,
        beforeColon  : true,
        ignoredNodes : ['TSTypeLiteral', 'TSInterfaceBody', 'ClassBody'],
      },
    ],
    // Without the extra ignored nodes, '--fix' rewrites prettier's correctly-indented
    // 'enum Color {\n  Red,\n  Green,\n}' to 'enum Color {\nRed,\nGreen\n}'.
    // NOTE on the enum entries: '@babel/eslint-parser' (@babel/parser 7.29.x) emits a
    // 'TSEnumDeclaration' whose members hang off it directly -- it emits no 'TSEnumBody' node at
    // all, so 'TSEnumBody' alone never matches and the de-indentation still happens.
    // 'TSEnumDeclaration' is the entry that actually does the work here; 'TSEnumBody' is retained
    // because that is the Babel 8 / TS-ESTree AST shape and it costs nothing to match both.
    // 'TSModuleBlock' is emitted by this parser today and covers 'namespace'/'module' bodies.
    '@stylistic/indent' : [
      'error',
      2,
      {
        ...baseIndentOptions,
        ignoredNodes : [...baseIndentOptions.ignoredNodes, 'TSEnumDeclaration', 'TSEnumBody', 'TSModuleBlock'],
      },
    ],
  },
}

export { defaultTsConfig }
