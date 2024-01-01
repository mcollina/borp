import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { rejects } from 'node:assert'

const borp = join(import.meta.url, '..', 'borp.js')

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
