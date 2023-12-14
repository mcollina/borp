import { run } from 'node:test'
import { glob } from 'glob'
import { findUp } from 'find-up'
import { createRequire } from 'node:module'
import { resolve, join, dirname } from 'node:path'
import { access, readFile } from 'node:fs/promises'
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

function deferred () {
  let resolve
  let reject
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { resolve, reject, promise }
}

export default async function runWithTypeScript (config) {
  const { cwd } = config
  const chunks = []
  const tsconfigPath = await findUp('tsconfig.json', { cwd })

  let prefix = ''
  let tscPath

  if (tsconfigPath) {
    const _require = createRequire(cwd)
    const typescriptPathCWD = _require.resolve('typescript')
    tscPath = join(typescriptPathCWD, '..', '..', 'bin', 'tsc')
    if (tscPath) {
      const isAccessible = await isFileAccessible(tscPath)
      if (isAccessible) {
        // Watch is handled aftterwards
        if (!config.watch) {
          const start = Date.now()
          await execa('node', [tscPath], { cwd: dirname(tsconfigPath) })
          chunks.push({
            type: 'test:diagnostic',
            data: {
              nesting: 0,
              message: `TypeScript compilation complete (${Date.now() - start}ms)`
            }
          })
        }
      } else {
        throw new Error('Could not find tsc')
      }
    }
    const tsconfig = JSON.parse(await readFile(tsconfigPath))
    const outDir = tsconfig.compilerOptions.outDir
    if (outDir) {
      prefix = join(dirname(tsconfigPath), outDir)
    }
  }
  config.prefix = prefix
  config.setup = (test) => {
    for (const chunk of chunks) {
      test.reporter.push(chunk)
    }
  }

  let tscChild
  /* eslint prefer-const: "off" */
  let stream
  let p

  if (config.watch) {
    p = deferred()
    const start = Date.now()
    tscChild = execa('node', [tscPath, '--watch'], { cwd })
    tscChild.stdout.setEncoding('utf8')
    tscChild.stdout.on('data', (data) => {
      if (data.includes('Watching for file changes')) {
        chunks.push({
          type: 'test:diagnostic',
          data: {
            nesting: 0,
            message: `TypeScript compilation complete (${Date.now() - start}ms)`
          }
        })

        p.resolve()
      }
      if (data.includes('error TS')) {
        const toPush = stream || chunks
        toPush.push({
          type: 'test:fail',
          data: {
            nesting: 0,
            name: data.trim()
          }
        })
      }
    })
    if (config.signal) {
      config.signal.addEventListener('abort', () => {
        tscChild.kill()
      })
    }
  }

  if (p) {
    await p.promise
  }

  let files = config.files || []
  const ignore = join('node_modules', '**')
  if (files.length > 0) {
    if (prefix) {
      files = files.map((file) => join(prefix, file.replace(/ts$/, 'js')))
    }
  } else if (config.pattern) {
    if (prefix) {
      config.pattern = join(prefix, config.pattern)
    }
    files = await glob(config.pattern, { ignore, cwd })
  } else if (prefix) {
    files = await glob(join(prefix, join('test', '**', '*.test.{cjs,mjs,js}')), { ignore, cwd })
  } else {
    files = await glob(join('test', '**', '*.test.{cjs,mjs,js}'), { ignore, cwd })
  }

  config.files = files

  stream = run(config)

  stream.on('close', () => {
    if (tscChild) {
      tscChild.kill()
    }
  })
  return stream
}
