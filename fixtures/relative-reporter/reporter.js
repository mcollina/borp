'use strict'

import { Transform } from 'node:stream'

const testReporter = new Transform({
  writableObjectMode: true,
  transform (event, encoding, callback) {
    switch (event.type) {
      case 'test:pass': {
        return callback(null, `passed: ${event.data.file}\n`)
      }

      case 'test:fail': {
        return callback(null, `failed: ${event.data.file}\n`)
      }

      default: {
        callback(null, null)
      }
    }
  }
})

export default testReporter
