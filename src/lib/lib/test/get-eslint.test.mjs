import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'

import { getEslint } from '../get-eslint'

// 'node/shebang' needs a package.json in an ancestor directory to evaluate a file, so the scratch dir lives under the
// repo rather than the OS temp dir.
const testDir = dirname(fileURLToPath(import.meta.url))

describe('getEslint', () => {
  let dir
  const source = '#!/usr/bin/env node\nconst x = 1\n\nexport { x }\n'

  beforeEach(async () => {
    dir = await mkdtemp(join(testDir, 'tmp-shebang-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive : true, force : true })
  })

  test.each([
    ['check false (fix mode)', false],
    ['check true', true],
  ])("reports 'node/shebang' on a non-CLI file without fixing it when %s", async (description, check) => {
    const file = join(dir, 'lib-file.mjs')
    await writeFile(file, source)

    const eslint = getEslint({ check })
    const results = await eslint.lintFiles([file])
    await ESLint.outputFixes(results)

    expect(results[0].messages.map((m) => m.ruleId)).toContain('node/shebang')
    expect(await readFile(file, 'utf8')).toBe(source)
  })

  test("does not report 'node/shebang' on a CLI file", async () => {
    const file = join(dir, 'tool-cli.mjs')
    await writeFile(file, source)

    const results = await getEslint({ check : false }).lintFiles([file])

    expect(results[0].messages.map((m) => m.ruleId)).not.toContain('node/shebang')
  })
})
