import { ChangeMarker, Model, observe as obs, ProxyModel } from '@textbus/core'

const observe = obs as <T extends object>(v: T) => ProxyModel<T>

describe('observe', () => {
  test('支持普通对象、数组', () => {
    expect(observe({}).__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(observe([]).__changeMarker__).toBeInstanceOf(ChangeMarker)
  })

  test('支持对象嵌套', () => {
    const model = observe({
      a: {
        aa: {}
      },
      b: [{
        bb: 'bb'
      }]
    })
    expect(model.a.__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.a.aa.__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.b.__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.b[0].__changeMarker__).toBeInstanceOf(ChangeMarker)

    expect(model.a.__changeMarker__.parentModel).toBe(model)
    expect(model.a.aa.__changeMarker__.parentModel).toBe(model.a)
    expect(model.b.__changeMarker__.parentModel).toBe(model)
    expect(model.b[0].__changeMarker__.parentModel).toBe(model.b)
  })
})

describe('数据原型方法', () => {

  test('Array at', () => {
    const model = observe({
      arr: [{}, {}]
    })

    expect(model.arr.at(0)?.__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.arr.at(2)).toBeUndefined()
  })

  test('Array concat', () => {

  })

  test('Array copyWithin', () => {

  })

  test('Array entries', () => {
    const model = observe({
      arr: [{}, {}]
    })

    for (const item of model.arr.entries()) {
      expect(item[1].__changeMarker__).toBeInstanceOf(ChangeMarker)
    }
  })

  test('Array every', () => {
    const model = observe({
      arr: [{}, {}]
    })

    model.arr.every(v => {
      expect(v.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return false
    })
  })

  test('Array fill', () => {

  })

  test('Array filter', () => {
    const model = observe({
      arr: [{}, {}]
    })
    model.arr.filter(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return false
    })
  })

  test('Array find', () => {
    const child = {}
    const model = observe({
      arr: [{}, child]
    })

    expect(model.arr.find(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return i === child
    })).toBeUndefined()
    const item = model.arr.at(1)
    expect(model.arr.find(i => {
      return i === item
    })).toBe(item)
  })


  test('Array findIndex', () => {
    const child = {}
    const model = observe({
      arr: [{}, child]
    })
    expect(model.arr.findIndex(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return i === child
    })).toBe(-1)

    const item = model.arr.at(1)
    expect(model.arr.findIndex(i => {
      return i === item
    })).toBe(1)
  })


  test('Array flat', () => {
    const model = observe({
      arr: [{}, [{}]]
    })
    const arr = model.arr.flat()
    arr.forEach(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
    })
    expect(arr.length).toBe(2)
  })

  test('Array flatMap', () => {
    const model = observe({
      arr: [{}, [{}]]
    })
    const arr = model.arr.flatMap(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return 1
    })

    expect(arr.length).toBe(2)
    expect(arr).toEqual([1, 1])
  })

  test('Array forEach', () => {
    const model = observe({
      arr: [{}, {}]
    })
    model.arr.forEach(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
    })
  })

  test('Array includes', () => {
    const child = {}
    const model = observe({
      arr: [{}, child]
    })

    expect(model.arr.includes(child as any)).toBeTruthy()
    expect(model.arr.includes(model.arr.at(1) as any)).toBeTruthy()
  })

  test('Array indexOf', () => {
    const child = {}
    const model = observe({
      arr: [{}, child]
    })
    expect(model.arr.indexOf(child as any)).toBe(1)
    expect(model.arr.indexOf(model.arr.at(1) as any)).toBe(1)
  })

  test('Array join', () => {
    const model = observe({
      arr: [1, 2]
    })
    expect(model.arr.join(',')).toBe('1,2')
  })

  test('Array keys', () => {
    const model = observe({
      arr: [{}, {}]
    })
    expect(Array.from(model.arr.keys())).toEqual([0, 1])
  })

  test('Array lastIndexOf', () => {
    const child = {}
    const model = observe({
      arr: [{}, child]
    })
    expect(model.arr.lastIndexOf(child as any)).toBe(1)
    expect(model.arr.lastIndexOf(model.arr.at(1) as any)).toBe(1)
  })

  test('Array map', () => {
    const model = observe({
      arr: [{}, {}]
    })
    model.arr.map(i => {
      expect(i.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return null
    })
  })

  test('Array pop', () => {
    const child = {}
    const model = observe({
      arr: [{}, child]
    })
    const last = model.arr.at(-1)!
    const fn = jest.fn()
    last.__changeMarker__.addDetachCallback(fn)
    const c = model.arr.pop()!
    expect(c.__changeMarker__).toBeUndefined()
    expect(c).toBe(child)
    expect(fn).toBeCalledTimes(1)
  })

  test('Array push', () => {
    const child = {}
    const model = obs({
      arr: [{}]
    })
    model.arr.push(child)
    expect(model.arr.at(1)).not.toBe(child)
    expect((model.arr.at(1) as Model).__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.arr.length).toBe(2)
  })

  test('Array reduce', () => {

  })

  test('Array reduceRight', () => {

  })


  test('Array reverse', () => {

  })

  test('Array shift', () => {

  })

  test('Array slice', () => {

  })

  test('Array some', () => {

  })

  test('Array sort', () => {

  })

  test('Array splice', () => {

  })


  test('Array toLocaleString', () => {

  })

  test('Array toReversed', () => {

  })

  test('Array toSorted', () => {

  })

  test('Array toSpliced', () => {

  })

  test('Array toString', () => {

  })

  test('Array unshift', () => {

  })

  test('Array values', () => {

  })

  test('Array with', () => {

  })


  test('Array [Symbol.iterator]', () => {

  })


  test('Array length', () => {

  })


  test('Array keys', () => {

  })
})
