import { test } from 'node:test'
import { once } from 'node:events'
import { fork } from 'node:child_process'
import { tspl } from '@matteo.collina/tspl'
import { join } from 'desm'

const borp = join(import.meta.url, '..', 'borp.js')
const clock = join(import.meta.url, '..', 'test-utils', 'clock.js')
const forkOpts = {
  cwd: join(import.meta.url, '..', 'fixtures', 'long'),
  env: { NODE_OPTIONS: `--import=${clock}` },
  stdio: ['pipe', 'pipe', 'pipe', 'ipc']
}

test('times out after 30s by default', async (t) => {
  const { ok, equal } = tspl(t, { plan: 4 })
  const borpProcess = fork(borp, forkOpts)
  let stdout = ''
  borpProcess.stdout.on('data', (data) => {
    stdout += data
    if (data.includes('test:waiting')) {
      borpProcess.send(['tick', 30e3])
      borpProcess.send(['uninstall'])
    }
  })
  const [code] = await once(borpProcess, 'exit')
  equal(code, 1)
  ok(stdout.includes('test timed out after 30000ms'))
  ok(stdout.includes('tests 1'))
  ok(stdout.includes('cancelled 1'))
})

test('does not timeout when setting --no-timeout', async (t) => {
  const { ok, equal } = tspl(t, { plan: 4 })
  const borpProcess = fork(borp, ['--no-timeout'], forkOpts)
  borpProcess.stderr.pipe(process.stderr)
  let stdout = ''
  borpProcess.stdout.on('data', (data) => {
    stdout += data
    if (data.includes('test:waiting')) {
      borpProcess.send(['tick', 30e3])
      borpProcess.send(['uninstall'])
    }
  })
  const [code] = await once(borpProcess, 'exit')
  equal(code, 0)
  ok(stdout.includes('✔ this will take a long time'))
  ok(stdout.includes('tests 1'))
  ok(stdout.includes('pass 1'))
})

test('timeout is configurable', async (t) => {
  const { ok, equal } = tspl(t, { plan: 4 })
  const borpProcess = fork(borp, ['--timeout', '10000'], forkOpts)
  let stdout = ''
  borpProcess.stdout.on('data', (data) => {
    stdout += data
    if (data.includes('test:waiting')) {
      borpProcess.send(['tick', 10e3])
      borpProcess.send(['uninstall'])
    }
  })
  const [code] = await once(borpProcess, 'exit')
  equal(code, 1)
  ok(stdout.includes('test timed out after 10000ms'))
  ok(stdout.includes('tests 1'))
  ok(stdout.includes('cancelled 1'))
})
