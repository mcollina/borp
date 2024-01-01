#! /usr/bin/env node

import { parseArgs } from 'node:util'
import { tap, spec } from 'node:test/reporters'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { finished } from 'node:stream/promises'
import { join, relative } from 'node:path'
import posix from 'node:path/posix'
import runWithTypeScript from './lib/run.js'
import { Report } from 'c8'
import os from 'node:os'

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
    concurrency: { type: 'string', short: 'c', default: os.availableParallelism() - 1 + '' },
    coverage: { type: 'boolean', short: 'C' },
    timeout: { type: 'string', short: 't', default: '30000' },
    'coverage-exclude': { type: 'string', short: 'X', multiple: true },
    ignore: { type: 'string', short: 'i', multiple: true },
    'expose-gc': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
})

/* c8 ignore next 4 */
if (args.values.help) {
  console.log(await readFile(new URL('./README.md', import.meta.url), 'utf8'))
  process.exit(0)
}

if (args.values.concurrency) {
  args.values.concurrency = parseInt(args.values.concurrency)
}

if (args.values.timeout) {
  args.values.timeout = parseInt(args.values.timeout)
}

let covDir
if (args.values.coverage) {
  covDir = await mkdtemp(join(os.tmpdir(), 'coverage-'))
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

  stream.on('test:fail', () => {
    process.exitCode = 1
  })

  stream.compose(reporter).pipe(process.stdout)

  await finished(stream)

  if (covDir) {
    let exclude = args.values['coverage-exclude']

    if (exclude && config.prefix) {
      const localPrefix = relative(process.cwd(), config.prefix)
      exclude = exclude.map((file) => posix.join(localPrefix, file))
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
    try {
      await rm(covDir, { recursive: true, maxRetries: 10, retryDelay: 100 })
      /* c8 ignore next 2 */
    } catch {}
  }
}
