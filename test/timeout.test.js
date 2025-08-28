import { test } from 'node:test'
import { once } from 'node:events'
import { fork } from 'node:child_process'
import { tspl } from '@matteo.collina/tspl'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const borp = join(__dirname, '..', 'borp.js')
const longFixturePath = join(__dirname, '..', 'fixtures', 'long')
const forkOpts = {
  cwd: longFixturePath,
  stdio: ['pipe', 'pipe', 'pipe', 'ipc']
}

test('times out after 2s by default', async (t) => {
  const { ok, equal } = tspl(t, { plan: 4 })
  const borpProcess = fork(borp, ['--timeout', '2000'], forkOpts)
  let stdout = ''
  borpProcess.stdout.on('data', (data) => {
    stdout += data
  })
  const [code] = await once(borpProcess, 'exit')
  equal(code, 1)
  ok(stdout.includes('test timed out after 2000ms'))
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
  })
  const [code] = await once(borpProcess, 'exit')
  equal(code, 0)
  ok(stdout.includes('✔ this will take a long time'))
  ok(stdout.includes('tests 1'))
  ok(stdout.includes('pass 1'))
})

test('timeout is configurable', async (t) => {
  const { ok, equal } = tspl(t, { plan: 4 })
  const borpProcess = fork(borp, ['--timeout', '1000'], forkOpts)
  let stdout = ''
  borpProcess.stdout.on('data', (data) => {
    stdout += data
  })
  const [code] = await once(borpProcess, 'exit')
  equal(code, 1)
  ok(stdout.includes('test timed out after 1000ms'))
  ok(stdout.includes('tests 1'))
  ok(stdout.includes('cancelled 1'))
})
