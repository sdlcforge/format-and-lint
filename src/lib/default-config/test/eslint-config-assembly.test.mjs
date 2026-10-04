import { getEslintConfig } from '../eslint-config'

describe('getEslintConfig assembly', () => {
  test('returns components in the load-bearing order', () => {
    const ids = ['base', 'jsdoc', 'tsJsdoc', 'jsx', 'test', 'ts', 'cli', 'additional']
    const sentinels = Object.fromEntries(ids.map((id) => [id, { id }]))

    const config = getEslintConfig(sentinels)

    expect(config).toEqual(ids.map((id) => sentinels[id]))
    config.forEach((entry, i) => expect(entry).toBe(sentinels[ids[i]]))
  })

  test('with no arguments, returns eight entries starting with the real base config', () => {
    const config = getEslintConfig()

    expect(config).toHaveLength(8)
    expect(Array.isArray(config[0].files)).toBe(true)
    expect(config[0].files.length).toBeGreaterThan(0)
  })

  test('default cli entry turns off node/shebang that base turns on', () => {
    const config = getEslintConfig()

    expect(config[0].rules['node/shebang']).toBe('error')
    expect(config[6].rules['node/shebang']).toBe('off')
  })
})
