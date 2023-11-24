#! /usr/bin/env node

import { parseArgs } from 'node:util'
import { tap, spec } from 'node:test/reporters'
import { run } from 'node:test'
import { glob } from 'glob'

const tsimpImport = import.meta.resolve('tsimp/import')

process.env.NODE_OPTIONS ||= ''
process.env.NODE_OPTIONS += `--import=${tsimpImport}`

let reporter
if (process.stdout.isTTY) {
  reporter = spec()
} else {
  reporter = tap
}

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    only: { type: 'boolean', short: 'o' },
    watch: { type: 'boolean', short: 'w' },
    pattern: { type: 'string', short: 'p' },
    concurrency: { type: 'string', short: 'c' }
  },
  allowPositionals: true
})

if (args.values.concurrency) {
  args.values.concurrency = parseInt(args.concurrency)
}

let files
if (args.positionals.length > 0) {
  files = args.positionals
} else if (args.values.pattern) {
  files = await glob(args.values.pattern, { ignore: 'node_modules/**' })
} else {
  files = await glob('test/**/*.test.[jt]s', { ignore: 'node_modules/**' })
}

const config = {
  ...args.values,
  files
}

run(config)
  .compose(reporter)
  .pipe(process.stdout)
