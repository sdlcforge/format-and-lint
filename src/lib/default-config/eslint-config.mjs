/**
 * @file ESLint configuration file implementing (almost) [Standard JS style]{@link https://standardjs.com/},
 * [ESLint recommended js rules]{@link https://eslint.org/docs/latest/rules/},
 * [jsdoc rules]{@link https://www.npmjs.com/package/eslint-plugin-jsdoc} and, when appropriate,
 * [recommended node]{@link https://www.npmjs.com/package/eslint-plugin-node} and
 * [react]{@link https://www.npmjs.com/package/eslint-plugin-react} rules as well.
 *
 * Our one exception to the standard style is implementing aligned colons on multiline
 * 'key-spacing'. We think it makes things more readable. We also add a preference for regex literals where possible.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import globalsPkg from 'globals'
import importPlugin from 'eslint-plugin-import'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import nodePlugin from 'eslint-plugin-node'
import promisePlugin from 'eslint-plugin-promise'
import nPlugin from 'eslint-plugin-n'
import babelParser from '@babel/eslint-parser'
import { fixupPluginRules } from '@eslint/compat'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import standardConfig from 'eslint-config-standard-kit'

import { linebreakTypesExcept } from './lib/linebreak-types-except'
import { allExts, allExtsStr, jsxExtsStr } from './js-extensions'

const __dirname = dirname(fileURLToPath(import.meta.url))

const babelConfigPathInstalled = join(__dirname, 'babel', 'babel.config.cjs')
const babelConfigPathTest = join('dist', 'babel', 'babel.config.cjs')

const babelConfigPath =
  existsSync(babelConfigPathInstalled) === true
    ? babelConfigPathInstalled
    : existsSync(babelConfigPathTest)
      ? babelConfigPathTest
      : undefined
if (babelConfigPath === undefined) {
  throw new Error('Could not find babel config file.')
}

const packageContents = readFileSync('./package.json', { encoding : 'utf8' })
const packageJSON = JSON.parse(packageContents)
const {
  dependencies = {},
  devDependencies = {},
  engines = { node : true },
} = packageJSON

const standardPlugin = standardConfig({
  prettier : true,
  sortImports : true,
  jsx: true,
  node: true,
  react: true,
  typescript: true,
})

const usesReact =
  dependencies.react !== undefined || devDependencies.react !== undefined
const reactSettings = usesReact ? { version : 'detect' } : {}

const stylisticConfig = stylistic.configs['recommended-flat']

const plugins = Object.assign(
  {
    standard : standardPlugin,
    import   : importPlugin,
    promise  : promisePlugin,
    n        : nPlugin,
  },
  stylisticConfig.plugins
) // this names the plugin '@stylistic'

const rules = {
  ...js.configs.recommended.rules,
  ...standardPlugin.rules,
  ...stylisticConfig.rules, // the stylistic rules also cover react rules
  // override key spacing to get things aligned
  '@stylistic/key-spacing' : [
    'error',
    { align : 'colon', afterColon : true, beforeColon : true },
  ],
  // override to allow avoiding escapes
  '@stylistic/quotes' : [
    'error',
    'single',
    { allowTemplateLiterals : true, avoidEscape : true },
  ],
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
    },
  ],
  '@stylistic/function-call-argument-newline' : ['error', 'consistent'],
  '@stylistic/function-call-spacing'          : ['error', 'never'],
  '@stylistic/function-paren-newline'         : ['error', 'consistent'],
  '@stylistic/indent'                         : [
    'error',
    2,
    {
      ArrayExpression        : 1,
      CallExpression         : { arguments : 1 },
      flatTernaryExpressions : false,
      FunctionDeclaration    : { body : 1, parameters : 1 },
      FunctionExpression     : { body : 1, parameters : 1 },
      ignoreComments         : false,
      ignoredNodes           : [
        'TSUnionType',
        'TSIntersectionType',
        'TSTypeParameterInstantiation',
        'FunctionExpression > .params[decorators.length > 0]',
        'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
      ],
      ImportDeclaration        : 1,
      MemberExpression         : 1,
      ObjectExpression         : 1,
      offsetTernaryExpressions : true,
      outerIIFEBody            : 1,
      SwitchCase               : 1,
      VariableDeclarator       : 4,
    },
  ],
  '@stylistic/linebreak-style'         : ['error', 'unix'],
  // '@stylistic/indent-binary-ops': ['error', 4], // same as default, but since we define indent, these two go together
  '@stylistic/max-statements-per-line' : ['error', { max : 2 }], // allow for short one-liners
  // The default is just 'before'; but equals are special. IMO.
  '@stylistic/operator-linebreak'      : [
    'error',
    'before',
    { overrides : { '=' : 'after', '-=' : 'after', '+=' : 'after' } },
  ],
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
  '@stylistic/space-before-function-paren' : [
    'error',
    { anonymous : 'always', asyncArrow : 'always', named : 'never' },
  ],
  '@stylistic/switch-colon-spacing' : ['error', { after : true, before : false }],
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
  'import/export'                   : 'off',
  // the standard 'no-unused-vars ignores unused args, which we'd rather catch. We also want to exclude 'React',
  // which we need to import for react to work, even when not used
  'no-unused-vars'                  : ['error', { varsIgnorePattern : 'React' }],
  // style/consistency rules
  // this modifies JS Standard style
  'prefer-regex-literals'           : 'error',
  'yoda'                            : ['error', 'never'],
  // use 'process.stdout'/'process.stderr' when you really want to communicate to the user
  'no-console'                      : 'error',
  // efficiency rules
  'no-await-in-loop'                : 'error',
  // rules for odd code/possible red flags/unintentional logic
  'no-lonely-if'                    : 'error',
  'no-return-assign'                : 'error',
  'no-shadow'                       : 'error',
  'no-extra-label'                  : 'error',
  'no-label-var'                    : 'error',
  'no-invalid-this'                 : 'error',
  'no-unreachable-loop'             : 'error',
  'no-extra-bind'                   : 'error',
  'require-await'                   : 'error',
  'consistent-return'               : 'error',
  'default-case-last'               : 'error',
  'eqeqeq'                          : 'error',
  // limit code complexity
  'complexity'                      : ['error', 20], // default val
  'max-depth'                       : ['error', 4], // default val
  'max-lines'                       : [
    'error',
    { max : 300, skipBlankLines : true, skipComments : true },
  ], // default val,
  'max-lines-per-function' : [
    'error',
    { max : 50, skipBlankLines : true, skipComments : true },
  ],
}

// OK, so the standard plugin provides lots of nice rules, but there are some conflicts, so we delete them (and let the
// @stylistic rules control).
delete rules['block-spacing'] // redundant with @stylistic
delete rules['brace-style'] // they want 1tbs, we want stroustrup
delete rules['comma-dangle'] // they so no, we say multiline
delete rules['eol-last'] // redundant with @stylistic
delete rules.indent
delete rules['indent-binary-ops']
delete rules['key-spacing'] // redundant with @stylistic
delete rules['operator-linebreak'] // they say after, we say before
delete rules['no-trailing-spaces'] // doesn't conflict, but it's redundant with @stylistic
delete rules['space-before-function-paren'] // we override default and redundant anyway
delete rules['@stylistic/indent-binary-ops'] // this is handled better by prettier
// deprecated rules
delete rules['quote-props']

const allFiles = [`**/*{${allExtsStr}}`]

const defaultBaseConfig = {
  files           : allFiles,
  languageOptions : {
    parser        : babelParser,
    parserOptions : {
      sourceType        : 'module',
      requireConfigFile : true,
      babelOptions      : { configFile : babelConfigPath },
      ecmaFeatures      : { jsx : true },
    },
    ecmaVersion : 'latest',
  },
  settings : { react : reactSettings },
  plugins,
  rules,
}

if (engines?.node !== undefined) {
  defaultBaseConfig.plugins.node = fixupPluginRules(nodePlugin)
  // TODO: actually, we don't want this for MJS files... but I'm not sure what we do want
  defaultBaseConfig.languageOptions.globals = globalsPkg.node
  Object.assign(defaultBaseConfig.rules, {
    ...nodePlugin.configs.recommended.rules,
    'node/no-unsupported-features/es-syntax' : 'off', // we expect teh code to run through Babel, so it's fine
    'node/prefer-promises/dns'               : 'error',
    'node/prefer-promises/fs'                : 'error',
    'node/no-missing-import'                 : [
      'error',
      {
        tryExtensions : allExts,
      },
    ],
  })
}

const defaultJsdocConfig = {
  files   : allFiles,
  ignores : [`**/index{${allExtsStr}}`, '**/__tests__/**/*', '**/*.test.*'],
  plugins : { jsdoc : jsdocPlugin },
  rules   : {
    ...jsdocPlugin.configs['flat/recommended-error'].rules,
    'jsdoc/require-description' : 'error',
    // there is some indication that jsdoc should be able to divine default from ES6 default parameter settings (
    // e.g., func(foo = true)), but if this is possible, it's not working for us. (Prior to 2025)
    'jsdoc/no-defaults'         : 'off',
    // allow the dmd-readme-api plugin to define the 'category' tag
    'jsdoc/check-tag-names'     : ['error', { definedTags : ['category'] }],
  },
}

const defaultJsxConfig = {
  files           : [`**/*{${jsxExtsStr}}`],
  // add necessary globals when processing JSX files
  languageOptions : { globals : globalsPkg.browser },
}

const defaultTestsConfig = {
  files           : ['**/_tests_/**', `**/*.test{${allExtsStr}}`],
  // adds correct globals when processing jest tests
  languageOptions : { globals : globalsPkg.jest },
  rules           : {
    // override default check for tests; Jest 'describe' functions can get very long, and that's OK
    'max-lines-per-function' : 'off',
  },
}

const getEslintConfig = ({
  additional = {},
  base = defaultBaseConfig,
  jsdoc = defaultJsdocConfig,
  jsx = defaultJsxConfig,
  test = defaultTestsConfig,
} = {}) => {
  const eslintConfig = [base, jsdoc, jsx, test, additional]

  return eslintConfig
}

export { getEslintConfig }
