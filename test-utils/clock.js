import FakeTimers from '@sinonjs/fake-timers'

let clock

if (process.argv[1].endsWith('borp.js')) {
  clock = FakeTimers.install({
    node: Date.now(),
    shouldAdvanceTime: true,
    advanceTimeDelta: 100
  })
  process.on('message', listener)
}

function listener ([fn, ...args]) {
  clock[fn](...args)
  if (fn === 'uninstall') {
    process.off('message', listener)
  }
}
