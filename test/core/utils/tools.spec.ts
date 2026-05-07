import { createBidirectionalMapping, replaceEmpty } from '@textbus/core'

describe('replaceEmpty', () => {
  test('将连续空白替换为不间断空格间隔', () => {
    expect(replaceEmpty('a  b')).toBe(`a ${'\u00a0'}b`)
  })

  test('首尾空白替换为不间断空格', () => {
    expect(replaceEmpty(' x ')).toBe(`${'\u00a0'}x${'\u00a0'}`)
  })
})

describe('createBidirectionalMapping', () => {
  class Key {}
  class Val {}

  test('set/get 双向查找', () => {
    const { set, get } = createBidirectionalMapping<Key, Val>(v => v instanceof Key)
    const k = new Key()
    const v = new Val()
    set(k, v)
    expect(get(k)).toBe(v)
    expect(get(v)).toBe(k)
  })

  test('覆盖写入会先移除旧关联', () => {
    const { set, get } = createBidirectionalMapping<Key, Val>(v => v instanceof Key)
    const k1 = new Key()
    const k2 = new Key()
    const v = new Val()
    set(k1, v)
    set(k2, v)
    expect(get(k1)).toBeUndefined()
    expect(get(k2)).toBe(v)
    expect(get(v)).toBe(k2)
  })

  test('remove 清理一侧映射', () => {
    const { set, get, remove } = createBidirectionalMapping<Key, Val>(v => v instanceof Key)
    const k = new Key()
    const v = new Val()
    set(k, v)
    remove(k)
    expect(get(k)).toBeUndefined()
    expect(get(v)).toBeUndefined()
  })
})
