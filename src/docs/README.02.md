## Component based configuration

Fandl breaks up the configuration into 5 components:
- 'base' which applies to all Javascript src files,
- 'jsdoc' which defines JSDoc specific configuration and rules for all src files,
- 'jsx' which defines additional configuration and rules for JSX files,
- 'test' which defines additional configuration and rules for test files, and
- 'additional' which is just a catch all for whatever else you might want to add.

Rather than being forced to redefine the entire default configuration, you can override any one of the components individually by specifying `options.eslintConfigComponents`.

Note, the component structure is essentially a prototype at this point. Future versions will:
- Break up 'base' (which is very large) into different semantic types such "correctness", "complexity", and "style".
- Support arbitrary additional configuration components.
- Support turning off individual configuration components.

## Reformatting process overview

- The code is run through prettier first mainly because it does a much better job properly indenting code and fitting it within a target width (80 chars).[^1]
- The partially reformatted code is then reformatted by eslint because prettier (purposely) has very few options and we don't agree with all of them. Specifically, our out of the box configuration:
  - places operators at the beginning of the next line rather than the end of the previous line in multi-line expressions; e.g.:
  ```js
  const foo = bar // fandl style; generally accepted as easier to read
    && baz
  // vs
  const foo = bar && // prettier style
    baz
  ```
  - places `else if`/`else`/`catch`, etc. on a newline; e.g.:
  ```js
  const foo = bar // fandl style; generally accepted as easier to read
    && baz
  // vs
  const foo = bar && // prettier style
    baz
  ```
  - places `else if`/`else`/`catch`, etc. on a newline; e.g.:
  ```js
  if (a === 1) { // fandl style (Stroustrup); more consistent IMO
    ...
  }
  else { // and easier to scan the page
  ...
  }
  // vs
  if (a === 1) { // prettier default style ("one true brace style")
    ...
  } else { // IMO it's odd to have lexical overhead preceed the flow control keyword
  ...
  }
  ```
  - aligns the colons in object declarations; e.g.:
  ```js
  { // fandl style; easier to read, like a table
    foo           : 'hey',
    longFieldName : 'how are you?',
  }
  // vs
  { // prettier style
    foo : 'hey',
    longFieldName : 'how are you?',
  }
  ```
[^1]: I perhaps falsely remember eslint actually doing a better re indenting code, but in any case there are two issue with the latest eslint based reformatting. First, it miscounts the correct indention level where '('s were involved in boolean expressions. Second, eslint failed automatically break up long lines. (As of @stylistic/eslint-plugin: 2.6.4, eslint: 8.50.0; have since upgraded but not retested since it's working as is.)
