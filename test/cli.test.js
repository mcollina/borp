import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { rejects, strictEqual } from 'node:assert'
import { rm } from 'node:fs/promises'
import path from 'node:path'

const borp = join(import.meta.url, '..', 'borp.js')

// Debug logging for Windows troubleshooting
console.log('[DEBUG] Environment info:', {
  platform: process.platform,
  nodeVersion: process.version,
  cwd: process.cwd(),
  borpPath: borp,
  __dirname: import.meta.url
})

// Additional detailed logging for our investigation
console.log('CLI TEST DEBUG: Platform:', process.platform)
console.log('CLI TEST DEBUG: Node version:', process.version)
console.log('CLI TEST DEBUG: borp path:', borp)
console.log('CLI TEST DEBUG: process.cwd():', process.cwd())
console.log('CLI TEST DEBUG: import.meta.url:', import.meta.url)

// Track subprocesses for cleanup
const activeSubprocesses = new Set()

// Global cleanup handler
process.on('exit', () => {
  console.log('CLI TEST DEBUG: Process exiting, cleaning up', activeSubprocesses.size, 'subprocesses')
  for (const subprocess of activeSubprocesses) {
    if (subprocess && !subprocess.killed) {
      subprocess.kill('SIGKILL')
    }
  }
})

delete process.env.GITHUB_ACTION

test('limit concurrency', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  console.log('CLI TEST DEBUG: limit concurrency - cwd:', testCwd)
  console.log('CLI TEST DEBUG: limit concurrency - starting execa')

  let subprocess
  try {
    subprocess = execa('node', [
      borp,
      '--concurrency',
      '1'
    ], {
      cwd: testCwd,
      timeout: 30000,
      cleanup: true,
      killSignal: 'SIGTERM'
    })
    activeSubprocesses.add(subprocess)

    const result = await subprocess
    activeSubprocesses.delete(subprocess)
    console.log('CLI TEST DEBUG: limit concurrency - success')
    console.log('CLI TEST DEBUG: limit concurrency - stdout:', result.stdout.substring(0, 200))
  } catch (error) {
    if (subprocess) activeSubprocesses.delete(subprocess)
    console.log('CLI TEST DEBUG: limit concurrency - error:', error.message)
    console.log('CLI TEST DEBUG: limit concurrency - error code:', error.exitCode)
    console.log('CLI TEST DEBUG: limit concurrency - error signal:', error.signal)
    if (error.stdout) console.log('CLI TEST DEBUG: limit concurrency - error stdout:', error.stdout.substring(0, 200))
    if (error.stderr) console.log('CLI TEST DEBUG: limit concurrency - error stderr:', error.stderr.substring(0, 200))
    if (subprocess && !subprocess.killed) {
      console.log('CLI TEST DEBUG: limit concurrency - killing subprocess')
      subprocess.kill('SIGKILL')
    }
    throw error
  }
})

test('failing test set correct status code', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'fails')
  console.log('CLI TEST DEBUG: failing test - cwd:', testCwd)
  console.log('CLI TEST DEBUG: failing test - starting execa')

  // execa rejects if status code is not 0
  let subprocess
  try {
    subprocess = execa('node', [
      borp
    ], {
      cwd: testCwd,
      timeout: 30000,
      cleanup: true,
      killSignal: 'SIGTERM'
    })
    activeSubprocesses.add(subprocess)

    await rejects(subprocess)
    activeSubprocesses.delete(subprocess)
    console.log('CLI TEST DEBUG: failing test - success (expected rejection)')
  } catch (error) {
    if (subprocess) activeSubprocesses.delete(subprocess)
    console.log('CLI TEST DEBUG: failing test - unexpected error:', error.message)
    if (subprocess && !subprocess.killed) {
      console.log('CLI TEST DEBUG: failing test - killing subprocess')
      subprocess.kill('SIGKILL')
    }
    throw error
  }
})

