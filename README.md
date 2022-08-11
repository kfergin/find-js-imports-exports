# 🌲 find-js-imports-exports

Find JS Imports/Exports using Abstract Syntax Trees

One day I finally "got" ASTs and thought, "Huh, I could track down particular
imports using these..."

Note: there are plenty of handrolled features here, some due to lack of
experience with node scripts, some because I wanted to implement it myself, and
some because perfect is the enemy of good enough. So when you're thinking, "Why
didn't he just do \_\_\_?" ...well, there's your answer ☝️.

- argument parsing instead of using a standard library
- regular expressions instead of globs
- and more...

## Leveraged Libraries

- `@babel/*` - transforms code, handling react and flow
- `eslint-scope` - analyzes scope
- `espree` - creates ASTs
- `estraverse` - traverses the ASTs
- `resolve-from` - like `require.resolve` but from the current working directory

## Usage

This repo isn't on npm so there are some setup steps. This is what I do:

1. Clone the repo and `cd` into it
2. Install node modules: `yarn`
3. Make module globally available: `yarn link`

You can then import this module in another, run `yarn link find-js-imports-exports`
in that module.

### Prepackaged Scripts

There are some scripts that come with this package, indended to handle common
use cases of the main exports. For example, `./executables/find-imports.js`. To
wire them up, you need to update the `bin` field in `package.json` and then run
`yarn link` to make the command globally available. If you've already run `yarn link`, first `yarn unlink`, thne `yarn link` again.

```json
  "bin": {
    "<your-name-for-this-script>": "./executables/find-imports.js"
  },
```

Make sure the path to global packages is in your PATH (you can see where
they're located by running `yarn global bin`).

The scripts are fairly self-explanatory and their help documentation (`-h`) is
the best resource.

```
$ find-imports-script -h

    find-imports-script [import-name] [import-path] [flags]

    import-name
      - default import: 'default'
      - namespace import: '*'
      - named import: '<name-of-import>'

    import-path
      Can be absolute or relative

    Options:
      --path-regex-ignores, -i
        Ignores a directory or file if one of the provided regex patterns
        matches the path. Should be in the regex-literal form and
        space-delimited. The regex body and flags will be passed to the RegExp
        constructor.
        e.g. `find-imports-script someVar './some-file' -i /.test.js$/i /.*flow.*/`

      --help, -h
        Print out help documentation.

$ find-exports-script -h

  TODO
```

## Config file

You can use a config file for some arguments that you always want applied. Add
a file named, `find-js-imports-exports.config.js`, in the root directory of the
repo. It should export an object:

```javascript
module.exports = {
  pathRegexIgnores: [...],
};
```

## Module Exports

### config

Returns the exported object from the config file or the defaults, if it doesn't
exist.

```typescript
let config: {
  pathRegexIgnores: RegExp[];
};
```

### fileSystemForEach

Recursively iterates through a file system, calling a callback function for
each file.

```typescript
function fileSystemForEach(
  givenPath: string,
  forEachFile: (givenPath: string, stop: () => void) => void | Promise<void>,
  options?: {
    pathRegexIgnores?: RegExp[];
  }
): Promise<boolean>;
```

### findFileExports()

```typescript
function findFileExports(filePath: string): Promise<
  {
    isReExport: boolean;
    lineNumber: number;
    name: string;
    numReferencesInSource: number | null;
    source: string;
  }[]
>;
```

### findFileImports()

```typescript
function findFileImports(filePath: string): Promise<
  {
    destination: string;
    lineNumber: number;
    name: '*import' | '*import()' | '*require' | 'default' | string;
    source: string;
  }[]
>;
```

### stderrWritePath()

A helper function that writes a single line (like a file path) to `stderr` and
then returns a function that when called, clears the line.

```typescript
function stderrWritePath(path: string): () => void;
```
