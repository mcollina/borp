#! /usr/bin/env node

import { parseArgs } from 'node:util'
import Reporters from 'node:test/reporters'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { finished } from 'node:stream/promises'
import { join, relative } from 'node:path'
import posix from 'node:path/posix'
import runWithTypeScript from './lib/run.js'
import githubReporter from '@reporters/github'
import { Report } from 'c8'
import os from 'node:os'
import { execa } from 'execa'

/* c8 ignore next 4 */
process.on('unhandledRejection', (err) => {
  console.error(err)
  process.exit(1)
})

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
    help: { type: 'boolean', short: 'h' },
    'no-typescript': { type: 'boolean', short: 'T' },
    reporter: {
      type: 'string',
      short: 'r',
      default: ['spec'],
      multiple: true
    }
  },
  allowPositionals: true
})

/* c8 ignore next 5 */
if (args.values.help) {
  console.log(await readFile(new URL('./README.md', import.meta.url), 'utf8'))
  process.exit(0)
}

if (args.values['expose-gc'] && typeof global.gc !== 'function') {
  try {
    await execa('node', ['--expose-gc', ...process.argv.slice(1)], {
      stdio: 'inherit',
      env: {
        ...process.env
      }
    })
    process.exit(0)
  } catch (error) {
    process.exit(1)
  }
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
  typescript: !args.values['no-typescript'],
  files: args.positionals,
  pattern: args.values.pattern,
  cwd: process.cwd()
}

try {
  const pipes = []

  const reporters = {
    ...Reporters,
    gh: githubReporter
  }

  // If we're running in a GitHub action, adds the gh reporter
  // by default so that we can report failures to GitHub
  if (process.env.GITHUB_ACTION) {
    args.values.reporter.push('gh')
  }

  for (const input of args.values.reporter) {
    const [name, dest] = input.split(':')
    const Ctor = reporters[name] || await import(name).then((m) => m.default || m)
    const reporter = Ctor.prototype && Object.getOwnPropertyDescriptor(Ctor.prototype, 'constructor') ? new Ctor() : Ctor
    let output = process.stdout
    if (dest) {
      output = createWriteStream(dest)
    }
    pipes.push([reporter, output])
  }

  const stream = await runWithTypeScript(config)

  stream.on('test:fail', () => {
    process.exitCode = 1
  })

  for (const [reporter, output] of pipes) {
    stream.compose(reporter).pipe(output)
  }

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
  process.exitCode = 1
} finally {
  if (covDir) {
    try {
      await rm(covDir, { recursive: true, maxRetries: 10, retryDelay: 100 })
      /* c8 ignore next 2 */
    } catch {}
  }
}
