import { test, run } from 'node:test'
import { strictEqual } from 'node:assert'
import { glob } from 'glob'
import { join } from 'node:path'

// node:test's run() refuses to spawn files when NODE_TEST_CONTEXT is set
// (https://github.com/nodejs/node/commit/d5c9adf3df). We're inside such a
// child here, so unset it just for the call. Doing it at module scope would
// also fool lazyBootstrapRoot into installing a spec reporter on stdout,
// corrupting the v8-serialized stream our parent (borp) is reading.
function runIsolated (opts) {
  const saved = process.env.NODE_TEST_CONTEXT
  delete process.env.NODE_TEST_CONTEXT
  try {
    return run(opts)
  } finally {
    if (saved !== undefined) process.env.NODE_TEST_CONTEXT = saved
  }
}

async function consumeStream (stream) {
  // eslint-disable-next-line no-unused-vars
  for await (const _ of stream) {
    // Stream must be consumed for tests to complete properly
  }
}

test('ts-esm', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const files = await glob('**/*.test.ts', { cwd, absolute: true })

  const stream = runIsolated({ files, cwd })

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

  const stream = runIsolated({ files, cwd })

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

  const stream = runIsolated({ files, cwd })

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

  const stream = runIsolated({ files, cwd })

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

  const stream = runIsolated({ files, cwd })

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

  const stream = runIsolated({ files, cwd })

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await consumeStream(stream)
})