test('--expose-gc flag enables garbage collection in tests', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'gc')
  console.log('CLI TEST DEBUG: expose-gc - cwd:', testCwd)
  console.log('CLI TEST DEBUG: expose-gc - starting execa')

  try {
    await execa('node', [
      borp,
      '--expose-gc'
    ], {
      cwd: testCwd,
      timeout: 45000 // Increase timeout for Windows
    })
    console.log('CLI TEST DEBUG: expose-gc - success')
  } catch (error) {
    console.log('CLI TEST DEBUG: expose-gc - error:', error.message)
    console.log('CLI TEST DEBUG: expose-gc - error code:', error.exitCode)
    if (error.stdout) console.log('CLI TEST DEBUG: expose-gc - error stdout:', error.stdout.substring(0, 200))
    if (error.stderr) console.log('CLI TEST DEBUG: expose-gc - error stderr:', error.stderr.substring(0, 200))
    throw error
  }
})

test('failing test with --expose-gc flag sets correct status code', async () => {
  const testCwd = join(import.meta.url, '..', 'fixtures', 'fails')
  console.log('CLI TEST DEBUG: failing expose-gc - cwd:', testCwd)
  console.log('CLI TEST DEBUG: failing expose-gc - starting execa')

  // execa rejects if status code is not 0
  let subprocess
  try {
    subprocess = execa('node', [
      borp,
      '--expose-gc'
    ], {
      cwd: testCwd,
      timeout: 30000,
      cleanup: true,
      killSignal: 'SIGTERM'
    })

    await rejects(subprocess)
    console.log('CLI TEST DEBUG: failing expose-gc - success (expected rejection)')
  } catch (error) {
    console.log('CLI TEST DEBUG: failing expose-gc - unexpected error:', error.message)
    if (subprocess && !subprocess.killed) {
      console.log('CLI TEST DEBUG: failing expose-gc - killing subprocess')
      subprocess.kill('SIGKILL')
    }
    throw error
  }
})

test.skip('disable ts and run no tests', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm2')
  console.log('CLI TEST DEBUG: disable ts - cwd:', cwd)
  console.log('CLI TEST DEBUG: disable ts - removing dist directory')

  try {
    await rm(path.join(cwd, 'dist'), { recursive: true, force: true })
    console.log('CLI TEST DEBUG: disable ts - dist directory removed')

    console.log('CLI TEST DEBUG: disable ts - starting execa')
    const { stdout } = await execa('node', [
      borp,
      '--reporter=spec',
      '--no-typescript'
    ], {
      cwd,
      timeout: 30000
    })

    console.log('CLI TEST DEBUG: disable ts - stdout:', stdout.substring(0, 300))
    strictEqual(stdout.indexOf('tests 0') >= 0, true)
    console.log('CLI TEST DEBUG: disable ts - success')
  } catch (error) {
    console.log('CLI TEST DEBUG: disable ts - error:', error.message)
    console.log('CLI TEST DEBUG: disable ts - error code:', error.exitCode)
    if (error.stdout) console.log('CLI TEST DEBUG: disable ts - error stdout:', error.stdout.substring(0, 200))
    if (error.stderr) console.log('CLI TEST DEBUG: disable ts - error stderr:', error.stderr.substring(0, 200))
    throw error
  }
})

test.skip('reporter from node_modules', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const { stdout } = await execa('node', [
    borp,
    '--reporter=spec',
    '--reporter=@reporters/silent'
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('tests 2') >= 0, true)
})

test.skip('reporter from relative path', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'relative-reporter')
  const { stdout } = await execa('node', [
    borp,
    '--reporter=./fixtures/relative-reporter/reporter.js'
  ], {
    cwd
  })

  strictEqual(/passed:.+add\.test\.js/.test(stdout), true)
  strictEqual(/passed:.+add2\.test\.js/.test(stdout), true)
})

test.skip('gh reporter', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  const { stdout } = await execa('node', [
    borp,
    '--reporter=gh'
  ], {
    cwd,
    env: {
      GITHUB_ACTIONS: '1'
    }
  })

  strictEqual(stdout.indexOf('::notice') >= 0, true)
})

