import {
  arrayToJSON,
  ContentType,
  getStringType,
  hasOwn,
  isType,
  objectToJSON,
  Slot,
  valueToJSON
} from '@textbus/core'

describe('observable/util', () => {
  test('hasOwn', () => {
    expect(hasOwn({ a: 1 }, 'a')).toBe(true)
    expect(hasOwn({ a: 1 }, 'b')).toBe(false)
  })

  test('getStringType / isType', () => {
    expect(getStringType([])).toBe('[object Array]')
    expect(isType({}, 'Object')).toBe(true)
    expect(isType([], 'Array')).toBe(true)
  })

  test('objectToJSON 与 arrayToJSON 递归字面量', () => {
    expect(objectToJSON({ x: 1, y: [2, 3] })).toEqual({ x: 1, y: [2, 3] })
    expect(arrayToJSON([1, { a: 2 }])).toEqual([1, { a: 2 }])
  })

  test('valueToJSON 遇到 Slot 时调用 toJSON', () => {
    const slot = new Slot([ContentType.Text])
    slot.write('ok')
    expect(valueToJSON(slot)).toEqual(slot.toJSON())
  })
})
