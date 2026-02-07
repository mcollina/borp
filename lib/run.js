import { run } from 'node:test'
import { glob } from 'glob'

export default async function runTests (config) {
  // This is a hack to override
  // https://github.com/nodejs/node/commit/d5c9adf3df
  delete process.env.NODE_TEST_CONTEXT

  const { cwd, files: inputFiles, pattern } = config
  let files = inputFiles || []
  const ignore = config.ignore || []
  ignore.unshift('node_modules/**/*')

  // Expand glob patterns in files
  if (files.length > 0) {
    const expandedFiles = []
    const globs = []
    for (let i = 0; i < files.length; i += 1) {
      if (files[i].includes('*') === false) {
        expandedFiles.push(files[i])
        continue
      }
      const cleanPattern = files[i].replace(/^['"]/, '').replace(/['"]$/, '')
      if (cleanPattern[0] === '!') {
        ignore.push(cleanPattern.slice(1))
        continue
      }
      globs.push(cleanPattern)
    }

    if (globs.length > 0) {
      const parsed = await glob(globs, { ignore, cwd, absolute: true })
      Array.prototype.push.apply(expandedFiles, parsed)
    }

    files = expandedFiles
  } else if (pattern) {
    files = await glob(pattern, { ignore, cwd, absolute: true })
  } else {
    // Auto-discovery with ignore patterns
    files = await glob('**/*.test.{js,mjs,cjs,ts,mts,cts}', { ignore, cwd, absolute: true })
  }

  return run({
    ...config,
    files: files.length > 0 ? files : undefined,
    coverage: false
  })
}
