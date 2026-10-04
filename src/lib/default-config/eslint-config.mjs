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
import { defaultBaseConfig } from './eslint-components/base'
import { defaultCliConfig } from './eslint-components/cli'
import { defaultJsdocConfig } from './eslint-components/jsdoc'
import { defaultJsxConfig } from './eslint-components/jsx'
import { defaultTestsConfig } from './eslint-components/tests'
import { defaultTsConfig } from './eslint-components/ts'
import { defaultTsJsdocConfig } from './eslint-components/ts-jsdoc'

// The order of the returned array is load-bearing: a later flat-config entry with a matching 'files'
// glob overrides an earlier one. 'tsJsdoc' sits directly after 'jsdoc' so the TypeScript JSDoc rules
// supersede the JavaScript ones for TS files while staying overridable by later components; 'ts'
// sits after 'test' so its rule overrides win for TypeScript files; 'cli' sits after 'base' (and
// after every other named component) so its 'off' entries win over base's 'error' for CLI
// entrypoints; 'additional' stays last so callers can still override everything.
const getEslintConfig = ({
  additional = {},
  base = defaultBaseConfig,
  cli = defaultCliConfig,
  jsdoc = defaultJsdocConfig,
  jsx = defaultJsxConfig,
  test = defaultTestsConfig,
  ts = defaultTsConfig,
  tsJsdoc = defaultTsJsdocConfig,
} = {}) => {
  const eslintConfig = [base, jsdoc, tsJsdoc, jsx, test, ts, cli, additional]

  return eslintConfig
}

export { getEslintConfig }
