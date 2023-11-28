#! /usr/bin/env node

import { parseArgs } from 'node:util'
import { tap, spec } from 'node:test/reporters'
import { mkdtemp, rm } from 'node:fs/promises'
import { finished } from 'node:stream/promises'
import { join, relative } from 'node:path'
import runWithTypeScript from './lib/run.js'
import { Report } from 'c8'

let reporter
/* c8 ignore next 4 */
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
    concurrency: { type: 'string', short: 'c' },
    coverage: { type: 'boolean', short: 'C' },
    'coverage-exclude': { type: 'string', short: 'X' }
  },
  allowPositionals: true
})

if (args.values.concurrency) {
  args.values.concurrency = parseInt(args.values.concurrency)
}

let covDir
if (args.values.coverage) {
  covDir = await mkdtemp(join(process.cwd(), 'coverage-'))
  process.env.NODE_V8_COVERAGE = covDir
}

const config = {
  ...args.values,
  files: args.positionals,
  pattern: args.values.pattern,
  cwd: process.cwd()
}

try {
  const stream = await runWithTypeScript(config)

  stream.compose(reporter).pipe(process.stdout)

  await finished(stream)

  if (covDir) {
    let exclude = (args.values['coverage-exclude'] || '').split(',').filter(Boolean)

    if (exclude.length === 0) {
      exclude = undefined
    } else if (config.prefix) {
      const localPrefix = relative(process.cwd(), config.prefix)
      exclude = exclude.map((file) => join(localPrefix, file))
    }
    const report = Report({
      reporter: ['text'],
      tempDirectory: covDir,
      exclude
    })

    await report.run()
  }
  /* c8 ignore next 3 */
} catch (err) {
  console.error(err)
} finally {
  if (covDir) {
    await rm(covDir, { recursive: true })
  }
}
