import { test } from 'node:test'
import { match, doesNotMatch, fail, equal, AssertionError } from 'node:assert'
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

test('borp should return right error in case of check coverage active with default values failure', async (t) => {
  try {
    await execa('node', [
      borp,
      '--coverage',
      '--check-coverage'
    ], {
      cwd: join(import.meta.url, '..', 'fixtures', 'ts-esm-check-coverage')
    })
    fail('Should not complete borp without error')
  } catch (e) {
    if (e instanceof AssertionError) {
      throw e
    }

    equal(e.exitCode, 1)
    match(e.stderr, /ERROR: Coverage for lines/)
    match(e.stderr, /ERROR: Coverage for functions/)
    match(e.stderr, /ERROR: Coverage for statements/)
  }
})
