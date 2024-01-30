import { run } from 'node:test'
import { glob } from 'glob'
import { findUp } from 'find-up'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { access, readFile } from 'node:fs/promises'
import { execa } from 'execa'

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
  // This is a hack to override
  // https://github.com/nodejs/node/commit/d5c9adf3df
  delete process.env.NODE_TEST_CONTEXT

  const { cwd } = config
  let pushable = []
  const tsconfigPath = await findUp('tsconfig.json', { cwd })

  let prefix = ''
  let tscPath

  if (tsconfigPath) {
    const _require = createRequire(tsconfigPath)
    const typescriptPathCWD = _require.resolve('typescript')
    tscPath = join(typescriptPathCWD, '..', '..', 'bin', 'tsc')
    if (tscPath) {
      // This will throw if we cannot find the `tsc` binary
      await access(tscPath)

      // Watch is handled aftterwards
      if (!config.watch) {
        const start = Date.now()
        await execa('node', [tscPath], { cwd: dirname(tsconfigPath) })
        process.stdout.write(`TypeScript compilation complete (${Date.now() - start}ms)\n`)
        pushable.push({
          type: 'test:diagnostic',
          data: {
            nesting: 0,
            message: `TypeScript compilation complete (${Date.now() - start}ms)`
          }
        })
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
    if (Array.isArray(test.reporter)) {
      for (const chunk of pushable) {
        test.reporter.push(chunk)
      }
      pushable = test.reporter
    } else {
      for (const chunk of pushable) {
        test.push(chunk)
      }
      pushable = test
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
        pushable.push({
          type: 'test:diagnostic',
          data: {
            nesting: 0,
            message: `TypeScript compilation complete (${Date.now() - start}ms)`
          }
        })

        p.resolve()
      }
      if (data.includes('error TS')) {
        pushable.push({
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
  const ignore = config.ignore || []
  ignore.unshift('node_modules/**/*')
  if (files.length > 0) {
    if (prefix) {
      files = files.map((file) => join(prefix, file.replace(/ts$/, 'js')))
    }
  } else if (config.pattern) {
    let pattern = config.pattern
    if (prefix) {
      pattern = join(prefix, pattern)
      pattern = pattern.replace(/ts$/, 'js')
    }
    files = await glob(pattern, { ignore, cwd, windowsPathsNoEscape: true })
  } else if (prefix) {
    files = await glob(join(prefix, join('**', '*.test.{cjs,mjs,js}')), { ignore, cwd, windowsPathsNoEscape: true })
  } else {
    files = await glob(join('**', '*.test.{cjs,mjs,js}'), { ignore, cwd, windowsPathsNoEscape: true, absolute: true })
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
