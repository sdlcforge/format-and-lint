import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractPatternsFromFile } from '../extract-patterns-from-file'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('extractPatternsFromFile', () => {
  test('excludes comment and blank lines', async () => {
    const results = await extractPatternsFromFile(join(__dirname, 'data', 'patterns', 'test-patterns.txt'))
    expect(results).toEqual(['src2/*.mjs', 'src/**/*.mjs'])
  })
})
