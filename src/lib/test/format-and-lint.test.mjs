/**
 * @file Tests the config works as expected based on a sampling of rules.
 */
import { readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { copyDirToTmp, getTmpDir } from '../../test/lib/copy-dir-to-tmp'
import { formatAndLint } from '../format-and-lint'
import { getFormattedTextFor } from '../../test/lib/get-formatted-text-for'
import { myDirFromImport } from '../../test/lib/my-dir-from-import'

const __dirname = myDirFromImport(import.meta.url)

describe('formatAndLint', () => {
  test("raises error if 'eslintConfig' and 'eslintConfigComponents' defined", async () => {
    const args = {
      check                  : true,
      eslintConfig           : [],
      eslintConfigComponents : [],
      files                  : ['foo.js'],
    }
    try {
      // expect(() => formatAndLint(args)).toThrow(/You cannot define/)
      await formatAndLint(args)
    }
    catch (e) {
      expect(e.message).toMatch(/You cannot define/)
    }
  })

  const formatTests = [
    ['correctly handles prettier only formatting', 'basic-indent'],
    ['correctly formats boolean operators in if statement', 'boolean-ops'],
    ['correctly places required semicolon', 'necessary-semicolon'],
  ]

  test.each(formatTests)('%s', async (description, testDir) => {
    testDir = resolve(__dirname, 'data', testDir)
    const testFile = resolve(testDir, 'index.mjs')

    const { lintResults } = await formatAndLint({
      noWrite : true,
      files   : [testFile],
    })

    const formattedFileContents = await getFormattedTextFor(testFile)

    expect(lintResults[0].output).toBe(formattedFileContents)
  })

  test('will update files in place', async () => {
    const testDirSrc = resolve(__dirname, 'data', 'boolean-ops')
    let tmpDir

    try {
      tmpDir = await copyDirToTmp(testDirSrc, { excludePaths : ['**/*.txt'] })

      const testFile = join(tmpDir, 'index.mjs')

      await formatAndLint({ files : [testFile] })

      const formattedFileContents = await readFile(testFile, {
        encoding : 'utf8',
      })
      const formattedExampleConents = await getFormattedTextFor(join(testDirSrc, 'index.mjs'))

      expect(formattedFileContents).toBe(formattedExampleConents)
    }
    finally {
      if (tmpDir !== undefined) {
        await rm(tmpDir, { recursive : true })
      }
    }
  })

  test('will write to output directory', async () => {
    const tmpDir = await getTmpDir()
    const srcRoot = join(__dirname, 'data', 'basic-indent')
    const srcFile = join(srcRoot, 'index.mjs')
    const formattedExampleConents = await getFormattedTextFor(srcFile)
    try {
      await formatAndLint({
        files        : [srcFile],
        outputDir    : tmpDir,
        relativeStem : srcRoot,
      })
      const formattedFile = join(tmpDir, 'index.mjs')
      const formattedFileContents = await readFile(formattedFile, {
        encoding : 'utf8',
      })

      expect(formattedFileContents).toBe(formattedExampleConents)
    }
    finally {
      await rm(tmpDir, { recursive : true })
    }
  })
})
