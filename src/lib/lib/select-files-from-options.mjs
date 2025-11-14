import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { ArgumentInvalidError } from 'standard-error-set'
import { find } from 'find-plus'

import { allExts } from '../default-config/js-extensions'
import { processFilePatterns } from './process-file-patterns'
import { processGitignore } from './process-gitignore'
import { processPackageIgnores } from './process-package-ignores'

const selectFilesFromOptions = async ({
  files,
  filesPaths,
  ignoreFiles,
  ignoreFilesPaths,
  ignorePackageSettings,
  noStandardIgnores,
  root = process.cwd(),
}) => {
  const standardIgnores = ['**/test/data/**/*', 'doc/**', 'dist/**']
  const allExtsMatch = `@(${allExts.join('|')})`

  const targetPatterns = await processFilePatterns(files, filesPaths)
  if (targetPatterns.length === 0) {
    const rootSrcIndicatorFiles = ['index.js', 'index.mjs', 'index.cjs']
    if (rootSrcIndicatorFiles.some((f) => existsSync(join(root, f)))) {
      targetPatterns.push(`**/*${allExtsMatch}`)
    }
    else if (existsSync(join(root, 'src'))) {
      targetPatterns.push(`src/**/*${allExtsMatch}`)
    }
    else {
      throw new ArgumentInvalidError({
        message : "Did not find root index nor 'src' directory to indicate default matching pattern.",
        hint    : "Specify '--files' or '--files-paths'.",
      })
    }
  }

  const ignorePatterns = await processFilePatterns(ignoreFiles, ignoreFilesPaths)
  if (noStandardIgnores !== true) {
    ignorePatterns.push(...standardIgnores)
    ignorePatterns.push(...processGitignore({ warnOnNotIgnore : true }))
  }
  if (ignorePackageSettings !== true) {
    ignorePatterns.push(...(await processPackageIgnores()))
  }

  return await find({
    onlyFiles    : true,
    root,
    paths        : targetPatterns,
    excludePaths : ignorePatterns,
  })
}

export { selectFilesFromOptions }
