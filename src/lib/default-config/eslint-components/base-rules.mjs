/**
 * @file The base component's flat rules table, the 'standard-kit' plugin call, and the stylistic
 * recommended config. The 'delete' cleanup runs here at import time, before export, so no importer
 * can observe stale keys. Only 'base.mjs' may import 'rules'; do not re-export it elsewhere.
 */
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import standardConfig from 'eslint-config-standard-kit'

import { linebreakTypesExcept } from '../lib/linebreak-types-except'

import { baseIndentOptions } from './indent-options'

// CAUTION: as of 'eslint-config-standard-kit@1.0.0' this call returns a *flat-config array*, not a
// plugin object. That means 'standardPlugin.rules' is 'undefined', the '...standardPlugin.rules'
// spread further below contributes nothing, and none of standard-kit's 244 rules are actually in
// effect -- the 'delete rules[...]' block below it is deleting keys that were never added. The
// export shape changed in the 0.x -> 1.0.0 upgrade and this call site was never updated.
//
// Do NOT "repair" this in passing. Consuming the array properly would (a) activate 244
// previously-inactive rules across every JavaScript source in every consumer project, and (b)
// activate 'eslint-config-standard-kit/typescript', which swaps TS files onto
// '@typescript-eslint/parser' with 'projectService : true' -- full type-aware linting, requiring a
// resolvable 'tsconfig.json' in every consumer project and pulling the TypeScript type checker into
// every lint run. That is a deliberate, separately-scoped decision, not a cleanup.
//
// The 'typescript : true' flag below is therefore a no-op today and supplies neither parser nor
// rules; TypeScript support here is built on the Babel parser plus our own rule overrides
// ('ts.mjs' and 'ts-jsdoc.mjs'). It is left as-is rather than removed because
// removing it would be a change to a call whose semantics we are deliberately not touching.
const standardPlugin = standardConfig({
  prettier    : true,
  sortImports : true,
  jsx         : true,
  node        : true,
  react       : true,
  typescript  : true,
})

const stylisticConfig = stylistic.configs['recommended']

