#! /usr/bin/env node

import { parseArgs } from 'node:util'
import { tap, spec } from 'node:test/reporters'
import { run } from 'node:test'
import { glob } from 'glob'
import { findUp } from 'find-up'
import { createRequire } from 'node:module'
import { resolve, join, dirname } from 'node:path'
import { access, readFile } from 'node:fs/promises'
import { execa } from 'execa'

async function isFileAccessible (filename, directory) {
  try {
    const filePath = directory ? resolve(directory, filename) : filename
    await access(filePath)
    return true
  } catch (err) {
    return false
  }
}

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
  args.values.concurrency = parseInt(args.values.concurrency)
}

const tsconfigPath = await findUp('tsconfig.json')

let prefix = ''

if (tsconfigPath) {
  try {
    const _require = createRequire(process.cwd())
    const typescriptPathCWD = _require.resolve('typescript')
    const tscPath = join(typescriptPathCWD, '..', '..', 'bin', 'tsc')
    if (tscPath) {
      const isAccessible = await isFileAccessible(tscPath)
      if (isAccessible) {
        await execa(tscPath, { cwd: dirname(tsconfigPath), stdio: 'inherit' })
      }
    }
    const tsconfig = JSON.parse(await readFile(tsconfigPath))
    const outDir = tsconfig.compilerOptions.outDir
    if (outDir) {
      prefix = join(dirname(tsconfigPath), outDir)
    }
  } catch (err) {
    console.log(err)
  }
}

let files
if (args.positionals.length > 0) {
  if (prefix) {
    files = args.positionals.map((file) => join(prefix, file.replace(/ts$/, 'js')))
  } else {
    files = args.positionals
  }
} else if (args.values.pattern) {
  if (prefix) {
    args.values.pattern = join(prefix, args.values.pattern)
  }
  files = await glob(args.values.pattern, { ignore: 'node_modules/**' })
} else {
  if (prefix) {
    files = await glob(join(prefix, 'test/**/*.test.{cjs,mjs,js}'), { ignore: 'node_modules/**' })
  } else {
    files = await glob('test/**/*.test.{cjs,mjs,js}', { ignore: 'node_modules/**' })
  }
}

const config = {
  ...args.values,
  files
}

run(config)
  .compose(reporter)
  .pipe(process.stdout)
