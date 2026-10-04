/**
 * @file TEMPORARY harness that pins the fully resolved ESLint config so the component split can be
 * proven behavior-neutral. Controlled by 'CONFIG_SNAPSHOT' ('write' | 'compare'); skipped otherwise.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { getEslintConfig } from '../eslint-config'

const mode = process.env.CONFIG_SNAPSHOT
const baselinePath = join(process.cwd(), 'plan', 'resources', 'config-snapshot.baseline.json')
const root = process.cwd()

const scrub = (str) => str.split(root).join('<ROOT>')

// Large function-bearing objects (plugins, parsers) are reduced to their key list plus 'meta'.
const summarizeOpaque = (value, ancestors) => ({
  '[Opaque]' : true,
  'keys'     : Object.keys(value).sort(),
  'meta'     : value.meta === undefined ? null : normalize(value.meta, ancestors, false),
})

const normalize = (value, ancestors = [], walkOpaque = true) => {
  if (typeof value === 'function') {
    return `[Function ${value.name}]`
  }
  if (typeof value === 'string') {
    return scrub(value)
  }
  if (value === null || typeof value !== 'object') {
    return value === undefined ? '[undefined]' : value
  }
  if (ancestors.includes(value)) {
    return '[Circular]'
  }
  const next = [...ancestors, value]
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item, next, walkOpaque))
  }
  const out = {}
  for (const key of Object.keys(value).sort()) {
    const child = value[key]
    if (walkOpaque === true && key === 'plugins' && child !== null && typeof child === 'object') {
      out[key] = {}
      for (const pluginName of Object.keys(child).sort()) {
        out[key][pluginName] = summarizeOpaque(child[pluginName], next)
      }
    }
    else if (walkOpaque === true && key === 'parser' && child !== null && typeof child === 'object') {
      out[key] = summarizeOpaque(child, next)
    }
    else {
      out[key] = normalize(child, next, walkOpaque)
    }
  }

  return out
}

const buildSnapshot = () =>
  JSON.stringify(
    {
      default    : normalize(getEslintConfig()),
      cliEmpty   : normalize(getEslintConfig({ cli : {} })),
      additional : normalize(getEslintConfig({ additional : { rules : { x : 'off' } } })),
    },
    null,
    2
  ) + '\n'

const describeDiff = (expected, actual) => {
  const exp = JSON.parse(expected)
  const act = JSON.parse(actual)
  const lines = []
  for (const variant of new Set([...Object.keys(exp), ...Object.keys(act)])) {
    const len = Math.max(exp[variant]?.length ?? 0, act[variant]?.length ?? 0)
    for (let i = 0; i < len; i += 1) {
      if (JSON.stringify(exp[variant]?.[i]) !== JSON.stringify(act[variant]?.[i])) {
        lines.push(`${variant}[${i}] differs`)
      }
    }
  }

  return lines.join('\n')
}

const maybeDescribe = mode === 'write' || mode === 'compare' ? describe : describe.skip

maybeDescribe('config snapshot', () => {
  test(mode === 'write' ? 'writes the baseline' : 'matches the baseline', () => {
    const actual = buildSnapshot()
    if (mode === 'write') {
      mkdirSync(dirname(baselinePath), { recursive : true })
      writeFileSync(baselinePath, actual)

      return
    }
    const expected = readFileSync(baselinePath, { encoding : 'utf8' })
    if (expected !== actual) {
      throw new Error(`Config snapshot mismatch:\n${describeDiff(expected, actual)}`)
    }
    expect(actual).toBe(expected)
  })
})
