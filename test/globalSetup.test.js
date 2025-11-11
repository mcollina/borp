import { test } from 'node:test'
import { join } from 'desm'
import runWithTypeScript from '../lib/run.js'
import { strictEqual } from 'node:assert'

test('load global setup (ts-cjs)', { only: true }, async () => {
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-cjs-global-setup'),
    'global-setup': './test/global-setup.ts',
  }
  const { globalSetup, globalTeardown } = await runWithTypeScript(config)
  strictEqual(typeof globalSetup, 'function')
  strictEqual(typeof globalTeardown, 'function')
})

test('load global setup (js-esm)', { only: true }, async () => {
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'js-esm-global-setup'),
    'global-setup': './test/global-setup.js',
  }
  const { globalSetup, globalTeardown } = await runWithTypeScript(config)
  strictEqual(typeof globalSetup, 'function')
  strictEqual(typeof globalTeardown, 'function')
})

test('load global setup (js-cjs)', async (t) => {
  const config = {
    files: [],
    cwd: join(import.meta.url, '..', 'fixtures', 'js-cjs-global-setup'),
    'global-setup': './test/global-setup.js',
  }
  const { globalSetup, globalTeardown } = await runWithTypeScript(config)
  strictEqual(typeof globalSetup, 'function')
  strictEqual(typeof globalTeardown, 'function')
})
