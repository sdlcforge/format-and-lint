/**
 * @file The shared '@stylistic/indent' options object.
 */

// Hoisted out of the '@stylistic/indent' rule entry so the TypeScript component ('ts.mjs') can
// extend this exact object rather than restate it; the two would otherwise drift apart whenever
// these options change. Export and consume this single object; never duplicate or clone it.
const baseIndentOptions = {
  ArrayExpression        : 1,
  CallExpression         : { arguments : 1 },
  flatTernaryExpressions : false,
  FunctionDeclaration    : { body : 1, parameters : 1 },
  FunctionExpression     : { body : 1, parameters : 1 },
  ignoreComments         : false,
  ignoredNodes           : [
    'TSUnionType',
    'TSIntersectionType',
    'TSTypeParameterInstantiation',
    'FunctionExpression > .params[decorators.length > 0]',
    'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
  ],
  ImportDeclaration        : 1,
  MemberExpression         : 1,
  ObjectExpression         : 1,
  offsetTernaryExpressions : true,
  outerIIFEBody            : 1,
  SwitchCase               : 1,
  VariableDeclarator       : 4,
}

export { baseIndentOptions }
