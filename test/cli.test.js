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
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm2')
  await rm(path.join(cwd, 'dist'), { recursive: true, force: true })
  const { stdout } = await execa('node', [
    borp,
    '--reporter=spec',
    '--reporter=@reporters/silent',
    '--no-typescript'
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('tests 0') >= 0, true)
})
