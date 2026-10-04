import jsdocPlugin from 'eslint-plugin-jsdoc'

import { allExtsStr } from '../js-extensions'

import { allFiles } from './shared'

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

export { defaultJsdocConfig }
