# borp

Borp is a TypeScript-aware test runner for `node:test` with built-in code coverage support via [c8](https://npm.im/c8).

Borp uses Node.js native [type stripping](https://nodejs.org/api/typescript.html) to run TypeScript files directly without compilation. No build step required!

Borp is self-hosted, i.e. Borp runs its own tests.

## Requirements

- Node.js >= 22.6.0 (22.19.0+ or 24.x+ recommended for best TypeScript support)

## Install

```bash
npm i borp --save-dev
```

## Usage

```bash
# Run all tests
borp

# With code coverage
borp --coverage

# With coverage threshold checking
borp --coverage --check-coverage --lines 95

# With a node_modules located reporter
borp --reporter foo

# With a node_modules located reporter writing to stderr
borp --reporter foo:stderr

# With a local custom reporter
borp --reporter ./lib/some-reporter.mjs

# Matching all test.js files except ones in nested node_modules directories
borp 'test/**/*.test.js' '!test/**/node_modules/**/*.test.js'
```

Borp will automatically run all test files matching `*.test.{js|ts|mts|cts}`.

## TypeScript Support

Borp uses Node.js native type stripping to run TypeScript files directly. No compilation step is required!

### Example project setup

```
.
├── src
│   ├── lib
│   │   └── math.ts
│   └── test
│       └── math.test.ts
└── package.json
```

As an example, consider having a `src/lib/math.ts` file:

```typescript
export function math (x: number, y: number): number {
  return x + y
}
```

and a `src/test/math.test.ts` file:

```typescript
import { test } from 'node:test'
import { math } from '../lib/math.ts'
import { strictEqual } from 'node:assert'

test('math', () => {
  strictEqual(math(1, 2), 3)
})
```

Note: Use `.ts` extensions in your imports, not `.js`!

### TypeScript Constraints

Type stripping has some limitations compared to full TypeScript compilation. Your code must follow these rules:

- **Use type-only imports**: Use `import type { Foo }` or `import { type Foo }` for type imports
- **No enums**: Use const objects with `as const` instead
- **No namespaces**: Use regular modules instead
- **No parameter properties**: Explicitly declare class properties in the constructor body
- **File extensions**: Import `.ts` files with `.ts` extension

See the [Node.js TypeScript documentation](https://nodejs.org/api/typescript.html) for full details.

### Optional tsconfig.json

A `tsconfig.json` is not required for borp to work, but you can include one for IDE support and type checking:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

Key options:
- `noEmit: true` - No compilation output needed
- `allowImportingTsExtensions: true` - Allow `.ts` imports
- `verbatimModuleSyntax: true` - Enforce type-only imports

## Options

* `--concurrency` or `-c`, to set the number of concurrent tests. Defaults to the number of available CPUs minus one.
* `--coverage` or `-C`, enables code coverage
* `--only` or `-o`, only run `node:test` with the `only` option set
* `--watch` or `-w`, re-run tests on file changes using Node.js native watch mode
* `--timeout` or `-t`, timeouts the tests after a given time; default is 30000 ms
* `--no-timeout`, disables the timeout
* `--coverage-exclude` or `-X`, a list of comma-separated patterns to exclude from the coverage report. All tests files are ignored by default.
* `--ignore` or `-i`, ignore a glob pattern, and not look for tests there
* `--expose-gc`, exposes the gc() function to tests
* `--pattern` or `-p`, run tests matching the given glob pattern
* `--reporter` or `-r`, set up a reporter, use a colon to set a file destination. Reporter may either be a module name resolvable by standard `node_modules` resolution, or a path to a script relative to the process working directory (must be an ESM script). Default: `spec`.
* `--check-coverage`, enables c8 check coverage; default is false
* `--coverage-html`, generates c8 html report; default is false

### Check coverage options

* `--lines`, set the lines threshold when check coverage is active; default is 100
* `--functions`, set the functions threshold when check coverage is active; default is 100
* `--statements`, set the statements threshold when check coverage is active; default is 100
* `--branches`, set the branches threshold when check coverage is active; default is 100

## Reporters

Here are the available reporters:

* `gh`: emits `::error` workflow commands for GitHub Actions to show inlined errors. Enabled by default when running on GHA.
* `tap`: outputs the test results in the TAP format.
* `spec`: outputs the test results in a human-readable format.
* `dot`: outputs the test results in a compact format, where each passing test is represented by a ., and each failing test is represented by a X.
* `junit`: outputs test results in a jUnit XML format

## Config File Support

A limited set of options may be specified via a configuration file. The configuration file is expected to be in the process's working directory, and named either `.borp.yaml` or `.borp.yml`; it may also be specified by defining the environment variable `BORP_CONF_FILE` and setting it to the full path to some yaml file.

The current supported options are:

+ `coverage` (object): A hash of options relating to test coverage. By defining this configuration object, coverage reporting will be enabled.
  - `check-coverage` (boolean): Set to `true` to enable coverage checking. Omit to disable coverage checking.
  - `coverage-html` (boolean): Set to `true` to generate an HTML coverage report.
  - `branches` (number): Define the percentage of acceptable coverage for branches. Default: 100.
  - `functions` (number): Define the percentage of acceptable coverage for functions. Default: 100.
  - `lines` (number): Define the percentage of acceptable coverage for lines. Default: 100.
  - `statements` (number): Define the percentage of acceptable coverage for statements. Default: 100.
+ `files` (string[]): An array of test files to include. Globs are supported. Note: any glob that starts with a `!` (bang character) will be treated as an ignore glob, e.g. `'!test/**/node_modules/**/*'` will ignore all files in nested `node_modules` directories that would otherwise be matched.
+ `reporters` (string[]): An array of reporters to use. May be relative path strings, or module name strings.

### Example

```yaml
coverage:
  check-coverage: true
  branches: 99
  functions: 98
  lines: 97
  statements: 96

files:
  - 'test/one.test.js'
  - 'test/foo/*.test.js'

reporters:
  - './test/lib/my-reporter.js'
  - spec
  - '@reporters/silent'
```

## Migration from borp < 1.0

If you're upgrading from an older version of borp, here are the key changes:

1. **No compilation step**: Tests run directly from source files
2. **Import extensions**: Change `.js` to `.ts` in your TypeScript imports
3. **No outDir**: Remove `outDir` from tsconfig or set to your source directory
4. **Removed options**: `--no-typescript` and `--post-compile` are removed
5. **Type constraints**: See TypeScript Constraints section above

## License

MIT
