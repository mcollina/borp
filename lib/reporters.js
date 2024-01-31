import { Transform } from 'node:stream'
import { fileURLToPath } from 'node:url'

function normalizeFile (file, cwd) {
  let res = file
  if (file.startsWith('file://')) {
    try {
      res = fileURLToPath(new URL(file))
    } catch (err) {
      if (err.code === 'ERR_INVALID_FILE_URL_PATH') {
        res = fileURLToPath(new URL(file.replace('file:///', 'file://')))
      }
    }
  }
  res = res.replace(cwd, '')
  if (res.startsWith('/') || res.startsWith('\\')) {
    res = res.slice(1)
  }
  return res
}

function eventToLine (event) {
  return `* __${event.data.name}__, duration ${event.data.details.duration_ms}ms, line ${event.data.line}\n`
}

export class MarkdownReporter extends Transform {
  constructor (opts) {
    super({
      ...opts,
      objectMode: true
    })

    this._files = {}
    this._cwd = opts?.cwd
  }

  getFile (path) {
    const file = this._files[path] || {
      pass: [],
      fail: []
    }
    this._files[path] = file
    return file
  }

  _transform (event, encoding, callback) {
    if (!event.data.file) {
      callback()
      return
    }

    const path = normalizeFile(event.data.file, this._cwd)
    const file = this.getFile(path)
    switch (event.type) {
      case 'test:pass':
        file.pass.push(event)
        break
      case 'test:fail':
        file.fail.push(event)
        break
    }

    callback()
  }

  _flush (callback) {
    this.push('# Summary\n')
    for (const [path, file] of Object.entries(this._files)) {
      this.push(`## ${path}\n`)
      if (file.pass.length > 0) {
        this.push('### :white_check_mark: Pass\n')
        for (const event of file.pass) {
          this.push(eventToLine(event))
        }
      }
      if (file.fail.length > 0) {
        this.push('### :x: Fail\n')
        for (const event of file.fail) {
          this.push(eventToLine(event))
        }
      }
    }
    this.push(null)
    callback()
  }
}

export class GithubWorkflowFailuresReporter extends Transform {
  constructor (opts) {
    super({
      ...opts,
      objectMode: true
    })

    this._files = {}
    this._cwd = opts?.cwd
  }

  _transform (event, encoding, callback) {
    if (!event.data.file) {
      callback()
      return
    }

    const path = normalizeFile(event.data.file, this._cwd)
    switch (event.type) {
      case 'test:fail':
        this.push(`::error file=${path},line=${event.data.line}::${event.data.name}\n`)
        break
    }

    callback()
  }
}
