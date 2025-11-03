# @sdlcforge/format-and-lint
[![coverage: 97%](./.readme-assets/coverage.svg)](https://github.com/liquid-labs/format-and-lint/pulls?q=is%3Apr+is%3Aclosed)

Pre-configured formatting and lint tool combining the best of prettier and eslint. Aka, fandl.

- [Install](#instal)
- [Usage](#usage)
  - [CLI](#cli)
  - [API](#api)
- [API reference](#api-reference)
- [Component based configuration](#component-based-configuration)
- [Reformatting process overview](#reformatting-process-overview)

## Install

```bash
npm i @sdlcforge/format-and-lint
```

## Usage

### CLI

```bash
npx fandl lint # runs lint checks only with no changes to files
npx fandl # fixes what it can and reports on the rest
npx fandl --files '**/weird-src/**/*.{js,mjs,cjs,jsx}' # specify files pattern
```

### API

```javascript
import { formatAndLint } from '@sdlcforge/format-and-lint'

// in the API, we provide actual file paths, which may be relative or absolute
const files = ['index.js', 'src/foo.js', 'src/bar.js']
const { eslint, lintResults } = formatAndLint({ files })
// process the results; the following is essentially what the fandl CLI does
const formatter = await eslint.loadFormatter('stylish')
const resultText = formatter.format(lintResults)

stdout.write(resultText)
// if we had something to say, then that indicates an error/warning in the source
if (resultText !== '') {
  process.exit(1)
}
```


