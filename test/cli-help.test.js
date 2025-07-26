import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { rejects, strictEqual } from 'node:assert'

const borp = join(import.meta.url, '..', 'borp.js')

// Debug logging for Windows troubleshooting
console.log('[DEBUG] CLI Help Tests - Environment info:', {
  platform: process.platform,
  nodeVersion: process.version,
  cwd: process.cwd(),
  borpPath: borp,
  __dirname: import.meta.url
})

// Track subprocesses for cleanup
const activeSubprocesses = new Set()

// Global cleanup handler
process.on('exit', () => {
  console.log('CLI HELP TEST DEBUG: Process exiting, cleaning up', activeSubprocesses.size, 'subprocesses')
  for (const subprocess of activeSubprocesses) {
    if (subprocess && !subprocess.killed) {
      subprocess.kill('SIGKILL')
    }
  }
})

delete process.env.GITHUB_ACTION

const testFn1 = process.platform === 'win32' ? test.skip : test
testFn1('multiple invalid options show help text', async () => {
  console.log('[DEBUG] Starting multiple invalid options test')
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  console.log('[DEBUG] Test CWD:', testCwd)

  await rejects(async () => {
    console.log('[DEBUG] About to execute execa with multiple invalid options')
    const result = await execa('node', [borp, '--foo', '--bar'], {
      cwd: testCwd,
      timeout: 15000,
      windowsHide: false
    })
    console.log('[DEBUG] Unexpected success:', result)
    throw new Error('Expected command to fail')
  }, (error) => {
    console.log('[DEBUG] Multiple options error handler:', {
      exitCode: error.exitCode,
      stderrLength: error.stderr?.length
    })

    // Should exit with code 1 and show help for first invalid option
    strictEqual(error.exitCode, 1)
    const hasFooError = error.stderr.includes('Error: Unknown option \'--foo\'')
    console.log('[DEBUG] Has foo error:', hasFooError)
    strictEqual(hasFooError, true, 'Should show error for first invalid option')

    const hasUsage = error.stderr.includes('Usage: borp [options] [files...]')
    console.log('[DEBUG] Has usage in multiple options:', hasUsage)
    strictEqual(hasUsage, true, 'Should show help text')
    return true
  })
  console.log('[DEBUG] Multiple options test completed')
})

const testFn2 = process.platform === 'win32' ? test.skip : test
testFn2('invalid short option shows help text', async () => {
  console.log('[DEBUG] Starting invalid short option test')
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  console.log('[DEBUG] Test CWD:', testCwd)

  await rejects(async () => {
    console.log('[DEBUG] About to execute execa with invalid short option')
    const result = await execa('node', [borp, '-z'], {
      cwd: testCwd,
      timeout: 15000,
      windowsHide: process.platform === 'win32'
    })
    console.log('[DEBUG] Unexpected success:', result)
    throw new Error('Expected command to fail')
  }, (error) => {
    console.log('[DEBUG] Short option error handler:', {
      exitCode: error.exitCode,
      stderrLength: error.stderr?.length
    })

    strictEqual(error.exitCode, 1)
    const hasZError = error.stderr.includes('Error: Unknown option \'-z\'')
    console.log('[DEBUG] Has -z error:', hasZError)
    strictEqual(hasZError, true, 'Should show error message')

    const hasUsage = error.stderr.includes('Usage: borp [options] [files...]')
    console.log('[DEBUG] Has usage in short option:', hasUsage)
    strictEqual(hasUsage, true, 'Should show help text')
    return true
  })
  console.log('[DEBUG] Short option test completed')
})

