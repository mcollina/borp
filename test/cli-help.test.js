import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { rejects, strictEqual } from 'node:assert'

const borp = join(import.meta.url, '..', 'borp.js')

delete process.env.GITHUB_ACTION

const testFn1 = process.platform === 'win32' ? test.skip : test
testFn1('multiple invalid options show help text', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')

  await rejects(async () => {
    await execa('node', [borp, '--foo', '--bar'], {
      cwd: testCwd,
      timeout: 15000
    })
    throw new Error('Expected command to fail')
  }, (error) => {
    strictEqual(error.exitCode, 1)
    strictEqual(error.stderr.includes('Error: Unknown option \'--foo\''), true, 'Should show error for first invalid option')
    strictEqual(error.stderr.includes('Usage: borp [options] [files...]'), true, 'Should show help text')
    return true
  })
})

const testFn2 = process.platform === 'win32' ? test.skip : test
testFn2('invalid short option shows help text', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')

  await rejects(async () => {
    await execa('node', [borp, '-z'], {
      cwd: testCwd,
      timeout: 15000
    })
    throw new Error('Expected command to fail')
  }, (error) => {
    strictEqual(error.exitCode, 1)
    strictEqual(error.stderr.includes('Error: Unknown option \'-z\''), true, 'Should show error message')
    strictEqual(error.stderr.includes('Usage: borp [options] [files...]'), true, 'Should show help text')
    return true
  })
})

const testFn3 = process.platform === 'win32' ? test.skip : test
testFn3('--help option shows help text and exits successfully', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')

  const { stdout, exitCode } = await execa('node', [borp, '--help'], {
    cwd: testCwd,
    timeout: 15000
  })

  strictEqual(exitCode, 0, 'Should exit with code 0')
  strictEqual(stdout.includes('Usage: borp [options] [files...]'), true, 'Should show usage line')
  strictEqual(stdout.includes('--help'), true, 'Should show help option')
  strictEqual(stdout.includes('--coverage'), true, 'Should show coverage option')
  strictEqual(stdout.includes('Examples:'), true, 'Should show examples section')
  strictEqual(stdout.includes('borp --coverage'), true, 'Should show coverage example')
})

const testFn4 = process.platform === 'win32' ? test.skip : test
testFn4('-h option shows help text and exits successfully', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')

  const { stdout, exitCode } = await execa('node', [borp, '-h'], {
    cwd: testCwd,
    timeout: 15000
  })

  strictEqual(exitCode, 0, 'Should exit with code 0')
  strictEqual(stdout.includes('Usage: borp [options] [files...]'), true, 'Should show usage line')
  strictEqual(stdout.includes('Examples:'), true, 'Should show examples section')
})
