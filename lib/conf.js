import { cwd } from 'node:process'
import { open, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import YAML from 'yaml'

async function readYamlFile () {
  let target
  let fd
  if (process.env.BORP_CONF_FILE) {
    target = process.env.BORP_CONF_FILE
    try {
      fd = await open(target, 'r')
    } catch {
      return
    }
  } else {
    const CWD = cwd()
    try {
      target = join(CWD, '.borp.yaml')
      fd = await open(target, 'r')
    } catch {
      target = join(CWD, '.borp.yml')
      try {
        fd = await open(target, 'r')
      } catch {
        // Neither file is available. If we had an application logger that writes
        // to stderr, we'd log an error message. But, as it is, we will just
        // assume that all errors are "file does not exist.""
        return
      }
    }
  }

  let fileData
  try {
    fileData = await readFile(fd, { encoding: 'utf8' })
  } catch {
    // Same thing as noted above. Skip it.
    return
  } finally {
    await fd.close()
  }

  return fileData
}

async function loadConfig () {
  const result = []
  const fileData = await readYamlFile()
  if (typeof fileData !== 'string') {
    return result
  }

  let options
  try {
    options = YAML.parse(fileData)
  } catch {
    // We just don't care.
    return result
  }

  if (options.reporters) {
    for (const reporter of options.reporters) {
      result.push('--reporter')
      result.push(reporter)
    }
  }

  // Append files AFTER all other supported config keys. The runner expects
  // them as positional parameters.
  if (options.files) {
    for (const file of options.files) {
      result.push(file)
    }
  }

  return result
}

export default loadConfig