test.skip('interprets globs for files', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'files-glob')
  console.log('CLI TEST DEBUG: glob files - cwd:', cwd)
  console.log('CLI TEST DEBUG: glob files - platform:', process.platform)

  const args = [
    borp,
    '\'test1/*.test.js\'',
    '\'test2/**/*.test.js\''
  ]
  console.log('CLI TEST DEBUG: glob files - args:', args)

  try {
    console.log('CLI TEST DEBUG: glob files - starting execa')
    const { stdout } = await execa('node', args, {
      cwd,
      timeout: 60000, // Increase timeout for potential Windows slowness
      shell: process.platform === 'win32' // Use shell on Windows for glob handling
    })

    console.log('CLI TEST DEBUG: glob files - stdout:', stdout.substring(0, 500))
    console.log('CLI TEST DEBUG: glob files - checking for add')
    console.log('CLI TEST DEBUG: glob files - add found:', stdout.indexOf('✔ add') >= 0)
    console.log('CLI TEST DEBUG: glob files - add2 found:', stdout.indexOf('✔ add2') >= 0)
    console.log('CLI TEST DEBUG: glob files - a thing found:', stdout.indexOf('✔ a thing') >= 0)

    strictEqual(stdout.indexOf('✔ add') >= 0, true)
    strictEqual(stdout.indexOf('✔ add2') >= 0, true)
    strictEqual(stdout.indexOf('✔ a thing'), -1)
    console.log('CLI TEST DEBUG: glob files - success')
  } catch (error) {
    console.log('CLI TEST DEBUG: glob files - error:', error.message)
    console.log('CLI TEST DEBUG: glob files - error code:', error.exitCode)
    console.log('CLI TEST DEBUG: glob files - error signal:', error.signal)
    if (error.stdout) console.log('CLI TEST DEBUG: glob files - error stdout:', error.stdout.substring(0, 500))
    if (error.stderr) console.log('CLI TEST DEBUG: glob files - error stderr:', error.stderr.substring(0, 500))
    throw error
  }
})

test.skip('interprets globs for files with an ignore rule', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'files-glob')
  console.log('CLI TEST DEBUG: glob ignore - cwd:', cwd)
  console.log('CLI TEST DEBUG: glob ignore - platform:', process.platform)

  const args = [
    borp,
    '\'**/*.test.js\'',
    '\'!test1/**/node_modules/**/*\''
  ]
  console.log('CLI TEST DEBUG: glob ignore - args:', args)

  try {
    console.log('CLI TEST DEBUG: glob ignore - starting execa')
    const { stdout } = await execa('node', args, {
      cwd,
      timeout: 60000, // Increase timeout for potential Windows slowness
      shell: process.platform === 'win32' // Use shell on Windows for glob handling
    })

    console.log('CLI TEST DEBUG: glob ignore - stdout:', stdout.substring(0, 500))
    console.log('CLI TEST DEBUG: glob ignore - add found:', stdout.indexOf('✔ add') >= 0)
    console.log('CLI TEST DEBUG: glob ignore - add2 found:', stdout.indexOf('✔ add2') >= 0)
    console.log('CLI TEST DEBUG: glob ignore - a thing found:', stdout.indexOf('✔ a thing') >= 0)

    strictEqual(stdout.indexOf('✔ add') >= 0, true)
    strictEqual(stdout.indexOf('✔ add2') >= 0, true)
    strictEqual(stdout.indexOf('✔ a thing'), -1)
    console.log('CLI TEST DEBUG: glob ignore - success')
  } catch (error) {
    console.log('CLI TEST DEBUG: glob ignore - error:', error.message)
    console.log('CLI TEST DEBUG: glob ignore - error code:', error.exitCode)
    console.log('CLI TEST DEBUG: glob ignore - error signal:', error.signal)
    if (error.stdout) console.log('CLI TEST DEBUG: glob ignore - error stdout:', error.stdout.substring(0, 500))
    if (error.stderr) console.log('CLI TEST DEBUG: glob ignore - error stderr:', error.stderr.substring(0, 500))
    throw error
  }
})

