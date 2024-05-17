'use strict'

import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { existsSync } from 'node:fs'
import { AssertionError, equal, fail, match, strictEqual } from 'node:assert'

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
