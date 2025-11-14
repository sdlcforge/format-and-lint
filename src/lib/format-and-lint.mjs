import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'

import { format as prettierFormat } from 'prettier'
import { ArgumentInvalidError, ArgumentMissingError } from 'standard-error-set'

import { getEslint } from './lib/get-eslint'
import { prettierConfig as defaultPrettierConfig } from './default-config/prettier.config'

/**
 * Parses, lints, and (when `check` is false) reformats the `files` text. By default, this function will update the
 * `files` in-place.
 * @param {object} options - The input options.
 * @param {boolean} [options.check = false] - If `true` then the files are linted, but not reformatted.
 * @param {boolean} [options.noWrite = false] - If `true`, then the files are not updated in placed. Has no effect when
 *   `check = false`, but when combined with `check = true`, means that the text is reformatted and attached to the
 *   `LintResult`s, but the files themselves are not updated. You can access reformatted text as part of the
 *   `result.lintResults[0].output`. Unlike results directly from `ESLint`, `output` is
 *   always present on the `LintResult` object (rather than only being set if the text is changed.
 * @param {object} [options.eslintConfig = <default eslint config>] - A flat (9.x) style array of [eslint configuration
 *   object](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-objects) to be used in
 *   place of the default, out of the box configuration. This may not be specified along with `eslintConfigComponents`.
 * @param {object} [options.eslintConfigComponents = undefined] - An object with zero or more keys corresponding to the
 *   `base`, `jsdoc`, `jsx`, `test`, or `additional` as discussed in the [component based
 *   configuration](#component-based-configuration). This may not be specified along with `eslintConfig`.
 * @param {object} [options.prettierConfig = <default prettier config>] - A prettier [options
 *   object](https://prettier.io/docs/en/options).
 * @param {object} [options.eslint = undefined] - A pre-configured
 *   [`ESLint`](https://eslint.org/docs/latest/integrate/nodejs-api#eslint-class) instance. If this is defined, then
 *   `eslintConfig` and `eslintConfigComponents` will be ignored.
 * @param {string} [options.outputDir = undefined] - If provided, then output files (whether reformatted or not) will be
 *   written to the specified directory relative to their location in the source. With `src/index.mjs` =>
 *   `<outputDir>/src/index.mjs`, `src/foo/bar.mjs` => `<outputDir>/src/foo/bar.mjs`. This option has no effect if
 *   `check = true` or `noWrite = true`. The relative starting point is controlled with the `relativeStem` option.
 * @param {string} [options.relativeStem = process.cwd()] - Controls the starting point for determining the relative
 *   position of files when emitting to `outputDir` rather than updating in place. Impossible stems will result in an
 *   error. E.g., given file `src/index.mjs`, `relativeStem = 'src/foo'` is invalid.
 * @returns {Promise<{eslint: object, lintResults: object[]}>} Resolves to an object with two fields. `eslint` points
 * to the an instance of [`ESLint`](https://eslint.org/docs/latest/integrate/nodejs-api#eslint-class). `lintResults`
 * points to an array of [`LintResult`](https://eslint.org/docs/latest/integrate/nodejs-api#-lintresult-type)s.
 */
const formatAndLint = async (options) => {
  const {
    // see 'processSource' for additional options
    check = false,
    eslintConfig,
    eslintConfigComponents,
    prettierConfig = defaultPrettierConfig,
  } = options

  if (options.files === undefined || options.files.length === 0) {
    throw new ArgumentMissingError({
      argumentName  : 'files',
      argumentType  : 'string[]',
      argumentValue : options.files,
    })
  }

  // make files absolute
  const files = options.files.map((f) => path.resolve(f))

  const processOptions = Object.assign({}, options)

  if (processOptions.eslint === undefined) {
    processOptions.eslint = getEslint({
      check,
      eslintConfig,
      eslintConfigComponents,
    })
  }

  const prettierParseConfig = structuredClone(prettierConfig)
  prettierParseConfig.parser = 'babel'
  processOptions.prettierConfig = prettierParseConfig

  const lintResults = (await Promise.all(files.map((file) => processSource(file, processOptions)))).flat()

  return { eslint : processOptions.eslint, lintResults }
}

const processSource = async (
  file,
  { check = false, eslint, noWrite = false, outputDir, prettierConfig, relativeStem = process.cwd() }
) => {
  const readPromise = readFile(file, { encoding : 'utf8' })
  const inputSource = await readPromise
  const prettierSource = check === true ? inputSource : await prettierFormat(inputSource, prettierConfig)
  const lintResults = await eslint.lintText(
    // we must specify the file path in order for the proper rules from the flat config to attach
    prettierSource,
    { filePath : file }
  )

  // the output is undefined if there are no changes due to the linting, but there may be changes due to prettier, so
  // to keep the ultimate result consistent, we have to update output if prettier did something
  if (lintResults[0].output === undefined && prettierSource !== inputSource) {
    lintResults[0].output = prettierSource
  }
  const formattedText = lintResults[0].output

  if (check !== true && noWrite !== true && (formattedText !== undefined || outputDir !== undefined)) {
    let outputPath = file
    if (outputDir !== undefined) {
      if (!file.startsWith(outputPath)) {
        throw new ArgumentInvalidError({
          message : `Resolved input file path '${file}' does not start with effective source stem '${relativeStem}'.`,
          hint    : "Check input file paths/selection patterns and set or harmonize '--relative-stem' option if necessary.",
        })
      }

      let relPath = file.slice(relativeStem.length)
      if (relPath.startsWith(path.sep)) {
        relPath = relPath.slice(1)
      }
      outputPath = path.join(outputDir, relPath)

      await mkdir(path.dirname(outputPath), { recursive : true })
    }

    const outputText = formattedText || prettierSource
    await writeFile(outputPath, outputText, { encoding : 'utf8' })
  }

  return lintResults
}

export { formatAndLint }
