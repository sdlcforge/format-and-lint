import { join } from 'node:path'

import { myDirFromImport } from '../../../test/lib/my-dir-from-import'
import { selectFilesFromOptions } from '../select-files-from-options'

const __dirname = myDirFromImport(import.meta.url)

describe('selectFilesFromOptions', () => {
  test.each([
    [
      'selects files from CWD by default',
      { files : ['src/test/lib/**'] },
      ['copy-dir-to-tmp.mjs', 'get-formatted-text-for.mjs', 'my-dir-from-import.mjs'].map((f) => `src/test/lib/${f}`),
    ],
    [
      'can set root explicitly',
      { root : __dirname, files : ['data/*.txt'] },
      ['test-gitignore-negative.txt', 'test-gitignore.txt'],
    ],
    [
      "selects default from root when 'index.mjs' is in root",
      { root : join(__dirname, 'data', 'default-root-search') },
      ['index.mjs', 'script.js', 'lib/lib.cjs'],
    ],
    [
      "selects default from src when 'index.mjs' is in src",
      { root : join(__dirname, 'data', 'default-src-search') },
      ['index.mjs', 'script.js', 'another-lib/lib.cjs'],
    ],
  ])('%s', async (descirption, options, expectedFiles) => {
    const selectedFiles = await selectFilesFromOptions(options)
    expect(selectedFiles).toHaveLength(expectedFiles.length)
    for (let i = 0; i < selectedFiles.length; i += 1) {
      if (selectedFiles[i].endsWith(expectedFiles[i]) !== true) {
        throw new Error(`Expected to match '${expectedFiles[i]}', but got '${selectedFiles[i]}' (position ${i}).`)
      }
    }
  })

  test('raises error if it cannot find indicators implying default search pattern', async () => {
    try {
      await selectFilesFromOptions({ root : join(__dirname, 'data') })
      throw new Error('Did not raise error as expected.')
    }
    catch (e) {
      expect(e.message).toMatch(/Did not find root index nor 'src' directory/)
    }
  })
})
