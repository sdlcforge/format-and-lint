import jsdocPlugin from 'eslint-plugin-jsdoc'

import { allTsExtsStr } from '../js-extensions'

// The JavaScript JSDoc rules above build on 'flat/recommended-error', which includes
// 'jsdoc/require-param-type' and 'jsdoc/require-returns-type' -- meaningless demands against a
// TypeScript function whose annotations already carry the types. This component is appended after
// 'defaultJsdocConfig' in the returned array so its rules win for TypeScript files.
const defaultTsJsdocConfig = {
  files   : [`**/*{${allTsExtsStr}}`],
  ignores : [`**/index{${allTsExtsStr}}`, '**/__tests__/**/*', '**/*.test.*'],
  plugins : { jsdoc : jsdocPlugin },
  rules   : {
    ...jsdocPlugin.configs['flat/recommended-typescript-error'].rules,
    'jsdoc/require-description' : 'error',
    'jsdoc/no-defaults'         : 'off',
    'jsdoc/check-tag-names'     : ['error', { definedTags : ['category'] }],
  },
}

export { defaultTsJsdocConfig }
