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

function showHelp () {
  console.log(`Usage: borp [options] [files...]

Options:
  -h, --help                  Show this help message
  -o, --only                  Only run tests with the 'only' option set
  -w, --watch                 Re-run tests on changes
  -p, --pattern <pattern>     Run tests matching the given glob pattern
  -c, --concurrency <num>     Set number of concurrent tests (default: ${os.availableParallelism() - 1 || 1})
  -C, --coverage              Enable code coverage
  -t, --timeout <ms>          Set test timeout in milliseconds (default: 30000)
      --no-timeout            Disable test timeout
  -X, --coverage-exclude      Exclude patterns from coverage (can be used multiple times)
  -i, --ignore <pattern>      Ignore glob pattern (can be used multiple times)
      --expose-gc             Expose the gc() function to tests
  -T, --no-typescript         Disable automatic TypeScript compilation
  -P, --post-compile <file>   Execute file after TypeScript compilation
  -r, --reporter <name>       Set reporter (can be used multiple times, default: spec)
      --check-coverage        Enable coverage threshold checking
      --lines <threshold>     Set lines coverage threshold (default: 100)
      --branches <threshold>  Set branches coverage threshold (default: 100)
      --functions <threshold> Set functions coverage threshold (default: 100)
      --statements <threshold> Set statements coverage threshold (default: 100)

Examples:
  borp                               # Run all tests
  borp --coverage                    # Run tests with coverage
  borp --watch                       # Run tests in watch mode
  borp test/specific.test.js         # Run specific test file
  borp --reporter tap --reporter gh  # Use multiple reporters`)
}

const foundConfig = await loadConfig()
if (foundConfig.length > 0) {
  Array.prototype.push.apply(process.argv, foundConfig)
}

const optionsConfig = {
  only: { type: 'boolean', short: 'o' },
  watch: { type: 'boolean', short: 'w' },
  pattern: { type: 'string', short: 'p' },
  concurrency: { type: 'string', short: 'c', default: (os.availableParallelism() - 1 || 1) + '' },
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
}

let args
try {
  args = parseArgs({
    args: process.argv.slice(2),
    options: optionsConfig,
    allowPositionals: true
  })
} catch (error) {
  if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
    console.error(`Error: ${error.message}\n`)
    // Send help to stderr when showing error
    const originalConsoleLog = console.log
    console.log = console.error
    showHelp()
    console.log = originalConsoleLog
    process.exit(1)
  }
  throw error
}

/* c8 ignore next 4 */
if (args.values.help) {
  showHelp()
  process.exit(0)
}

/* c8 ignore next 20 */
if (args.values['expose-gc'] && typeof global.gc !== 'function') {
  const args = [...process.argv.slice(1)]
  const nodeVersion = process.version.split('.').map((v) => parseInt(v.replace('v', '')))[0]
  if (nodeVersion >= 24) {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + ' ' : '') + '--expose-gc'
  } else {
    args.unshift('--expose-gc')
  }

  try {
    await execa('node', args, {
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