const rules = {
  ...js.configs.recommended.rules,
  ...standardPlugin.rules,
  ...stylisticConfig.rules, // the stylistic rules also cover react rules
  // override key spacing to get things aligned
  '@stylistic/key-spacing'           : ['error', { align : 'colon', afterColon : true, beforeColon : true }],
  // override to allow avoiding escapes
  '@stylistic/quotes'                : ['error', 'single', { allowTemplateLiterals : 'always', avoidEscape : true }],
  // additional rules
  '@stylistic/arrow-parens'          : ['error', 'always'], // I like this to be consistent
  '@stylistic/array-bracket-newline' : ['error', 'consistent'],
  '@stylistic/array-element-newline' : ['error', 'consistent'],
  '@stylistic/comma-dangle'          : [
    'error',
    {
      arrays    : 'always-multiline',
      objects   : 'always-multiline',
      imports   : 'never',
      exports   : 'never',
      functions : 'never',
      enums     : 'always-multiline',
    },
  ],
  '@stylistic/function-call-argument-newline'  : ['error', 'consistent'],
  '@stylistic/function-call-spacing'           : ['error', 'never'],
  '@stylistic/function-paren-newline'          : ['error', 'consistent'],
  '@stylistic/indent'                          : ['error', 2, baseIndentOptions],
  '@stylistic/linebreak-style'                 : ['error', 'unix'],
  // '@stylistic/indent-binary-ops': ['error', 4], // same as default, but since we define indent, these two go together
  '@stylistic/max-statements-per-line'         : ['error', { max : 2 }], // allow for short one-liners
  // The default is just 'before'; but equals are special. IMO.
  '@stylistic/operator-linebreak'              : ['error', 'before', { overrides : { '=' : 'after', '-=' : 'after', '+=' : 'after' } }],
  '@stylistic/padding-line-between-statements' : [
    'error',
    { blankLine : 'always', prev : '*', next : 'class' },
    {
      blankLine : 'always',
      prev      : linebreakTypesExcept('cjs-export', 'export'),
      next      : 'export',
    },
    {
      blankLine : 'always',
      prev      : linebreakTypesExcept('cjs-export', 'export'),
      next      : 'cjs-export',
    },
    {
      blankLine : 'always',
      prev      : 'import',
      next      : linebreakTypesExcept('import'),
    },
    {
      blankLine : 'always',
      prev      : 'cjs-import',
      // Because a cjs-import is actually many different things...
      next      : linebreakTypesExcept(
        'cjs-import',
        'const',
        'let',
        'singleline-const',
        'singleline-let',
        'singleline-var',
        'var'
      ),
    },
    { blankLine : 'always', prev : '*', next : 'return' },
  ],
  // prettier insists on putting required semi-colons first, which is probably the better answer since it's more
  // resilient to code changes
  '@stylistic/semi-style'                  : ['error', 'first'],
  // The @stylistic default of 'always' for all seems at odd with general standards, which don't have space before
  // named functions. I like that because when we invoke a function, you never see a space, and I see no reason to
  // write the declaration different.
  '@stylistic/space-before-function-paren' : ['error', { anonymous : 'always', asyncArrow : 'always', named : 'never' }],
  '@stylistic/switch-colon-spacing'        : ['error', { after : true, before : false }],
  // one-true-brace-style /is/ the more common, but i just don't like it. I think Stroustrup is easier to read *and*,
  // most important, with 1tbs, you can't do these kind of comments:
  //
  // if { ...
  // } // I really like to be able to put comments here
  // else if (some really conditional that means we'd have to put our comment inside the else-if!) {...}
  //
  // and I do those kind of comments sometime.
  // 'standard/brace-style'    : ['errer', 'stroustrup', { allowSingleLine: true }],
  // TODO; looks like it's failing on the `export * from './foo'` statements; even though we have the babel pluggin`
  'import/export'                          : 'off',
  'import/extensions'                      : [
    'error', // or 'warn'
    'never', // Default: disallow all extensions
    {
      svg : 'always', // Override: always allow .svg extension
    },
  ],
  'import/no-unresolved' : [
    'error',
    {
      // this is needed for the babel-module resolver to work
      caseSensitive : true,
    },
  ],
  // the standard 'no-unused-vars ignores unused args, which we'd rather catch. We also want to exclude 'React',
  // which we need to import for react to work, even when not used
  'no-unused-vars'         : ['error', { varsIgnorePattern : 'React' }],
  // style/consistency rules
  // this modifies JS Standard style
  'prefer-regex-literals'  : 'error',
  'yoda'                   : ['error', 'never'],
  // use 'process.stdout'/'process.stderr' when you really want to communicate to the user
  'no-console'             : 'error',
  // efficiency rules
  'no-await-in-loop'       : 'error',
  // rules for odd code/possible red flags/unintentional logic
  'no-lonely-if'           : 'error',
  'no-return-assign'       : 'error',
  'no-shadow'              : 'error',
  'no-extra-label'         : 'error',
  'no-label-var'           : 'error',
  'no-invalid-this'        : 'error',
  'no-unreachable-loop'    : 'error',
  'no-extra-bind'          : 'error',
  'require-await'          : 'error',
  'consistent-return'      : 'error',
  'default-case-last'      : 'error',
  'eqeqeq'                 : 'error',
  // limit code complexity
  'complexity'             : ['error', 20], // default val
  'max-depth'              : ['error', 4], // default val
  'max-lines'              : ['error', { max : 300, skipBlankLines : true, skipComments : true }], // default val,
  'max-lines-per-function' : ['error', { max : 50, skipBlankLines : true, skipComments : true }],
}

// OK, so the standard plugin provides lots of nice rules, but there are some conflicts, so we delete them (and let the
// @stylistic rules control).
delete rules['block-spacing'] // redundant with @stylistic
delete rules['brace-style'] // they want 1tbs, we want stroustrup
delete rules['comma-dangle'] // they so no, we say multiline
delete rules['eol-last'] // redundant with @stylistic
delete rules.indent; delete rules['indent-binary-ops']
delete rules['key-spacing'] // redundant with @stylistic
delete rules['operator-linebreak'] // they say after, we say before
delete rules['no-trailing-spaces'] // doesn't conflict, but it's redundant with @stylistic
delete rules['space-before-function-paren'] // we override default and redundant anyway
delete rules['@stylistic/indent-binary-ops'] // this is handled better by prettier
// deprecated rules
delete rules['quote-props']

export { rules, standardPlugin, stylisticConfig }
