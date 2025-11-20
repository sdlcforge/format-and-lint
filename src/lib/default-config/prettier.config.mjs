const prettierConfig = {
  arrowParens    : 'always',
  bracketSpacing : true,
  printWidth     : 120,
  semi           : false,
  singleQuote    : true,
  trailingComma  : 'es5',

  // prettier-plugin-sort-imports configuration
  /*
  sortingMethod: 'alphabetical',
  sortingOrder: 'ascending',
  importTypeOrder: ['NPMPackages', 'localImports'],
  newlineBetweenTypes: true,
  plugins: ['./node_modules/prettier-plugin-sort-imports/dist/index.js'],*/

  // @trivago/prettier-plugin-sort-imports configuration
  importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
}

export { prettierConfig }
