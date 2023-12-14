# borp

Borp is a typescript-aware runner for tests written using `node:test`.
It also support code coverage via [c8](http://npm.im/c8).

Borp is self-hosted, i.e. Borp runs its own tests.

## Install

```bash
npm i borp --save-dev
```

## Usage

```bash
borp --coverage
```

Borp will autumatically run all tests files matching `*.test.{js|ts}`.

### Example project setup

As an example, consider having a `src/add.ts` file  

```typescript
export function add (x: number, y: number): number {
  return x + y
}
```

and a `test/add.test.ts` file:

```typescript
import { test } from 'node:test'
import { add } from '../src/add.js'
import { strictEqual } from 'node:assert'

test('add', () => {
  strictEqual(add(1, 2), 3)
})
```

and the following `tsconfig`:

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

* `--coverage` or `-C`, enables code coverage
* `--only` or `-o`, only run `node:test` with the `only` option set  
* `--watch` or `-w`, re-run tests on changes
* `--timeout` or `-t`, timeouts the tests after a given time; default is 30000 ms
* `--coverage-exclude` or `-X`, a list of comma-separated patterns to exclude from the coverage report. All tests files are ignored by default.

## License

MIT
