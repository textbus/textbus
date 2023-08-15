export function replaceEmpty(s: string) {
  const empty = '\u00a0'
  return s.replace(/\s\s+/g, str => {
    return ' ' + Array.from({
      length: str.length - 1
    }).fill(empty).join('')
  }).replace(/^\s|\s$/g, empty)
}

export function createBidirectionalMapping<A extends object, B extends object>(isA: (v: A | B) => boolean) {
  const a2b = new WeakMap<A, B>()
  const b2a = new WeakMap<B, A>()

  function set(key: A, value: B): void
  function set(key: B, value: A): void
  function set(key: any, value: any) {
    if (get(key)) {
      remove(key)
    }
    if (get(value)) {
      remove(value)
    }
    if (isA(key)) {
      a2b.set(key, value)
      b2a.set(value, key)
    } else {
      a2b.set(value, key)
      b2a.set(key, value)
    }
  }

  function get(key: A): B
  function get(key: B): A
  function get(key: any) {
    if (isA(key)) {
      return a2b.get(key)
    }
    return b2a.get(key)
  }

  function remove(key: A | B) {
    if (isA(key)) {
      const v = a2b.get(key as A)!
      a2b.delete(key as A)
      b2a.delete(v)
    } else {
      const v = b2a.get(key as B)!
      b2a.delete(key as B)
      a2b.delete(v)
    }
  }

  return {
    set,
    get,
    remove
  }
}
