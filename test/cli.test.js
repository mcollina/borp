import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'

const borp = join(import.meta.url, '..', 'borp.js')

test('limit concurrency', async () => {
  await execa('node', [
    borp,
    '--concurrency',
    '1'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  })
})
