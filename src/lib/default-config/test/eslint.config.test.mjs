/**
 * @file Tests the config works as expected based on a sampling of rules.
 */
import { ESLint } from 'eslint'

import { getEslintConfig } from '../eslint-config'

describe('eslint-config.mjs', () => {
  const lintTests = [
    ['detects non-literal regex', 'non-literal-regex', ['prefer-regex-literals']],
    ['detects missing dangling commas', 'dangling-commas', ['@stylistic/comma-dangle', '@stylistic/comma-dangle']],
    [
      'detects Windows style newlines',
      'windows-style-newline',
      ['@stylistic/linebreak-style', '@stylistic/linebreak-style'],
    ],
    ['idiomatic TypeScript lints clean', 'ts-clean', []],
    ['idiomatic TSX lints clean', 'tsx-clean', []],
    ['detects issues in TypeScript sources', 'ts-detects-issue', ['prefer-regex-literals']],
    ['exempts a file under a "cli/" path segment', 'cli-dir-exempt', []],
    ['exempts a file with a "-cli" basename suffix', 'cli-suffix-exempt', []],
    ['still applies the CLI rules to non-CLI files', 'cli-rules-apply', ['no-console', 'no-process-exit']],
  ]

  test.each(lintTests)('%s', async (description, testDir, ruleIds) => {
    const eslint = new ESLint({
      overrideConfigFile : true,
      overrideConfig     : getEslintConfig(),
    })

    const results = await eslint.lintFiles(`src/lib/default-config/test/data/${testDir}/**/*`)

    expect(results).toHaveLength(1)
    // do this first so we get info about the failed rules
    const failedRules = results[0].messages.map((m) => m.ruleId)
    expect(failedRules).toEqual(ruleIds)
  })

  // The 'cli' component only works if it sits *after* 'base' in the assembled array; a flat-config
  // entry earlier in the array loses to a later one for the same file. Asserting on the *resolved*
  // config (rather than only on the reported findings) pins the ordering directly: if 'cli' were
  // moved ahead of 'base', these would resolve back to 'error'.
  test.each([
    ['a "cli/" path segment', 'cli-dir-exempt/cli/index.mjs'],
    ['a "-cli" basename suffix', 'cli-suffix-exempt/example-cli.mjs'],
  ])("resolves 'no-console'/'no-process-exit' to 'off' for %s", async (description, filePath) => {
    const eslint = new ESLint({
      overrideConfigFile : true,
      overrideConfig     : getEslintConfig(),
    })

    const config = await eslint.calculateConfigForFile(`src/lib/default-config/test/data/${filePath}`)

    // ESLint normalizes a rule setting to an array whose first element is the numeric severity.
    expect(config.rules['no-console'][0]).toBe(0)
    expect(config.rules['no-process-exit'][0]).toBe(0)
    expect(config.rules['node/shebang'][0]).toBe(0)
  })

  test("'node/shebang' is an error for non-CLI files", async () => {
    const eslint = new ESLint({ overrideConfigFile : true, overrideConfig : getEslintConfig() })

    const config = await eslint.calculateConfigForFile('src/lib/default-config/test/data/cli-rules-apply/example.mjs')

    expect(config.rules['node/shebang'][0]).toBe(2)
  })

  test("'cli' component can be overridden away like any other named component", async () => {
    const eslint = new ESLint({
      overrideConfigFile : true,
      // an empty component disables the exemption; the base rules then apply to CLI files too
      overrideConfig     : getEslintConfig({ cli : {} }),
    })

    const results = await eslint.lintFiles('src/lib/default-config/test/data/cli-dir-exempt/**/*')

    expect(results).toHaveLength(1)
    const failedRules = results[0].messages.map((m) => m.ruleId)
    expect(failedRules).toEqual(['no-console', 'no-process-exit'])
  })
})
