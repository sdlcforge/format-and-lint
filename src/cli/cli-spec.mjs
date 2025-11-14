const lintArgs = [
  {
    name     : 'files',
    multiple : true,
    description :
      "A file patterns selecting target files to process. If neither this nor '--files-paths' is specified, then standard, predefined patterns will be used.",
  },
  {
    name     : 'files-paths',
    multiple : true,
    description :
      "A path to a file containing newline separated file patterns selecting files to process. If neither this nor '--files' is specified, then standard, predefined patterns will be used.",
  },
  {
    name        : 'ignore-files',
    multiple    : true,
    description : 'A file pattern selecting files to ignore.',
  },
  {
    name        : 'ignore-files-paths',
    multiple    : true,
    description : 'A path to a file containing a list of newline separated file patterns selecting files to ignore.',
  },
  {
    name        : 'eslint-config-path',
    description : 'Specifies the path to a eslint configuration file to replace the default base eslint configuration.',
  },
  {
    name : 'eslint-config-components-path',
    description :
      "Specifies the path to a configuration file that resolves to an object keyed to 'base', 'jsx', 'node', and 'test' configuration components.",
  },
  {
    name        : 'ignore-package-settings',
    type        : Boolean,
    description : "Suppresses merging settings from 'package.json:devPkg.linting'.",
  },
  {
    name        : 'no-standard-ignores',
    type        : Boolean,
    description : "Suppresses default .gitignore and '**/test/data/**/*' ignore patterns.",
  },
  {
    name        : 'root',
    description : 'The directory from which to start looking for files.',
  },
]

const cliSpec = {
  mainCommand : 'fandl',
  description : 'Optimized, single command out of the box JavaScript format and lint tool.',
  arguments   : [
    {
      name          : 'command',
      defaultOption : true,
      default       : 'format-and-lint',
      description   : 'The action to perform.',
    },
    ...lintArgs,
  ],
  commands : [
    {
      name        : 'format-and-lint',
      description : 'Formats and runs lint checks on the target files.',
      arguments   : [
        ...lintArgs,
        {
          name  : 'output-dir',
          alias : 'o',
          description :
            "The directory to output the formatted files. This suppresses the default behavior of updating files in place. Output files will be placed relative to the source file and the effective source stem. See '--relative-stem' for details. If for whatever reason there is a name collision, the process will exit in error.",
        },
        {
          name : 'prettier-config-path',
          description :
            'Specifies the path to a prettier configuration file to replace the default configuration as the base prettier configuration.',
        },
        {
          name : 'relative-stem',
          description :
            "The relative stem determines the relative placement of output files when sending output to '--output-dir' (as opposed to the default 'update in place' behavior). E.g., Given input '/usr/foo/project/src/bar/baz.mjs', '--output-dir /tmp/foo', and '--relative-stem /usr/foo/project/src/', the output file will be written to '/tmp/foo/bar/baz.mjs'. By default, the relative stem is the working directory of the process, which can be changed/set manually with this option. If any resolved input file path does not start with the effective effective source stem, the process will exit with an error.",
        },
      ],
    },
    {
      name        : 'lint',
      descirption : 'Runs lint checks on the target files.',
      arguments   : lintArgs,
    },
    /* { name: 'show-eslint-config', description: 'Prints the effective eslint configuration to stdout.', arguments: globalArguments },
    { name: 'show-prettier-config', description: 'Prints the effective prettier configuration to stdout.', arguments: globalArguments }, */
    {
      name        : 'help',
      description : 'Prints the command help.',
      arguments   : [
        {
          name          : 'command',
          defaultOption : true,
          description   : 'Optional command specific help.',
        },
      ],
    },
    { name : 'version', description : 'Prints the tool version.' },
  ],
}

export { cliSpec }
