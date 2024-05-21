import FakeTimers from '@sinonjs/fake-timers'

let clock

if (process.argv[1].endsWith('borp.js')) {
  clock = FakeTimers.install({
    now: Date.now(),
    shouldAdvanceTime: true,
    advanceTimeDelta: 100,
    toFake: ['Date', 'setTimeout', 'clearTimeout']
  })
  process.on('message', listener)
}

function listener ([fn, ...args]) {
  clock[fn](...args)
  if (fn === 'uninstall') {
    process.off('message', listener)
  }
}
