import globalsPkg from 'globals'

import { allExtsStr } from '../js-extensions'

const defaultTestsConfig = {
  files           : ['**/__tests__/**/*', `**/*.test{${allExtsStr}}`],
  // adds correct globals when processing jest tests
  languageOptions : { globals : globalsPkg.jest },
  rules           : {
    // override default check for tests; Jest 'describe' functions can get very long, and that's OK
    'max-lines-per-function' : 'off',
    'max-lines'              : ['error', { max : 500, skipBlankLines : true, skipComments : true }],
  },
}

export { defaultTestsConfig }
