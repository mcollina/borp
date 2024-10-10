#! /usr/bin/env node

import { parseArgs } from 'node:util'
import Reporters from 'node:test/reporters'
import { findUp } from 'find-up'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { finished } from 'node:stream/promises'
import { join, relative, resolve } from 'node:path'
import posix from 'node:path/posix'
import runWithTypeScript from './lib/run.js'
import githubReporter from '@reporters/github'
import { Report } from 'c8'
import { checkCoverages } from 'c8/lib/commands/check-coverage.js'
import os from 'node:os'
import { execa } from 'execa'
import { pathToFileURL } from 'node:url'
import loadConfig from './lib/conf.js'

/* c8 ignore next 4 */
process.on('unhandledRejection', (err) => {
  console.error(err)
  process.exit(1)
})

const foundConfig = await loadConfig()
if (foundConfig.length > 0) {
  Array.prototype.push.apply(process.argv, foundConfig)
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
    'no-timeout': { type: 'boolean' },
    'coverage-exclude': { type: 'string', short: 'X', multiple: true },
    ignore: { type: 'string', short: 'i', multiple: true },
    'expose-gc': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    'no-typescript': { type: 'boolean', short: 'T' },
    'post-compile': { type: 'string', short: 'P' },
    reporter: {
      type: 'string',
      short: 'r',
      default: ['spec'],
      multiple: true
    },
    'check-coverage': { type: 'boolean' },
    lines: { type: 'string', default: '100' },
    branches: { type: 'string', default: '100' },
    functions: { type: 'string', default: '100' },
    statements: { type: 'string', default: '100' }
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

if (args.values['no-timeout']) {
  delete args.values.timeout
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
    let Ctor
    if (Object.hasOwn(reporters, name) === true) {
      Ctor = reporters[name]
    } else {
      try {
        // Try to load a custom reporter from a file relative to the process.
        let modPath = resolve(join(process.cwd(), name.replace(/^['"]/, '').replace(/['"]$/, '')))
        if (process.platform === 'win32') {
          // On Windows, absolute paths must be valid file:// URLs
          modPath = pathToFileURL(modPath).href
        }

        Ctor = await import(modPath).then((m) => m.default || m)
      } catch {
        // Fallback to trying to load the reporter from node_modules resolution.
        Ctor = await import(name).then((m) => m.default || m)
      }
    }
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
    const nycrc = await findUp(['.c8rc', '.c8rc.json', '.nycrc', '.nycrc.json'], { cwd: config.cwd })
    const report = Report({
      reporter: ['text'],
      tempDirectory: covDir,
      exclude,
      ...nycrc && JSON.parse(await readFile(nycrc, 'utf8'))
    })

    if (args.values['check-coverage']) {
      await checkCoverages({
        lines: parseInt(args.values.lines),
        functions: parseInt(args.values.functions),
        branches: parseInt(args.values.branches),
        statements: parseInt(args.values.statements),
        ...args
      }, report)
    }
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
