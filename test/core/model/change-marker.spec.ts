import { ChangeMarker, Component, Operation } from '@textbus/core'

describe('ChangeMarker 基本状态', () => {
  let changeMarker: ChangeMarker
  beforeEach(() => {
    changeMarker = new ChangeMarker()
  })
  test('验证初始状态', () => {
    expect(changeMarker.changed).toBeTruthy()
    expect(changeMarker.dirty).toBeTruthy()
    expect(changeMarker.outputChanged).toBeTruthy()
    expect(changeMarker.outputDirty).toBeTruthy()
  })
  test('验证编辑状态数据变化', () => {
    changeMarker.rendered()
    expect(changeMarker.changed).toBeFalsy()
    expect(changeMarker.dirty).toBeFalsy()
  })

  test('验证输出状态数据变化', () => {
    changeMarker.outputRendered()
    expect(changeMarker.outputChanged).toBeFalsy()
    expect(changeMarker.outputDirty).toBeFalsy()
  })
})

describe('ChangeMarker 编辑模式变化标记', () => {
  let changeMarker: ChangeMarker
  const testOperation: Operation = {
    path: [],
    apply: [],
    unApply: []
  }
  beforeEach(() => {
    changeMarker = new ChangeMarker()
    changeMarker.rendered()
    changeMarker.outputRendered()
  })

  test('验证初始状态', () => {
    expect(changeMarker.changed).toBeFalsy()
    expect(changeMarker.dirty).toBeFalsy()
  })

  test('数据变化标记', () => {
    changeMarker.markAsChanged(testOperation)
    expect(changeMarker.dirty).toBeFalsy()
    expect(changeMarker.changed).toBeTruthy()
  })

  test('数据脏标记', () => {
    changeMarker.markAsDirtied(testOperation)
    expect(changeMarker.dirty).toBeTruthy()
    expect(changeMarker.changed).toBeTruthy()
  })
})

describe('ChangeMarker 输出模式变化标记', () => {
  let changeMarker: ChangeMarker
  const testOperation: Operation = {
    path: [],
    apply: [],
    unApply: []
  }
  beforeEach(() => {
    changeMarker = new ChangeMarker()
    changeMarker.rendered()
    changeMarker.outputRendered()
  })

  test('验证初始状态', () => {
    expect(changeMarker.outputChanged).toBeFalsy()
    expect(changeMarker.outputDirty).toBeFalsy()
  })

  test('数据变化标记', () => {
    changeMarker.markAsChanged(testOperation)
    expect(changeMarker.outputDirty).toBeFalsy()
    expect(changeMarker.outputChanged).toBeTruthy()
  })

  test('数据脏标记', () => {
    changeMarker.markAsDirtied(testOperation)
    expect(changeMarker.outputDirty).toBeTruthy()
    expect(changeMarker.outputChanged).toBeTruthy()
  })
})

describe('ChangeMarker 强制标记', () => {
  let changeMarker: ChangeMarker
  beforeEach(() => {
    changeMarker = new ChangeMarker()
    changeMarker.rendered()
    changeMarker.outputRendered()
  })

  test('验证初始状态', () => {
    expect(changeMarker.changed).toBeFalsy()
    expect(changeMarker.dirty).toBeFalsy()
  })

  test('数据变化标记', () => {
    changeMarker.forceMarkChanged()
    expect(changeMarker.dirty).toBeFalsy()
    expect(changeMarker.changed).toBeTruthy()
  })

  test('数据脏标记', () => {
    changeMarker.forceMarkDirtied()
    expect(changeMarker.dirty).toBeTruthy()
    expect(changeMarker.changed).toBeTruthy()
  })
})

describe('ChangeMarker 重置状态', () => {
  let changeMarker: ChangeMarker
  beforeEach(() => {
    changeMarker = new ChangeMarker()
    changeMarker.rendered()
    changeMarker.outputRendered()
  })

  test('验证初始状态', () => {
    expect(changeMarker.changed).toBeFalsy()
    expect(changeMarker.dirty).toBeFalsy()
  })

  test('验证重置状态', () => {
    changeMarker.reset()
    expect(changeMarker.dirty).toBeTruthy()
    expect(changeMarker.changed).toBeTruthy()
    expect(changeMarker.outputDirty).toBeTruthy()
    expect(changeMarker.outputChanged).toBeTruthy()
  })
})

describe('ChangeMarker 事件', () => {
  let changeMarker: ChangeMarker
  const testOperation: Operation = {
    path: [],
    apply: [],
    unApply: []
  }
  beforeEach(() => {
    changeMarker = new ChangeMarker()
  })

  test('数据变化事件', () => {
    let operation!: Operation
    changeMarker.onChange.subscribe(v => {
      operation = v
    })
    changeMarker.markAsChanged(testOperation)
    expect(operation).toEqual(testOperation)
  })

  test('数据脏事件', () => {
    let operation!: Operation
    changeMarker.onChange.subscribe(v => {
      operation = v
    })
    changeMarker.markAsDirtied(testOperation)
    expect(operation).toEqual(testOperation)
  })

  test('强制数据变化事件', () => {
    changeMarker.rendered()
    const source = {}
    let result: any
    changeMarker.onForceChange.subscribe(() => {
      result = source
    })
    changeMarker.forceMarkChanged()
    expect(result).toStrictEqual(source)
  })

  test('强制数据脏事件', () => {
    changeMarker.rendered()
    const source = {}
    let result: any
    changeMarker.onForceChange.subscribe(() => {
      result = source
    })
    changeMarker.forceMarkDirtied()
    expect(result).toStrictEqual(source)
  })

  test('子组件删除事件', () => {
    const source = {} as Component
    let result: any
    changeMarker.onChildComponentRemoved.subscribe(() => {
      result = source
    })
    changeMarker.recordComponentRemoved(source)
    expect(result).toEqual(source)
  })

  test('不重复发送事件', () => {
    changeMarker.forceMarkChanged()
    const source: any = {}
    let result: any
    changeMarker.onForceChange.subscribe(() => {
      result = source
    })
    changeMarker.forceMarkChanged()
    expect(result).toBeUndefined()
  })

  test('不重复发送事件', () => {
    changeMarker.forceMarkDirtied()
    const source: any = {}
    let result: any
    changeMarker.onForceChange.subscribe(() => {
      result = source
    })
    changeMarker.forceMarkDirtied()
    expect(result).toBeUndefined()
  })
})
