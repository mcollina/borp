import { test } from 'node:test'
import { join } from 'desm'
import runWithTypeScript from '../lib/run.js'
import { strictEqual } from 'node:assert'

test('load global setup (ts-cjs)', async () => {
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-cjs-global-setup'),
    'global-setup': './test/global-setup.ts',
  }
  const { globalSetup, globalTeardown } = await runWithTypeScript(config)
  strictEqual(typeof globalSetup, 'function')
  strictEqual(typeof globalTeardown, 'function')
})

test('load global setup (js-esm)', async () => {
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'js-esm-global-setup'),
    'global-setup': './test/global-setup.js',
  }
  const { globalSetup, globalTeardown } = await runWithTypeScript(config)
  strictEqual(typeof globalSetup, 'function')
  strictEqual(typeof globalTeardown, 'function')
})

test('load global setup (js-cjs)', async () => {
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'js-cjs-global-setup'),
    'global-setup': './test/global-setup.js',
  }
  const { globalSetup, globalTeardown } = await runWithTypeScript(config)
  strictEqual(typeof globalSetup, 'function')
  strictEqual(typeof globalTeardown, 'function')
})
