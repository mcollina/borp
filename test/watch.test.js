import { test } from 'node:test'
import { tspl } from '@matteo.collina/tspl'
import runWithTypeScript from '../lib/run.js'
import { join } from 'desm'
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { once } from 'node:events'
import semver from 'semver'

// These tests are currently broken on some node versions
const skip = process.platform === 'darwin' && semver.satisfies(process.version, '>=20.16.0 <22.10.0')

test('watch', { skip }, async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 3 })

  const dir = path.resolve(await mkdtemp('.test-watch'))
  await cp(join(import.meta.url, '..', 'fixtures', 'ts-esm'), dir, {
    recursive: true
  })

  const controller = new AbortController()
  t.after(async () => {
    controller.abort()
    try {
      await rm(dir, { recursive: true, retryDelay: 100, maxRetries: 10 })
    } catch {}
  })

  const config = {
    files: [],
    signal: controller.signal,
    cwd: dir,
    watch: true
  }

  process._rawDebug('dir', dir)
  const stream = await runWithTypeScript(config)

  const fn = (test) => {
    if (test.type === 'test:fail') {
      console.log('test', test)
      match(test.data.name, /add/)
      stream.removeListener('data', fn)
    }
  }
  stream.on('data', fn)

  const [test] = await once(stream, 'data')
  strictEqual(test.type, 'test:diagnostic')
  match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)

  const toWrite = `
import { test } from 'node:test'
import { add } from '../src/add.js'
import { strictEqual } from 'node:assert'

test('add', () => {
  strictEqual(add(1, 2), 4)
})
`
  const file = path.join(dir, 'test', 'add.test.ts')
  await writeFile(file, toWrite)

  await completed
})

test('watch file syntax error', { skip }, async (t) => {
  const { strictEqual, completed, match } = tspl(t, { plan: 3 })

  const dir = path.resolve(await mkdtemp('.test-watch'))
  await cp(join(import.meta.url, '..', 'fixtures', 'ts-esm'), dir, {
    recursive: true
  })

  const controller = new AbortController()
  t.after(async () => {
    controller.abort()
    try {
      await rm(dir, { recursive: true, retryDelay: 100, maxRetries: 10 })
    } catch {}
  })

  const config = {
    files: [],
    cwd: dir,
    signal: controller.signal,
    watch: true
  }

  const stream = await runWithTypeScript(config)

  const fn = (test) => {
    if (test.type === 'test:fail') {
      match(test.data.name, /add/)
      stream.removeListener('data', fn)
    }
  }
  stream.on('data', fn)

  const [test] = await once(stream, 'data')
  strictEqual(test.type, 'test:diagnostic')
  match(test.data.message, /TypeScript compilation complete \(\d+ms\)/)

  const toWrite = `
import { test } from 'node:test'
import { add } from '../src/add.js'
import { strictEqual } from 'node:assert'

test('add', () => {
  strictEqual(add(1, 2), 3
})
`
  const file = path.join(dir, 'test', 'add.test.ts')
  await writeFile(file, toWrite)

  await completed
})

test('watch with post compile hook should call the hook the right number of times', { skip }, async (t) => {
  const { completed, ok, match } = tspl(t, { plan: 2 })

  const dir = path.resolve(await mkdtemp('.test-watch-with-post-compile-hook'))
  await cp(join(import.meta.url, '..', 'fixtures', 'ts-esm-post-compile'), dir, {
    recursive: true
  })

  const controller = new AbortController()
  t.after(async () => {
    controller.abort()
    try {
      await rm(dir, { recursive: true, retryDelay: 100, maxRetries: 10 })
    } catch {}
  })

  const config = {
    'post-compile': 'postCompile.ts',
    files: [],
    cwd: dir,
    signal: controller.signal,
    watch: true
  }

  const stream = await runWithTypeScript(config)

  const fn = (test) => {
    if (test.type === 'test:fail') {
      match(test.data.name, /add/)
      stream.removeListener('data', fn)
    }
  }
  stream.on('data', fn)

  let postCompileEventCount = 0
  const diagnosticListenerFn = (test) => {
    if (test.type === 'test:diagnostic' && test.data.message.includes('Post compile hook complete')) {
      if (++postCompileEventCount === 2) {
        ok(true, 'Post compile hook ran twice')
        stream.removeListener('data', diagnosticListenerFn)
      }
    }
  }

  stream.on('data', diagnosticListenerFn)

  const toWrite = `
import { test } from 'node:test'
import { add } from '../src/add.js'
import { strictEqual } from 'node:assert'

test('add', () => {
  strictEqual(add(1, 2), 4)
})
`
  const file = path.join(dir, 'test', 'add.test.ts')
  await writeFile(file, toWrite)

  await completed
})
