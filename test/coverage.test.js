import { test } from 'node:test'
import { match } from 'node:assert'
import { execa } from 'execa'
import { join } from 'desm'

const borp = join(import.meta.url, '..', 'borp.js')

test('coverage', async () => {
  const res = await execa('node', [
    borp,
    '--coverage'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  })

  match(res.stdout, /% Stmts/)
  match(res.stdout, /All files/)
  match(res.stdout, /add\.ts/)
})
