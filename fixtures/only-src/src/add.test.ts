import { test } from 'node:test'
import { add } from './add.js'
import { strictEqual } from 'node:assert'

test('add', () => {
  strictEqual(add(1, 2), 3)
})
