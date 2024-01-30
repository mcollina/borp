import { MarkdownReporter, GithubWorkflowFailuresReporter } from '../lib/reporters.js'
import { test, describe } from 'node:test'
import { strictEqual } from 'node:assert'

describe('MarkdownReporter', async () => {
  test('should write a report', async () => {
    const reporter = new MarkdownReporter({ cwd: '/foo' })

    // This is skipped
    reporter.write({
      type: 'test:start',
      data: {}
    })

    reporter.write({
      type: 'test:pass',
      data: {
        name: 'add',
        file: 'file:///foo/test/add.test.ts',
        line: 1,
        details: {
          duration_ms: 100
        }
      }
    })

    reporter.write({
      type: 'test:pass',
      data: {
        name: 'add2',
        file: 'file:///foo/test/add.test.ts',
        line: 2,
        details: {
          duration_ms: 100
        }
      }
    })

    reporter.write({
      type: 'test:fail',
      data: {
        name: 'add3',
        file: 'file:///foo/test/add.test.ts',
        line: 10,
        details: {
          duration_ms: 100
        }
      }
    })
    reporter.end()

    let output = ''
    for await (const chunk of reporter) {
      output += chunk
    }

    strictEqual(output.replace('\\\\', '/'), `# Summary
## test/add.test.ts
### :white_check_mark: Pass
* __add__, duration 100ms, line 1
* __add2__, duration 100ms, line 2
### :x: Fail
* __add3__, duration 100ms, line 10
`)
  })

  test('skip fail heading if no failing tests', async () => {
    const reporter = new MarkdownReporter({ cwd: '/foo' })

    reporter.write({
      type: 'test:pass',
      data: {
        name: 'add',
        file: 'file:///foo/test/add.test.ts',
        line: 1,
        details: {
          duration_ms: 100
        }
      }
    })

    reporter.write({
      type: 'test:pass',
      data: {
        name: 'add2',
        file: 'file:///foo/test/add.test.ts',
        line: 2,
        details: {
          duration_ms: 100
        }
      }
    })

    reporter.end()

    let output = ''
    for await (const chunk of reporter) {
      output += chunk
    }

    strictEqual(output.replace('\\\\', '/'), `# Summary
## test/add.test.ts
### :white_check_mark: Pass
* __add__, duration 100ms, line 1
* __add2__, duration 100ms, line 2
`)
  })
})

describe('GithubWorkflowFailuresReporter', async () => {
  test('should write error in github format', async () => {
    const reporter = new GithubWorkflowFailuresReporter({ cwd: '/foo' })

    // This is skipped
    reporter.write({
      type: 'test:start',
      data: {}
    })

    reporter.write({
      type: 'test:pass',
      data: {
        name: 'add',
        file: 'file:///foo/test/add.test.ts',
        line: 1,
        details: {
          duration_ms: 100
        }
      }
    })

    reporter.write({
      type: 'test:fail',
      data: {
        name: 'add2',
        file: 'file:///foo/test/add.test.ts',
        line: 2,
        details: {
          duration_ms: 100
        }
      }
    })

    reporter.write({
      type: 'test:fail',
      data: {
        name: 'add3',
        file: 'file:///foo/test/add.test.ts',
        line: 10,
        details: {
          duration_ms: 100
        }
      }
    })
    reporter.end()

    let output = ''
    for await (const chunk of reporter) {
      output += chunk
    }

    const expected = [
      '::error file=test/add.test.ts,line=2::add2\n',
      '::error file=test/add.test.ts,line=10::add3\n'
    ].join('')

    strictEqual(output.replace('\\\\', '/'), expected)
  })
})
