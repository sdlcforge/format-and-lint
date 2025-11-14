import gitIgnoreToGlob from 'gitignore-to-glob'
import { CommonError } from 'standard-error-set'

const processGitignore = ({ path = '.gitignore', warnOnNotIgnore }) => {
  try {
    const patterns = gitIgnoreToGlob(path)
    const checkNotIgnore =
      warnOnNotIgnore === true
        ? (pattern) => {
            if (pattern.charAt(0) !== '!') {
              process.stderr.write(`Negated '.gitignore' pattern '${pattern}' will be ignored.`)
            }
          }
        : (pattern) => {
            if (pattern.charAt(0) !== '!') {
              throw new CommonError({
                // TODO: Use ConditionsNotMetError when implemented
                message : "'.gitignore' contains un-usable negative ignore pattern. These patterns are ignored.",
                hint    : "Rewrite the '.gitignore' patterns to factor out the negative patterns.",
              })
            }
          }
    patterns.some(checkNotIgnore)
    // we process these patters as ignore patterns, so we remove the '!', which flips the semantics
    const ignorePatterns = patterns.filter((p) => p.charAt(0) === '!').map((p) => p.slice(1))

    return ignorePatterns
  }
  catch (e) {
    if (e.code !== 'NOENT') {
      throw e
    }

    return []
  }
}

export { processGitignore }
