import { ESLint } from 'eslint'
import { ArgumentInvalidError } from 'standard-error-set'

import { getEslintConfig } from '../default-config/eslint-config'

const getEslint = ({ check, eslintConfig, eslintConfigComponents }) => {
  if (eslintConfig !== undefined && eslintConfigComponents !== undefined) {
    throw new ArgumentInvalidError({
      message : "You cannot define 'eslintConfig' and 'eslintConfigComponents' simultaneously.",
    })
  }

  if (eslintConfig === undefined) {
    eslintConfig = getEslintConfig(eslintConfigComponents)
  }

  return new ESLint({
    fix                : check === false,
    // this keeps eslint from insisting on an eslint config file
    overrideConfigFile : true,
    overrideConfig     : eslintConfig,
    // This isn't necessary right now, but logically, it makes more sense. The difference is whether eslint looks for
    // config files relative to the base path (see below) or the file itself. In future, if/when we support config
    // override/augmentation, it makes sense to do it relative to the file, I think.
    // flags: ['unstable_config_lookup_from_file'],
    // By default, eslint sets the 'base path' to the CWD of the process and if the linted file isn't under the 'base
    // path', it is ignored. However, we expect either absolute file paths (from 'formatAndLint') or create absolute
    // file paths ourselves (from fandl CLI), so we set 'cwd' to '/' so no files are reject on that basis.
    cwd                : '/',
  })
}

export { getEslint }
