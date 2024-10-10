import { test } from 'node:test'
import { execa } from 'execa'
import { join } from 'desm'
import { strictEqual } from 'node:assert'
import path from 'node:path'

const borp = join(import.meta.url, '..', 'borp.js')
const confFilesDir = join(import.meta.url, '..', 'fixtures', 'conf')

test('reporter from node_modules', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'ts-esm')
  const { stdout } = await execa('node', [borp], {
    cwd,
    env: {
      BORP_CONF_FILE: path.join(confFilesDir, 'reporters.yaml')
    }
  })

  strictEqual(stdout.indexOf('tests 2') >= 0, true)
})

test('reporter from relative path', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'relative-reporter')
  const { stdout } = await execa('node', [borp], {
    cwd,
    env: {
      BORP_CONF_FILE: path.join(confFilesDir, 'relative-reporter.yaml')
    }
  })

  strictEqual(/passed:.+add\.test\.js/.test(stdout), true)
  strictEqual(/passed:.+add2\.test\.js/.test(stdout), true)
})

test('interprets globs for files', async () => {
  const cwd = join(import.meta.url, '..', 'fixtures', 'files-glob')
  const { stdout } = await execa('node', [borp], {
    cwd,
    env: {
      BORP_CONF_FILE: path.join(confFilesDir, 'glob-files.yaml')
    }
  })

  strictEqual(stdout.indexOf('tests 2') >= 0, true)
})
