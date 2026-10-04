import globalsPkg from 'globals'

import { jsxLikeExtsStr } from '../js-extensions'

const defaultJsxConfig = {
  // covers '.jsx' *and* '.tsx'; TSX needs the same browser globals as JSX
  files           : [`**/*{${jsxLikeExtsStr}}`],
  // add necessary globals when processing JSX files
  languageOptions : { globals : globalsPkg.browser },
}

export { defaultJsxConfig }
