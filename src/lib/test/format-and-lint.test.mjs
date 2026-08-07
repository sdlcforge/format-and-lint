/**
 * @file Tests the config works as expected based on a sampling of rules.
 */
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { copyDirToTmp, getTmpDir } from '../../test/lib/copy-dir-to-tmp'
import { getFormattedTextFor } from '../../test/lib/get-formatted-text-for'
import { myDirFromImport } from '../../test/lib/my-dir-from-import'
import { formatAndLint } from '../format-and-lint'

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
    ['correctly formats TypeScript type annotations', 'ts-type-annotations', 'index.ts'],
    ['correctly indents TypeScript enum bodies', 'ts-enum-indent', 'index.ts'],
    ['correctly formats a TSX component', 'tsx-component', 'index.tsx'],
  ]

  test.each(formatTests)('%s', async (description, testDir, fileName = 'index.mjs') => {
    testDir = resolve(__dirname, 'data', testDir)
    const testFile = resolve(testDir, fileName)

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

  // Guards the prettier-vs-ESLint round-trip stability documented in
  // 'plan/notes/typescript-parsing-layer.md': prettier and '@stylistic' disagree on a couple of
  // TypeScript-specific formatting points (generic-arrow trailing commas, JSX collapsing), and the
  // two are verified to converge after a single pass. Convergence happens by luck of rule
  // interaction, not by design, so this test pins it: formatting an already-formatted TypeScript
  // file must be a no-op.
  const idempotenceTests = [
    ['is idempotent for an already-formatted TypeScript source', 'ts-type-annotations', 'index.ts'],
    ['is idempotent for an already-formatted TSX source', 'tsx-component', 'index.tsx'],
  ]

  test.each(idempotenceTests)('%s', async (description, testDir, fileName) => {
    const srcFile = resolve(__dirname, 'data', testDir, fileName)

    const { lintResults : firstPassResults } = await formatAndLint({
      noWrite : true,
      files   : [srcFile],
    })
    const firstPassOutput = firstPassResults[0].output

    let tmpDir
    try {
      tmpDir = await getTmpDir()
      const secondPassFile = join(tmpDir, fileName)
      await writeFile(secondPassFile, firstPassOutput, { encoding : 'utf8' })

      const { lintResults : secondPassResults } = await formatAndLint({
        noWrite : true,
        files   : [secondPassFile],
      })
      // 'output' is undefined when the pipeline made no changes at all; in that case the
      // second-pass result is, by definition, identical to what was fed in.
      const secondPassOutput = secondPassResults[0].output ?? firstPassOutput

      expect(secondPassOutput).toBe(firstPassOutput)
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
