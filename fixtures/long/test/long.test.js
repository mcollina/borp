import { ok } from 'node:assert'
import { test } from 'node:test'

test('this will take a long time', (t, done) => {
  setTimeout(() => {
    ok(true)
    done()
  }, 1e3)
  console.log('test:waiting')
})
