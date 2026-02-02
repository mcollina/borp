import { test } from 'node:test'
import { tspl } from '@matteo.collina/tspl'
import runWithTypeScript from '../lib/run.js'
import { join } from 'desm'

test('ts-esm', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 2 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('ts-esm with named files', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 1 })
  const config = {
    files: ['test/add.test.ts'],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('pattern', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 1 })
  const config = {
    files: [],
    pattern: 'test/*2.test.ts',
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('no files', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 2 })
  const config = {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('ts-esm2', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 2 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm2')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('js-esm', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 2 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'js-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  stream.resume()

  await completed
})
