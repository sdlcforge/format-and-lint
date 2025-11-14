import { readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { copyDirToTmp } from '../../test/lib/copy-dir-to-tmp'
import { fandl } from '../fandl'
import { getFormattedTextFor } from '../../test/lib/get-formatted-text-for'
import { myDirFromImport } from '../../test/lib/my-dir-from-import'

const __dirname = myDirFromImport(import.meta.url)

describe('fandl', () => {
  test('will update files in place', async () => {
    const testDirSrc = resolve(__dirname, '..', '..', 'lib', 'test', 'data', 'boolean-ops')
    let tmpDir

    try {
      tmpDir = await copyDirToTmp(testDirSrc, { excludePaths : ['**/*.txt'] })

      const testFile = join(tmpDir, 'index.mjs')

      let output
      const mockStdOut = {
        write : (msg) => {
          output = msg
        },
      }

      await fandl({
        argv   : ['--root', tmpDir, '--files', '**/*.mjs'],
        stdout : mockStdOut,
      })

      const formattedFileContents = await readFile(testFile, {
        encoding : 'utf8',
      })
      const formattedExampleConents = await getFormattedTextFor(join(testDirSrc, 'index.mjs'))

      expect(formattedFileContents).toBe(formattedExampleConents)
      expect(output).toBe('')
    }
    finally {
      if (tmpDir !== undefined) {
        await rm(tmpDir, { recursive : true })
      }
    }
  })

  test("raises error if both '--eslint-config-path' and '--eslint-config-components-path' are specified", async () => {
    try {
      await fandl({
        argv : ['--eslint-config-path', '/foo', '--eslint-config-components-path', '/foo'],
      })
      throw new Error('Did not throw error as expected.')
    }
    catch (e) {
      expect(e.message).toMatch(/^Specifying both '--eslint-config-path'/)
    }
  })
})
