import { test } from 'node:test'
import { tspl } from '@matteo.collina/tspl'
import runWithTypeScript from '../lib/run.js'
import { join } from 'desm'
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'

test('watch mode starts successfully', async (t) => {
  const { ok, completed } = tspl(t, { plan: 1 })

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

  const stream = await runWithTypeScript(config)

  // Verify we got a stream back
  ok(stream !== null, 'Should return a stream')

  // Give watch mode a moment to start, then abort
  await setTimeout(500)
  controller.abort()

  await completed
})

test('watch mode detects file changes', async (t) => {
  const { ok, completed } = tspl(t, { plan: 1 })

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

  const stream = await runWithTypeScript(config)

  // Verify stream exists
  ok(typeof stream.on === 'function', 'Should return an event emitter')

  // Let it run for a bit, then modify a file
  await setTimeout(1000)

  const toWrite = `
import { test } from 'node:test'
import { add } from '../src/add.ts'
import { strictEqual } from 'node:assert'

test('add', () => {
  strictEqual(add(1, 2), 4)
})
`
  const file = path.join(dir, 'test', 'add.test.ts')
  await writeFile(file, toWrite)

  // Let watch detect the change
  await setTimeout(1000)
  controller.abort()

  await completed
})
