import { test } from 'node:test'
import { tspl } from '@matteo.collina/tspl'
import runWithTypeScript from '../lib/run.js'
import { join } from 'desm'
import { execa } from 'execa'

test('ts-esm', async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 4 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
  })

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('ts-cjs', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 2 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-cjs')
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
  const { strictEqual, completed, match } = tspl(t, { plan: 3 })
  const config = {
    files: ['test/add.test.ts'],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
  })

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('pattern', async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 3 })
  const config = {
    files: [],
    pattern: 'test/*2.test.ts',
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add2'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
  })

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('no files', async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 4 })
  const config = {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
  })

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})

test('src-to-dist', async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 4 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'src-to-dist')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
  })

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})
test('monorepo', async (t) => {
  const { strictEqual, completed, match, deepEqual } = tspl(t, { plan: 5 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'monorepo/package2')
  }

  await execa('npm', ['install'], { cwd: join(import.meta.url, '..', 'fixtures', 'monorepo') })
  const stream = await runWithTypeScript(config)

  const names = new Set(['package2-add', 'package2-add2'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
    deepEqual(test.data.typescriptCliArgs, ['--build'])
  })

  stream.on('test:pass', (test) => {
    strictEqual(names.has(test.name), true)
    names.delete(test.name)
  })

  await completed
})
test('only-src', async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 4 })
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'only-src')
  }

  const stream = await runWithTypeScript(config)

  const names = new Set(['add', 'add2'])

  stream.once('data', (test) => {
    strictEqual(test.type, 'test:diagnostic')
    match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)
  })

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
