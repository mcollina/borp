import { test } from 'node:test'
import { add } from '../lib/add.js'
import { strictEqual } from 'node:assert'

test('package2-add', () => {
  strictEqual(add(1, 2), 3)
})
