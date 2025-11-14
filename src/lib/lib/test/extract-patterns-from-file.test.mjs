import './mock-read-file'

describe('extractPatternsFromFile', () => {
  let extractPatternsFromFile
  beforeAll(async () => {
    ({ extractPatternsFromFile } = await import('../extract-patterns-from-file'))
  })

  test('excludes comment and blank lines', async () => {
    const results = await extractPatternsFromFile('blah')
    expect(results).toEqual(['src2/*.mjs', 'src/**/*.mjs'])
  })
})
