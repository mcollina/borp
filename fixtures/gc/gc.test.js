import { doesNotThrow } from 'node:assert'
import { test } from 'node:test'

test('this needs gc', () => {
  doesNotThrow(() => {
    global.gc()
  })
})
