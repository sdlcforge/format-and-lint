// lint thinks this is extraneous because 'jest' is a defined global; but just only pushes into the global space for
// tests, not tests libraries so we have to disable the check.
import { jest } from '@jest/globals' // eslint-disable-line node/no-extraneous-import

const readFile = jest.fn()

jest.unstable_mockModule('node:fs/promises', () => ({
  readFile,
}))

const setReadFileResults = (results) => readFile.mockImplementation(async () => results) // eslint-disable-line require-await

setReadFileResults(`src2/*.mjs
# foo
  
src/**/*.mjs
`)

export { setReadFileResults }
