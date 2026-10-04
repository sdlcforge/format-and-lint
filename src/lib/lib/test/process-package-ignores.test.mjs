import * as fs from 'node:fs/promises'
import { join } from 'node:path'

import { getTmpDir } from '../../../test/lib/copy-dir-to-tmp'
import { processPackageIgnores } from '../process-package-ignores'

describe('processPackageIgnores', () => {
  let origCwd, tmpDir

  beforeAll(async () => {
    origCwd = process.cwd()
    tmpDir = await getTmpDir()
    await fs.writeFile(join(tmpDir, 'package.json'), '{ "devPkg": { "linting": { "ignores": ["foo"] }}}')
    process.chdir(tmpDir)
  })

  afterAll(async () => {
    process.chdir(origCwd)
    await fs.rm(tmpDir, { recursive : true, force : true })
  })

  test('loads ignores from package.json', async () => {
    const results = await processPackageIgnores()
    expect(results).toEqual(['foo'])
  })
})
