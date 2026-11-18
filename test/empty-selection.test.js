import { test } from 'node:test'
import { strictEqual } from 'node:assert'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const borp = fileURLToPath(new URL('../borp.js', import.meta.url))
const cases = [
  { name: 'default discovery', args: [], selected: true },
  { name: 'matching pattern', args: ['--pattern', '*.test.cjs'], selected: true },
  { name: 'unmatched pattern', args: ['--pattern', 'missing/*.test.cjs'] },
  { name: 'pattern with literal single quotes', args: ['--pattern', "'*.test.cjs'"] },
  { name: 'unmatched positional glob', args: ['missing/*.test.cjs'] },
  { name: 'ignore all tests', args: ['--ignore', '**/*.test.cjs'] },
  { name: 'positive and negative globs', args: ['*.test.cjs', '!*.test.cjs'] },
  { name: 'unmatched config glob', args: [], config: 'files:\n  - "missing/*.test.cjs"\n' }
]

for (const { name, args, selected = false, config } of cases) {
  test(`empty selections do not fall back to discovery: ${name}`, async (t) => {
    const cwd = await mkdtemp(join(tmpdir(), 'borp-empty-selection-'))
    t.after(() => rm(cwd, { recursive: true, force: true }))
    await writeFile(join(cwd, 'unrelated.test.cjs'), `
      const { test } = require('node:test')
      const { writeFileSync } = require('node:fs')
      test('unrelated test', () => writeFileSync('executed.txt', 'yes'))
    `)
    // Do not inherit BORP_CONF_FILE from the environment running this test.
    await writeFile(join(cwd, '.borp.yaml'), config || '{}\n')
    const { exitCode } = await execa(process.execPath, [borp, ...args], {
      cwd,
      timeout: 10000,
      env: { BORP_CONF_FILE: join(cwd, '.borp.yaml'), GITHUB_ACTIONS: undefined }
    })

    strictEqual(exitCode, 0)
    strictEqual(existsSync(join(cwd, 'executed.txt')), selected)
  })
}
