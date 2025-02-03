export function sleep(time = 1) {
  jest.useFakeTimers()
  const p = new Promise<void>(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
  jest.advanceTimersByTime(time)
  return p
}
