/**
 * @file The base ESLint component: parser, resolver settings, plugins, and the base rules table
 * (plus node globals and rules when the consuming project targets node).
 */
import { join } from 'node:path'

import babelParser from '@babel/eslint-parser'
import { fixupPluginRules } from '@eslint/compat'
import importPlugin from 'eslint-plugin-import'
import nPlugin from 'eslint-plugin-n'
import nodePlugin from 'eslint-plugin-node'
import promisePlugin from 'eslint-plugin-promise'
import globalsPkg from 'globals'

import { rules, standardPlugin, stylisticConfig } from './base-rules'
import { allFiles, babelConfigPath, engines, usesReact } from './shared'

const reactSettings = usesReact ? { version : 'detect' } : {}

const plugins = Object.assign(
  {
    standard : standardPlugin,
    import   : importPlugin,
    promise  : promisePlugin,
    n        : nPlugin,
  },
  stylisticConfig.plugins // this names the plugin '@stylistic'
)

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
  settings : {
    'import/resolver' : {
      'babel-module' : {
        alias : {
          // the examples in the plugin docs are relative paths, the transpiled code was always one '..' too few when we
          // did it that way, so we use the absolute path
          _lib : join(process.cwd(), 'test-staging', 'lib'),
          _cli : join(process.cwd(), 'test-staging', 'cli'),
        },
        // the TypeScript extensions are required or a local 'import ... from './helper'' resolving
        // to 'helper.ts' raises 'import/no-unresolved'
        extensions : ['.js', '.jsx', '.es', '.es6', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx'],
      },
    },
    'react' : reactSettings,
  },
  plugins,
  rules,
}

// NOTE: 'rules' above is the very same object 'base-rules.mjs' exports, so the 'Object.assign'
// below mutates that shared table as well; this is observable behavior, preserved from the
// original single-file config.
if (engines?.node !== undefined) {
  defaultBaseConfig.plugins.node = fixupPluginRules(nodePlugin)
  // TODO: actually, we don't want this for MJS files... but I'm not sure what we do want
  defaultBaseConfig.languageOptions.globals = globalsPkg.node
  Object.assign(defaultBaseConfig.rules, {
    ...nodePlugin.configs.recommended.rules,
    'node/no-unsupported-features/es-syntax' : 'off', // we expect teh code to run through Babel, so it's fine
    'node/prefer-promises/dns'               : 'error',
    'node/prefer-promises/fs'                : 'error',
    'node/no-missing-import'                 : 'off', // 'import/no-unresolved' is used instead
    'node/shebang'                           : 'error', // never auto-fixed (get-eslint.mjs); fandl must not change behavior
  })
}

export { defaultBaseConfig }