const testFn3 = process.platform === 'win32' ? test.skip : test
testFn3('--help option shows help text and exits successfully', async () => {
  console.log('[DEBUG] Starting --help option test')
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  console.log('[DEBUG] Test CWD:', testCwd)

  const startTime = Date.now()
  let subprocess
  let result

  try {
    subprocess = execa('node', [borp, '--help'], {
      cwd: testCwd,
      timeout: 10000, // Reduce timeout to 10s
      windowsHide: process.platform === 'win32',
      cleanup: true,
      killSignal: 'SIGTERM'
    })
    activeSubprocesses.add(subprocess)
    console.log('[DEBUG] --help subprocess started')

    result = await subprocess
    activeSubprocesses.delete(subprocess)
    const elapsed = Date.now() - startTime

    console.log(`[DEBUG] --help completed after ${elapsed}ms:`, {
      exitCode: result.exitCode,
      stdoutLength: result.stdout?.length,
      stdoutPreview: result.stdout?.substring(0, 100) + '...'
    })
  } catch (error) {
    if (subprocess) activeSubprocesses.delete(subprocess)
    const elapsed = Date.now() - startTime
    console.log(`[DEBUG] --help failed after ${elapsed}ms:`, {
      message: error.message,
      exitCode: error.exitCode,
      timedOut: error.timedOut,
      signal: error.signal
    })
    if (subprocess && !subprocess.killed) {
      console.log('[DEBUG] Killing --help subprocess')
      subprocess.kill('SIGKILL')
    }
    throw error
  }

  const { stdout, exitCode } = result

  strictEqual(exitCode, 0, 'Should exit with code 0')

  const hasUsage = stdout.includes('Usage: borp [options] [files...]')
  console.log('[DEBUG] --help has usage:', hasUsage)
  strictEqual(hasUsage, true, 'Should show usage line')

  const hasHelpOption = stdout.includes('--help')
  console.log('[DEBUG] --help has help option:', hasHelpOption)
  strictEqual(hasHelpOption, true, 'Should show help option')

  const hasCoverage = stdout.includes('--coverage')
  console.log('[DEBUG] --help has coverage:', hasCoverage)
  strictEqual(hasCoverage, true, 'Should show coverage option')

  const hasExamples = stdout.includes('Examples:')
  console.log('[DEBUG] --help has examples:', hasExamples)
  strictEqual(hasExamples, true, 'Should show examples section')

  const hasCoverageExample = stdout.includes('borp --coverage')
  console.log('[DEBUG] --help has coverage example:', hasCoverageExample)
  strictEqual(hasCoverageExample, true, 'Should show coverage example')

  console.log('[DEBUG] --help test completed')
})

const testFn4 = process.platform === 'win32' ? test.skip : test
testFn4('-h option shows help text and exits successfully', async () => {
  console.log('[DEBUG] Starting -h option test')
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  console.log('[DEBUG] Test CWD:', testCwd)

  const startTime = Date.now()
  let subprocess
  let result

  try {
    subprocess = execa('node', [borp, '-h'], {
      cwd: testCwd,
      timeout: 10000, // Reduce timeout to 10s
      windowsHide: process.platform === 'win32',
      cleanup: true,
      killSignal: 'SIGTERM'
    })
    activeSubprocesses.add(subprocess)
    console.log('[DEBUG] -h subprocess started')

    result = await subprocess
    activeSubprocesses.delete(subprocess)
    const elapsed = Date.now() - startTime

    console.log(`[DEBUG] -h completed after ${elapsed}ms:`, {
      exitCode: result.exitCode,
      stdoutLength: result.stdout?.length,
      stdoutPreview: result.stdout?.substring(0, 100) + '...'
    })
  } catch (error) {
    if (subprocess) activeSubprocesses.delete(subprocess)
    const elapsed = Date.now() - startTime
    console.log(`[DEBUG] -h failed after ${elapsed}ms:`, {
      message: error.message,
      exitCode: error.exitCode,
      timedOut: error.timedOut,
      signal: error.signal
    })
    if (subprocess && !subprocess.killed) {
      console.log('[DEBUG] Killing -h subprocess')
      subprocess.kill('SIGKILL')
    }
    throw error
  }

  const { stdout, exitCode } = result

  strictEqual(exitCode, 0, 'Should exit with code 0')

  const hasUsage = stdout.includes('Usage: borp [options] [files...]')
  console.log('[DEBUG] -h has usage:', hasUsage)
  strictEqual(hasUsage, true, 'Should show usage line')

  const hasExamples = stdout.includes('Examples:')
  console.log('[DEBUG] -h has examples:', hasExamples)
  strictEqual(hasExamples, true, 'Should show examples section')

  console.log('[DEBUG] -h test completed')
})
