import neostandard from 'neostandard'

export default neostandard({
  ts: true,
  ignores: [
    'fixtures/**/dist/**',
    'fixtures/**/node_modules/**',
    '**/.test-*/**'
  ]
})
