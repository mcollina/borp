import { run } from 'node:test'
import { glob } from 'glob'
import { findUp } from 'find-up'
import { createRequire } from 'node:module'
import { resolve, join, dirname } from 'node:path'
import { access, readFile, mkdtemp } from 'node:fs/promises'
import { execa } from 'execa'

async function isFileAccessible (filename, directory) {
  try {
    const filePath = directory ? resolve(directory, filename) : filename
    await access(filePath)
    return true
  } catch (err) {
    return false
  }
}

export default async function runWithTypeScript (config) {
  const { cwd, coverage } = config
  const tsconfigPath = await findUp('tsconfig.json', { cwd })

  let prefix = ''

  if (tsconfigPath) {
    const _require = createRequire(cwd)
    const typescriptPathCWD = _require.resolve('typescript')
    const tscPath = join(typescriptPathCWD, '..', '..', 'bin', 'tsc')
    if (tscPath) {
      const isAccessible = await isFileAccessible(tscPath)
      if (isAccessible) {
        await execa(tscPath, { cwd: dirname(tsconfigPath), stdio: 'inherit' })
      }
    }
    const tsconfig = JSON.parse(await readFile(tsconfigPath))
    const outDir = tsconfig.compilerOptions.outDir
    if (outDir) {
      prefix = join(dirname(tsconfigPath), outDir)
    }
  }

  let files = config.files || []
  if (files.length > 0) {
    if (prefix) {
      files = files.map((file) => join(prefix, file.replace(/ts$/, 'js')))
    }
  } else if (config.pattern) {
    if (prefix) {
      config.pattern = join(prefix, config.pattern)
    }
    files = await glob(config.pattern, { ignore: 'node_modules/**', cwd })
  } else if (prefix) {
    files = await glob(join(prefix, 'test/**/*.test.{cjs,mjs,js}'), { ignore: 'node_modules/**', cwd })
  } else {
    files = await glob('test/**/*.test.{cjs,mjs,js}', { ignore: 'node_modules/**', cwd })
  }

  config.files = files

  const stream = run(config)
  return stream
}
