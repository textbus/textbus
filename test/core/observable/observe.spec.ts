import { ChangeMarker, Model, observe as obs, Operation, ProxyModel, toRaw } from '@textbus/core'

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

  test('getOwnPropertyDescriptor 与属性访问一致（可观察引用）', () => {
    const model = observe({
      nested: { x: 1 }
    })
    const d = Object.getOwnPropertyDescriptor(model, 'nested')!
    expect(d!.value).toBe(model.nested)
    expect((d!.value as Model).__changeMarker__).toBeInstanceOf(ChangeMarker)

    const arr = observe([{}] as object[])
    const id = Object.getOwnPropertyDescriptor(arr, '0')!
    expect(id!.value).toBe(arr[0])
    expect((id!.value as Model).__changeMarker__).toBeInstanceOf(ChangeMarker)
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
    const model = observe({
      a: [{ x: 1 }],
      b: [{ y: 2 }]
    })
    const out = model.a.concat(model.b as any)
    expect((out as any).__changeMarker__).toBeUndefined()
    expect(Array.isArray(out)).toBe(true)
    expect(out[0].__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(out[1].__changeMarker__).toBeInstanceOf(ChangeMarker)
  })

  test('Array copyWithin', () => {
    const model = observe([1, 2, 3, 4] as number[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.copyWithin(0, 2, 4)
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'delete', 'insert'])
    expect(model).toEqual([3, 4, 3, 4])
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
    const model = observe([0, 0, 0] as number[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.fill(9, 0, 2)
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'delete', 'insert'])
    expect(model).toEqual([9, 9, 0])
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
    expect(c.__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(c.__changeMarker__.parentModel).toBeNull()
    expect(toRaw(c as object)).toBe(child)
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
    const model = observe({
      arr: [{ n: 1 }, { n: 2 }]
    })
    const sum = model.arr.reduce((acc, cur) => {
      expect(cur.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return acc + cur.n
    }, 0)
    expect(sum).toBe(3)
    const noInitial = (model.arr as any).reduce((acc: any, cur: any) => {
      expect(acc.__changeMarker__).toBeInstanceOf(ChangeMarker)
      expect(cur.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return acc.n + cur.n
    })
    expect(noInitial).toBe(3)
  })

  test('Array reduceRight', () => {
    const model = observe({
      arr: [{ n: 1 }, { n: 2 }]
    })
    const sum = model.arr.reduceRight((acc, cur) => {
      expect(cur.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return acc + cur.n
    }, 0)
    expect(sum).toBe(3)
  })


  test('Array reverse', () => {
    const model = observe([1, 2, 3] as number[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.reverse()
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'delete', 'insert'])
    expect(model).toEqual([3, 2, 1])
  })

  test('Array shift', () => {
    const child = {}
    const model = observe({
      arr: [child, {}]
    })
    const first = model.arr.at(0)!
    const fn = jest.fn()
    first.__changeMarker__.addDetachCallback(fn)
    const c = model.arr.shift()!
    expect(c.__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(toRaw(c as object)).toBe(child)
    expect(fn).toBeCalledTimes(1)
    expect(model.arr.length).toBe(1)
  })

  test('Array slice', () => {
    const model = observe({
      arr: [{}, {}]
    })
    const out = model.arr.slice()
    expect((out as any).__changeMarker__).toBeUndefined()
    expect(out[0].__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(out[1].__changeMarker__).toBeInstanceOf(ChangeMarker)
  })

  test('Array some', () => {
    const model = observe({
      arr: [{}, {}]
    })
    expect(model.arr.some(v => {
      expect(v.__changeMarker__).toBeInstanceOf(ChangeMarker)
      return false
    })).toBe(false)
    expect(model.arr.some(v => v === model.arr.at(0))).toBe(true)
  })

  test('Array sort', () => {
    const model = observe([3, 1, 2] as number[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.sort()
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'delete', 'insert'])
    expect(model).toEqual([1, 2, 3])
  })

  test('Array splice', () => {
    const model = observe([0, 1, 2, 3] as (number | string)[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.splice(1, 2, 'a', 'b')
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'delete', 'insert'])
    expect(ops[0].unApply.map(a => a.type)).toEqual(['retain', 'delete', 'insert'])
    expect(model).toEqual([0, 'a', 'b', 3])
  })

  test('稀疏数组已定义下标读取为代理对象', () => {
    const raw: Array<Record<string, unknown> | undefined> = []
    raw[2] = { x: 1 }
    const model = observe(raw)
    expect(model[2]!.__changeMarker__).toBeInstanceOf(ChangeMarker)
  })


  test('Array toLocaleString', () => {
    const model = observe({
      arr: [1, 2]
    })
    expect(model.arr.toLocaleString()).toBe([1, 2].toLocaleString())
  })

  test('Array toReversed', () => {
    const model = observe({
      arr: [{ v: 1 }, { v: 2 }]
    })
    const out = model.arr.toReversed()
    expect((out as any).__changeMarker__).toBeUndefined()
    expect(out[0].v).toBe(2)
    expect(out[1].v).toBe(1)
    expect(out[0].__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.arr[0].v).toBe(1)
  })

  test('Array toSorted', () => {
    const model = observe({
      arr: [{ v: 3 }, { v: 1 }]
    })
    const out = model.arr.toSorted((a, b) => a.v - b.v)
    expect((out as any).__changeMarker__).toBeUndefined()
    expect(out.map((x: { v: number }) => x.v)).toEqual([1, 3])
    expect(out[0].__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.arr.map(x => x.v)).toEqual([3, 1])
  })

  test('Array toSpliced', () => {
    const model = observe([1, 2, 3] as number[])
    const out = model.toSpliced(1, 1, 9)
    expect((out as any).__changeMarker__).toBeUndefined()
    expect(out).toEqual([1, 9, 3])
    expect(model).toEqual([1, 2, 3])
  })

  test('Array toString', () => {
    const model = observe({
      arr: [1, 2]
    })
    expect(model.arr.toString()).toBe('1,2')
  })

  test('Array unshift', () => {
    const model = observe({
      arr: [{}]
    })
    const ops: Operation[] = []
    const sub = model.arr.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.arr.unshift({ x: 0 } as any)
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'insert'])
    expect(model.arr.length).toBe(2)
    expect(model.arr[0].__changeMarker__).toBeInstanceOf(ChangeMarker)
  })

  test('Array values', () => {
    const model = observe({
      arr: [{}, {}]
    })
    const vals = Array.from(model.arr.values())
    expect(vals).toHaveLength(2)
    vals.forEach(v => {
      expect(v.__changeMarker__).toBeInstanceOf(ChangeMarker)
    })
  })

  test('Array with', () => {
    const model = observe({
      arr: [{ a: 1 }, { b: 2 }]
    })
    const out = model.arr.with(0, { a: 99 } as any)
    expect((out as any).__changeMarker__).toBeUndefined()
    expect(out[0].a).toBe(99)
    expect(out[0].__changeMarker__).toBeInstanceOf(ChangeMarker)
    expect(model.arr[0].a).toBe(1)
  })


  test('Array [Symbol.iterator]', () => {
    const model = observe({
      arr: [{}, {}]
    })
    let n = 0
    for (const v of model.arr) {
      n++
      expect(v.__changeMarker__).toBeInstanceOf(ChangeMarker)
    }
    expect(n).toBe(2)
  })


  test('Array length', () => {
    const model = observe([1, 2, 3] as number[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.length = 1
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'delete'])
    expect(model).toEqual([1])
  })

  test('Array length 增长', () => {
    const model = observe([1] as number[])
    const ops: Operation[] = []
    const sub = model.__changeMarker__.onChange.subscribe(op => ops.push(op))
    model.length = 3
    sub.unsubscribe()
    expect(ops).toHaveLength(1)
    expect(ops[0].apply.map(a => a.type)).toEqual(['retain', 'insert'])
    expect(model.length).toBe(3)
    expect(model[0]).toBe(1)
  })


  test('Array keys 与 length 一致', () => {
    const raw: number[] = []
    raw[2] = 3
    const model = observe(raw)
    expect(model.length).toBe(3)
    expect(Array.from(model.keys())).toEqual([0, 1, 2])
  })
})
