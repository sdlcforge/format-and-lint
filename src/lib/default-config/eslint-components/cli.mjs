import { allExtsStr } from '../js-extensions'

// A CLI entrypoint is identified by either of two independent signals: a 'cli/' path segment (the
// 'src/lib' + 'src/cli' layout convention) or a '-cli' basename suffix (a single-file script that
// doesn't warrant a lib/cli directory split). 'allExtsStr' is reused for the suffix pattern so
// TypeScript CLI entrypoints ('bump-version-cli.ts') are covered without a second extension list.
const defaultCliConfig = {
  files : ['**/cli/**', `**/*-cli{${allExtsStr}}`],
  rules : {
    // CLI entrypoints exist to print to the console and exit with a status code -- both rules are
    // false positives here. Library/business-logic code (everything NOT matching this component's
    // 'files' glob) keeps both rules at 'error' via the base component.
    'no-console'      : 'off',
    'no-process-exit' : 'off',
    'node/shebang'    : 'off', // CLI entrypoints legitimately carry shebangs/execute bits
  },
}

export { defaultCliConfig }
