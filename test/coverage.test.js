import { test } from 'node:test'
import { match, doesNotMatch } from 'node:assert'
import { execa } from 'execa'
import { join } from 'desm'

delete process.env.GITHUB_ACTION
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

test('coverage excludes', async () => {
  const res = await execa('node', [
    borp,
    '--coverage',
    '--coverage-exclude=src'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm')
  })

  match(res.stdout, /% Stmts/)
  match(res.stdout, /All files/)
  doesNotMatch(res.stdout, /add\.ts/)
  // The test files are shown
  match(res.stdout, /add\.test\.ts/)
  match(res.stdout, /add2\.test\.ts/)
})
