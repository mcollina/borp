import { test } from 'node:test'
import { strictEqual } from 'node:assert'
import { run } from 'node:test'
import { glob } from 'glob'
import { join } from 'node:path'

async function consumeStream (stream) {
  // eslint-disable-next-line no-unused-vars
  for await (const _ of stream) {
    // Stream must be consumed for tests to complete properly
  }
}

test('ts-esm', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const files = await glob('**/*.test.ts', { cwd, absolute: true })

  const stream = run({ files, cwd })

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})

test('ts-esm with named files', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const files = [join(cwd, 'test/add.test.ts')]

  const stream = run({ files, cwd })

  const names = new Set(['add'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})

test('pattern', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const files = await glob('test/*2.test.ts', { cwd, absolute: true })

  const stream = run({ files, cwd })

  const names = new Set(['add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})

test('no files', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const files = await glob('**/*.test.ts', { cwd, absolute: true })

  const stream = run({ files, cwd })

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})

test('ts-esm2', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm2')
  const files = await glob('**/*.test.ts', { cwd, absolute: true })

  const stream = run({ files, cwd })

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})

test('js-esm', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  const files = await glob('**/*.test.js', { cwd, absolute: true })

  const stream = run({ files, cwd })

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})
