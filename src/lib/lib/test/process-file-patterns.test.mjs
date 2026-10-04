import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { processFilePatterns } from '../process-file-patterns'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('process-file-patterns', () => {
  test('combines patterns and file patterns', async () => {
    const patternsFile = join(__dirname, 'data', 'patterns', 'test-patterns.txt')
    const results = await processFilePatterns(['foo/**/*.mjs'], [patternsFile])
    expect(results).toEqual(['foo/**/*.mjs', 'src2/*.mjs', 'src/**/*.mjs'])
  })
})
