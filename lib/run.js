import { run } from 'node:test'
import { glob } from 'glob'
import { findUp } from 'find-up'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { access } from 'node:fs/promises'
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

function enableSourceMapSupport (tsconfig) {
  if (!tsconfig?.options?.sourceMap) {
    return
  }

  process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --enable-source-maps'
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
  const typescriptCliArgs = []

  let postCompileFn = async () => {}

  if (config['post-compile']) {
    postCompileFn = async (outDir) => {
      const postCompileFile = join(outDir ?? '', config['post-compile']).replace(/\.ts$/, '.js')
      const postCompileStart = Date.now()
      const { stdout } = await execa('node', [postCompileFile], { cwd: dirname(tsconfigPath) })
      pushable.push({
        type: 'test:diagnostic',
        data: {
          nesting: 0,
          message: `Post compile hook complete (${Date.now() - postCompileStart}ms)`,
          details: stdout,
          typescriptCliArgs
        }
      })
    }
  }

  if (tsconfigPath && config.typescript !== false) {
    const _require = createRequire(tsconfigPath)
    const { parseJsonConfigFileContent, readConfigFile, sys } = _require('typescript')

    const configFile = readConfigFile(tsconfigPath, sys.readFile)
    const tsconfig = parseJsonConfigFileContent(
      configFile.config,
      sys,
      dirname(tsconfigPath)
    )

    const typescriptPathCWD = _require.resolve('typescript')
    tscPath = join(typescriptPathCWD, '..', '..', 'bin', 'tsc')
    const outDir = tsconfig.options.outDir
    if (outDir) {
      prefix = outDir
    }

    enableSourceMapSupport(tsconfig)

    if (tscPath) {
      // This will throw if we cannot find the `tsc` binary
      await access(tscPath)

      // Watch is handled aftterwards
      if (!config.watch) {
        if (Array.isArray(tsconfig.projectReferences) && tsconfig.projectReferences.length > 0) {
          typescriptCliArgs.push('--build')
        }
        const start = Date.now()
        await execa('node', [tscPath, ...typescriptCliArgs], { cwd: dirname(tsconfigPath) })
        process.stdout.write(`TypeScript compilation complete (${Date.now() - start}ms)\n`)
        pushable.push({
          type: 'test:diagnostic',
          data: {
            nesting: 0,
            message: `TypeScript compilation complete (${Date.now() - start}ms)`,
            typescriptCliArgs
          }
        })

        await postCompileFn(outDir)
      }
    }
  }

  // TODO remove those and create a new object
  delete config.typescript
  delete config['no-typescript']

  config.prefix = prefix
  config.setup = (test) => {
    /* c8 ignore next 12 */
    if (test.reporter) {
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
    typescriptCliArgs.push('--watch')
    p = deferred()
    let outDir = ''
    if (config['post-compile'] && tsconfigPath) {
      const _require = createRequire(tsconfigPath)
      const { parseJsonConfigFileContent, readConfigFile, sys } = _require('typescript')

      const configFile = readConfigFile(tsconfigPath, sys.readFile)
      const tsconfig = parseJsonConfigFileContent(
        configFile.config,
        sys,
        dirname(tsconfigPath)
      )

      outDir = tsconfig.options.outDir

      enableSourceMapSupport(tsconfig)
    }
    let start = Date.now()
    tscChild = execa('node', [tscPath, ...typescriptCliArgs], { cwd })
    tscChild.stdout.setEncoding('utf8')
    tscChild.stdout.on('data', async (data) => {
      if (data.includes('File change detected')) {
        start = Date.now()
      } else if (data.includes('Watching for file changes')) {
        pushable.push({
          type: 'test:diagnostic',
          data: {
            nesting: 0,
            message: `TypeScript compilation complete (${Date.now() - start}ms)`,
            typescriptCliArgs
          }
        })

        await postCompileFn(outDir)

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
    // We must noop `.catch()`, otherwise `tscChild` will
    // reject.
    tscChild.catch(() => {})
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

    const expandedFiles = []
    const globs = []
    for (let i = 0; i < files.length; i += 1) {
      if (files[i].includes('*') === false) {
        expandedFiles.push(files[i])
        continue
      }
      const pattern = files[i].replace(/^['"]/, '').replace(/['"]$/, '')
      if (pattern[0] === '!') {
        ignore.push(pattern.slice(1))
        continue
      }
      globs.push(pattern)
    }

    if (globs.length > 0) {
      const parsed = await glob(globs, { ignore, cwd, windowsPathsNoEscape: true })
      Array.prototype.push.apply(expandedFiles, parsed)
    }

    files = expandedFiles
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

  config.coverage = false
  stream = run(config)

  stream.on('close', () => {
    if (tscChild) {
      tscChild.kill()
    }
  })
  return stream
}
