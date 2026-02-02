import { run } from 'node:test'
import { glob } from 'glob'
import { join } from 'node:path'
import { execa } from 'execa'
import { Readable } from 'node:stream'

export default async function runWithTypeScript (config) {
  // This is a hack to override
  // https://github.com/nodejs/node/commit/d5c9adf3df
  delete process.env.NODE_TEST_CONTEXT

  const { cwd, watch } = config
  let files = config.files || []
  const ignore = config.ignore || []
  ignore.unshift('node_modules/**/*')

  if (files.length > 0) {
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
    files = await glob(config.pattern, { ignore, cwd, windowsPathsNoEscape: true })
  } else {
    // Discover both JavaScript and TypeScript test files
    files = await glob(join('**', '*.test.{cjs,mjs,js,ts,mts,cts}'), { ignore, cwd, windowsPathsNoEscape: true, absolute: true })
  }

  config.files = files

  // For watch mode, use Node.js native --watch flag
  if (watch) {
    const args = ['--watch', '--test', ...files]
    const child = execa('node', args, { cwd, reject: false })

    // Handle abort signal
    if (config.signal) {
      config.signal.addEventListener('abort', () => {
        child.kill()
      })
    }

    // Return a stream-like interface that emits data events from stdout
    const stream = new Readable({
      read () {}
    })

    child.stdout.on('data', (data) => {
      stream.push(data)
    })

    child.stderr.on('data', (data) => {
      stream.push(data)
    })

    child.on('exit', () => {
      stream.push(null)
    })

    // Simple compose that just returns the stream
    stream.compose = () => stream
    stream.pipe = () => stream

    return stream
  }

  config.coverage = false
  return run(config)
}
