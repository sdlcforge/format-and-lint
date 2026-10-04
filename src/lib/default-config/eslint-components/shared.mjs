/**
 * @file Values shared by the ESLint config components: the resolved babel config path, the
 * consuming project's 'engines', whether it uses React, and the all-files glob.
 *
 * This module owns the two one-shot, import-time effects of the config (reading the consumer's
 * package manifest and resolving the babel config, which throws when absent). ES module singletons
 * guarantee they run once, in dependency order, at first import; no other module may repeat them.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { allExtsStr } from '../js-extensions'

const __dirname = dirname(fileURLToPath(import.meta.url))

const babelConfigPathInstalled = join(__dirname, 'babel', 'babel.config.cjs')
// Dev/test fallback: this file lives at 'src/lib/default-config/eslint-components/shared.mjs', so four '..'
// segments reach the repo root, where 'make' places the built babel config at
// 'dist/babel/babel.config.cjs'. Anchored on '__dirname' (like 'babelConfigPathInstalled' above)
// rather than 'process.cwd()' so it resolves correctly regardless of the caller's working directory.
const babelConfigPathTest = join(__dirname, '..', '..', '..', '..', 'dist', 'babel', 'babel.config.cjs')

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
const { dependencies = {}, devDependencies = {}, engines = { node : true } } = packageJSON

const usesReact = dependencies.react !== undefined || devDependencies.react !== undefined

const allFiles = [`**/*{${allExtsStr}}`]

export { allFiles, babelConfigPath, engines, usesReact }
