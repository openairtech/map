const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function useTimer() {
  function cancel(name: string) {
    const t = timers.get(name)
    if (t !== undefined) {
      clearTimeout(t)
      timers.delete(name)
    }
  }

  function schedule(name: string, fn: () => void, delayMs: number) {
    cancel(name)
    timers.set(name, setTimeout(() => {
      timers.delete(name)
      fn()
    }, delayMs))
  }

  return { cancel, schedule }
}
