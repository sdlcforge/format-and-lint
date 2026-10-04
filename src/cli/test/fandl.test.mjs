import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { copyDirToTmp } from '../../test/lib/copy-dir-to-tmp'
import { getFormattedTextFor } from '../../test/lib/get-formatted-text-for'
import { myDirFromImport } from '../../test/lib/my-dir-from-import'
import { fandl } from '../fandl'

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

  test("applies the 'additional' component from '--eslint-config-components-path'", async () => {
    let tmpDir
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {})

    try {
      tmpDir = await mkdtemp(join(tmpdir(), 'fandl-components-'))
      const testFile = join(tmpDir, 'index.mjs')
      const componentsFile = join(tmpDir, 'components.json')
      await writeFile(testFile, "console.log('hi')\n")
      await writeFile(componentsFile, JSON.stringify({ additional : { rules : { 'no-console' : 'off' } } }))

      const run = async (extraArgs) => {
        let output = ''
        await fandl({
          argv   : ['lint', '--root', tmpDir, '--files', '**/*.mjs', ...extraArgs],
          stdout : {
            write : (msg) => {
              output = msg
            },
          },
        })

        return output
      }

      // the default config reports 'no-console'; the 'additional' component turns it off
      expect(await run([])).toMatch(/no-console/)
      expect(await run(['--eslint-config-components-path', componentsFile])).toBe('')
    }
    finally {
      exitSpy.mockRestore()
      if (tmpDir !== undefined) {
        await rm(tmpDir, { recursive : true })
      }
    }
  })
})
