import {
  allExts,
  allExtsStr,
  allTsExts,
  allTsExtsStr,
  jsxExts,
  jsxExtsStr,
  jsxLikeExts,
  jsxLikeExtsStr,
  stdExts,
  stdExtsStr,
  tsExts,
  tsExtsStr,
  tsxExts,
  tsxExtsStr
} from '../js-extensions'

describe('js-extensions', () => {
  test('stdExts has the expected contents', () => {
    expect(stdExts).toEqual(['.js', '.cjs', '.mjs'])
  })

  test('jsxExts has the expected contents', () => {
    expect(jsxExts).toEqual(['.jsx'])
  })

  test('tsExts has the expected contents', () => {
    expect(tsExts).toEqual(['.ts', '.mts', '.cts'])
  })

  test('tsxExts has the expected contents', () => {
    expect(tsxExts).toEqual(['.tsx'])
  })

  test('allTsExts composes tsExts and tsxExts', () => {
    expect(allTsExts).toEqual(['.ts', '.mts', '.cts', '.tsx'])
  })

  test('jsxLikeExts composes jsxExts and tsxExts', () => {
    expect(jsxLikeExts).toEqual(['.jsx', '.tsx'])
  })

  test('allExts contains every extension from all four buckets exactly once', () => {
    const expected = ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.mts', '.cts', '.tsx']
    expect(allExts).toEqual(expected)

    const uniqueExts = new Set(allExts)
    expect(uniqueExts.size).toBe(allExts.length)

    for (const ext of [...stdExts, ...jsxExts, ...allTsExts]) {
      expect(allExts).toContain(ext)
    }
  })

  test('*Str exports equal the comma-join of their array counterparts', () => {
    expect(stdExtsStr).toBe(stdExts.join(','))
    expect(jsxExtsStr).toBe(jsxExts.join(','))
    expect(tsExtsStr).toBe(tsExts.join(','))
    expect(tsxExtsStr).toBe(tsxExts.join(','))
    expect(allTsExtsStr).toBe(allTsExts.join(','))
    expect(jsxLikeExtsStr).toBe(jsxLikeExts.join(','))
    expect(allExtsStr).toBe(allExts.join(','))
  })
})
