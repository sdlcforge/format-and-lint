import commandLineArgs from 'command-line-args'
import { ArgumentInvalidError } from 'standard-error-set'

import { cliSpec } from './cli-spec'
import { formatAndLint } from '../lib/format-and-lint'
import { getEslint } from '../lib/lib/get-eslint'
import { processConfigFile } from './lib/process-config-file'
import { selectFilesFromOptions } from '../lib/lib/select-files-from-options'

const fandl = async ({ argv = process.argv, stdout = process.stdout } = {}) => {
  const mainOpts = commandLineArgs(cliSpec.arguments, {
    argv,
    camelCase : true,
    partial   : true,
  })
  const command = mainOpts.command || 'format-and-lint'

  if (command === 'format-and-lint' || command === 'lint') {
    const options = extractFormatOrLintOptions(command, mainOpts)

    const {
      // see 'selectFilesFromOptions' for additional options processed by fandl
      eslintConfigPath,
      eslintConfigComponentsPath,
      prettierConfigPath,
      ...remainderOptions
    } = options

    const check = command === 'lint'

    verifyArgs(options)

    const filePaths = await selectFilesFromOptions(remainderOptions)

    const eslintConfig =
      eslintConfigPath === undefined
        ? undefined
        : await processConfigFile(eslintConfigPath)

    const eslintComfigComponents =
      eslintConfigComponentsPath === undefined
        ? undefined
        : await processConfigFile(eslintConfigComponentsPath)

    const prettierConfig =
      prettierConfigPath === undefined
        ? undefined
        : await processConfigFile(prettierConfigPath)

    const eslint = getEslint({ check, eslintConfig, eslintComfigComponents })

    const { lintResults } = await formatAndLint({
      ...remainderOptions, // must come first; will commonly specify 'files'
      check,
      eslint,
      files : filePaths,
      prettierConfig,
    })

    // TODO: support '--color', '--no-color options; The formatter internally uses 'chalk', which auto-detects color
    // based on:
    // 1) '--color' or '--no-color' options on process.argv
    // 2) FORCE_COLOR env var
    // 3) output stream type
    const formatter = await eslint.loadFormatter('stylish')
    const resultText = formatter.format(lintResults)

    stdout.write(resultText)
    // if we had something to say, then that indicates an error/warning in the source
    if (resultText !== '') {
      process.exit(1) // eslint-disable-line  no-process-exit
    }
  }
}

const extractFormatOrLintOptions = (command, mainOpts) =>
  mainOpts._unknown === undefined
    ? mainOpts
    : Object.assign(
        {},
        mainOpts,
        commandLineArgs(
          cliSpec.commands.find((c) => c.name === command).arguments,
          { argv : mainOpts._unknown, camelCase : true }
        )
      )

const verifyArgs = ({ eslintConfigPath, eslintConfigComponentsPath }) => {
  if (
    eslintConfigPath !== undefined
    && eslintConfigComponentsPath !== undefined
  ) {
    throw new ArgumentInvalidError({
      message :
        "Specifying both '--eslint-config-path' and '--eslint-config-components-path' is invalid. Please specify one or the other.",
    })
  }
}

export { fandl }
