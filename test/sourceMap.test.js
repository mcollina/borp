'use strict'

import { test } from 'node:test'
import { execa } from 'execa'
import { existsSync } from 'node:fs'
import { AssertionError, equal, fail, match, strictEqual } from 'node:assert'
import { tspl } from '@matteo.collina/tspl'
import path from 'node:path'
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import runWithTypeScript from '../lib/run.js'
import { join } from 'desm'

test('borp should return ts file path in error message when sourceMap is active in tsconfig', async (t) => {
  const borp = join(import.meta.url, '..', 'borp.js')

  try {
    await execa('node', [
      borp
    ], {
      cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm-source-map')
    })
    fail('Should not complete borp without error')
  } catch (e) {
    if (e instanceof AssertionError) {
      throw e
    }

    equal(e.exitCode, 1)
    match(e.message, /at TestContext\..*add\.test\.ts/, 'Error message should contain ts file path')
  }

  const fileMapPath = join(import.meta.url, '..', 'fixtures', 'ts-esm-source-map', 'dist', 'src', 'add.js.map')
  strictEqual(existsSync(fileMapPath), true, 'Map file should be generated')
})

test('source map should be generated when watch is active', async (t) => {
  const { strictEqual, completed } = tspl(t, { plan: 1 })

  const dir = path.resolve(await mkdtemp('.test-watch'))
  await cp(join(import.meta.url, '..', 'fixtures', 'ts-esm-source-map'), dir, {
    recursive: true
  })

  const passTest = `
import { test } from 'node:test'
import { add } from '../src/add.js'
import { strictEqual } from 'node:assert'

test('addSuccess', () => {
  strictEqual(add(1,2), 3)
})
`
  await writeFile(path.join(dir, 'test', 'add.test.ts'), passTest)

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

  await runWithTypeScript(config)

  const failureTestToWrite = `
import { test } from 'node:test'
import { add } from '../src/add.js'
import { strictEqual } from 'node:assert'

test('addFailure', () => {
  strictEqual(add(1,2), 4)
})
`
  await writeFile(path.join(dir, 'test', 'add.test.ts'), failureTestToWrite)

  const expectedMapFilePath = path.join(dir, 'dist', 'src', 'add.js.map')
  strictEqual(existsSync(expectedMapFilePath), true, 'Map file should be generated')

  await completed
})
