#! /usr/bin/env node

import { parseArgs } from 'node:util'
import { tap, spec } from 'node:test/reporters'
import runWithTypeScript from './lib/run.js'

let reporter
if (process.stdout.isTTY) {
  /* eslint new-cap: "off" */
  reporter = new spec()
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
  args.values.concurrency = parseInt(args.values.concurrency)
}

const config = {
  ...args.values,
  files: args.positionals,
  pattern: args.values.pattern,
  cwd: process.cwd()
}

;(await runWithTypeScript(config))
  .compose(reporter)
  .pipe(process.stdout)