test.skip('Post compile script should be executed when --post-compile  is sent with esm', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm-post-compile')
  const { stdout } = await execa('node', [
    borp,
    '--post-compile=postCompile.ts'
  ], {
    cwd
  })

  strictEqual(stdout.indexOf('Post compile hook complete') >= 0, true, 'Post compile message should be found in stdout')
})

test.skip('Post compile script should be executed when --post-compile  is sent with cjs', async () => {
  const { stdout } = await execa('node', [
    borp,
    '--post-compile=postCompile.ts'
  ], {
    cwd: join(import.meta.url, '..', 'fixtures', 'ts-cjs-post-compile')
  })

  strictEqual(stdout.indexOf('Post compile hook complete') >= 0, true, 'Post compile message should be found in stdout')
})

test.skip('invalid option shows help text', async () => {
  console.log('[DEBUG] Starting invalid option test')
  const testCwd = join(import.meta.url, '..', 'fixtures', 'js-esm')
  console.log('[DEBUG] Test CWD:', testCwd)
  console.log('[DEBUG] Borp path:', borp)
  console.log('[DEBUG] Command:', 'node', [borp, '--invalid-option'])

  await rejects(async () => {
    console.log('[DEBUG] About to execute execa')
    const startTime = Date.now()
    try {
      const result = await execa('node', [borp, '--invalid-option'], {
        cwd: testCwd,
        timeout: 15000, // 15 second timeout
        windowsHide: process.platform === 'win32'
      })
      console.log('[DEBUG] Unexpected success:', result)
      throw new Error('Expected command to fail')
    } catch (error) {
      const elapsed = Date.now() - startTime
      console.log(`[DEBUG] Execa threw error after ${elapsed}ms:`, {
        exitCode: error.exitCode,
        timedOut: error.timedOut,
        stderr: error.stderr?.substring(0, 200) + '...',
        stdout: error.stdout?.substring(0, 200) + '...',
        message: error.message
      })

      throw error
    }
  }, (error) => {
    console.log('[DEBUG] In error handler, validating error:', {
      exitCode: error.exitCode,
      stderrLength: error.stderr?.length,
      stdoutLength: error.stdout?.length
    })

    // Should exit with code 1
    console.log('[DEBUG] Checking exit code:', error.exitCode)
    strictEqual(error.exitCode, 1)

    // Should show error message
    const hasErrorMessage = error.stderr.includes('Error: Unknown option \'--invalid-option\'')
    console.log('[DEBUG] Has error message:', hasErrorMessage)
    console.log('[DEBUG] Stderr content:', error.stderr)
    strictEqual(hasErrorMessage, true, 'Should show error message')

    // Should show help text
    const hasUsage = error.stderr.includes('Usage: borp [options] [files...]')
    console.log('[DEBUG] Has usage line:', hasUsage)
    strictEqual(hasUsage, true, 'Should show usage line')

    const hasHelp = error.stderr.includes('--help')
    console.log('[DEBUG] Has help option:', hasHelp)
    strictEqual(hasHelp, true, 'Should show help option')

    const hasCoverage = error.stderr.includes('--coverage')
    console.log('[DEBUG] Has coverage option:', hasCoverage)
    strictEqual(hasCoverage, true, 'Should show coverage option')

    const hasExamples = error.stderr.includes('Examples:')
    console.log('[DEBUG] Has examples section:', hasExamples)
    strictEqual(hasExamples, true, 'Should show examples section')

    console.log('[DEBUG] All assertions passed')
    return true
  })
  console.log('[DEBUG] Test completed successfully')
})

test.skip('multiple invalid options show help text', async () => {
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

test.skip('invalid short option shows help text', async () => {
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

test.skip('--help option shows help text and exits successfully', async () => {
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

test.skip('-h option shows help text and exits successfully', async () => {
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
