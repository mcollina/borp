import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { rejects, strictEqual } from 'node:assert'
import { rm } from 'node:fs/promises'
import path from 'node:path'

const borp = join(import.meta.url, '..', 'borp.js')

delete process.env.GITHUB_ACTION

test('limit concurrency', async () => {
  await execa('node', [
    borp,
    '--concurrency',
    '1'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  })
})

test('failing test set correct status code', async () => {
  // execa rejects if status code is not 0
  await rejects(execa('node', [
    borp
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'fails')
  }))
})

test('--expose-gc flag enables garbage collection in tests', async () => {
  await execa('node', [
    borp,
    '--expose-gc'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'gc')
  })
})

test('failing test with --expose-gc flag sets correct status code', async () => {
  // execa rejects if status code is not 0
  await rejects(execa('node', [
    borp,
    '--expose-gc'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'fails')
  }))
})

test('disable ts and run no tests', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm2')
  await rm(path.join(cwd, 'dist'), { recursive: true, force: true })
  const { stdout } = await execa('node', [
    borp,
    '--reporter=spec',
    '--no-typescript'
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('tests 0') >= 0, true)
})

test('reporter from node_modules', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const { stdout } = await execa('node', [
    borp,
    '--reporter=spec',
    '--reporter=@reporters/silent'
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('tests 2') >= 0, true)
})

test('reporter from relative path', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'relative-reporter')
  const { stdout } = await execa('node', [
    borp,
    '--reporter=./fixtures/relative-reporter/reporter.js'
  ], {
    cwd
  })

  strictEqual(/passed:.+add\.test\.js/.test(stdout), true)
  strictEqual(/passed:.+add2\.test\.js/.test(stdout), true)
})

test('gh reporter', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  const { stdout } = await execa('node', [
    borp,
    '--reporter=gh'
  ], {
    cwd,
    env: {
      GITHUB_ACTIONS: '1'
    }
  })

  strictEqual(stdout.indexOf('::notice') >= 0, true)
})

test('interprets globs for files', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'files-glob')
  const { stdout } = await execa('node', [
    borp,
    '\'test1/*.test.js\'',
    '\'test2/**/*.test.js\''
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('✔ add') >= 0, true)
  strictEqual(stdout.indexOf('✔ add2') >= 0, true)
  strictEqual(stdout.indexOf('✔ a thing'), -1)
})

test('interprets globs for files with an ignore rule', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'files-glob')
  const { stdout } = await execa('node', [
    borp,
    '\'**/*.test.js\'',
    '\'!test1/**/node_modules/**/*\''
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('✔ add') >= 0, true)
  strictEqual(stdout.indexOf('✔ add2') >= 0, true)
  strictEqual(stdout.indexOf('✔ a thing'), -1)
})

test('Post compile script should be executed when --post-compile  is sent with esm', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm-post-compile')
  const { stdout } = await execa('node', [
    borp,
    '--post-compile=postCompile.ts'
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('Post compile hook complete') >= 0, true, 'Post compile message should be found in stdout')
})

test('Post compile script should be executed when --post-compile  is sent with cjs', async () => {
  const { stdout } = await execa('node', [
    borp,
    '--post-compile=postCompile.ts'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-cjs-post-compile')
  })

  strictEqual(stdout.indexOf('Post compile hook complete') >= 0, true, 'Post compile message should be found in stdout')
})
