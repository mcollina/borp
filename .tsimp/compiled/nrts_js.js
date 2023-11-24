#! /usr/bin/env node

import { parseArgs } from 'node:util'
import { tap, spec } from 'node:test/reporters'
import { run } from 'node:test'
import path from 'node:path'
import { glob } from 'glob'

process.env.NODE_OPTIONS ||= '';
process.env.NODE_OPTIONS += '--import=tsimp/import';

let reporter
if (process.stdout.isTTY) {
  reporter = spec()
} else {
  reporter = tap
}

const files = await glob('**/*.[jt]s', { ignore: 'node_modules/**' })

run({ files })
  .compose(reporter)
  .pipe(process.stdout);
