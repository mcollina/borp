# borp

Borp is a typescript-aware test runner for `node:test`.
It also support code coverage via [c8](http://npm.im/c8).

Borp is self-hosted, i.e. Borp runs its own tests.

## Install

```bash
npm i borp --save-dev
```

## Usage

```bash
borp --coverage

# with check coverage active
borp --coverage --check-coverage --lines 95

# with a node_modules located reporter
borp --reporter foo

# with a node_modules located reporter writing to stderr
borp --reporter foo:stderr

# with a local custom reporter
borp --reporter ./lib/some-reporter.mjs

# matching all test.js files except ones in nested node_modules directories
borp 'test/**/*.test.js' '!test/**/node_modules/**/*.test.js'
```

Borp will automatically run all tests files matching `*.test.{js|ts}`.

### Example project setup

```
.
├── src
│   ├── lib
│   │   └── math.ts
│   └── test
│       └── math.test.ts
└── tsconfig.json

```

As an example, consider having a `src/lib/math.ts` file  

```typescript
export function math (x: number, y: number): number {
  return x + y
}
```

and a `src/test/math.test.ts` file:

```typescript
import { test } from 'node:test'
import { math } from '../lib/math.js'
import { strictEqual } from 'node:assert'

test('math', () => {
  strictEqual(math(1, 2), 3)
})
```

and the following `tsconfig.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "outDir": "dist",
    "sourceMap": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "resolveJsonModule": true,
    "removeComments": true,
    "newLine": "lf",
    "noUnusedLocals": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "lib": [
      "ESNext"
    ],
    "incremental": true
  }
}
```

Note the use of `incremental: true`, which speed up compilation massively.

## Options

* `--concurrency` or `-c`, to set the number of concurrent tests. Defaults to the number of available CPUs minus one.
* `--coverage` or `-C`, enables code coverage
* `--only` or `-o`, only run `node:test` with the `only` option set  
* `--watch` or `-w`, re-run tests on changes
* `--timeout` or `-t`, timeouts the tests after a given time; default is 30000 ms
* `--no-timeout`, disables the timeout
* `--coverage-exclude` or `-X`, a list of comma-separated patterns to exclude from the coverage report. All tests files are ignored by default.
* `--ignore` or `-i`, ignore a glob pattern, and not look for tests there
* `--expose-gc`, exposes the gc() function to tests
* `--pattern` or `-p`, run tests matching the given glob pattern
* `--reporter` or `-r`, set up a reporter, use a colon to set a file destination. Reporter may either be a module name resolvable by standard `node_modules` resolution, or a path to a script relative to the process working directory (must be an ESM script). Default: `spec`.
* `--no-typescript` or `-T`, disable automatic TypeScript compilation if `tsconfig.json` is found.
* `--post-compile` or `-P`, the path to a file that will be executed after each typescript compilation.
* `--check-coverage`, enables c8 check coverage; default is false
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

A limited set of options may be specified via a configuration file. The
configuration file is expected to be in the process's working directory, and
named either `.borp.yaml` or `.borp.yml`; it may also be specified by
defining the environment variable `BORP_CONF_FILE` and setting it to the
full path to some yaml file.

The current supported options are:

+ `files` (string[]): An array of test files to include. Globs are supported.
  Note: any glob that starts with a `!` (bang character) will be treated as
  an ignore glob, e.g. `'!test/**/node_modules/**/*'` will ignore all files
  in nested `node_modules` directories that would otherwise be matched.
+ `reporters` (string[]): An array of reporters to use. May be relative path
strings, or module name strings.

### Example

```yaml
files:
  - 'test/one.test.js'
  - 'test/foo/*.test.js'

reporters:
  - './test/lib/my-reporter.js'
  - spec
  - '@reporters/silent'
```

## License

MIT
