import { ok } from 'node:assert'
import { test } from 'node:test'

test('this will take a long time', (t, done) => {
  setTimeout(() => {
    ok(true)
    done()
  }, 5000) // 5 seconds - longer than the 1-2s timeouts
  console.log('test:waiting')
})
