import { ContentType, defineComponent, jsx, Slot } from '@textbus/core'
import { NullInjector, ReflectiveInjector } from '@tanbo/di'
import { boldFormatter } from '@textbus/editor'

describe('Slot 基本特性数据验证', () => {
  const injector = new ReflectiveInjector(new NullInjector(), [])
  const inlineComponent = defineComponent({
    type: ContentType.InlineComponent,
    name: 'Inline',
    setup() {
      return {
        render() {
          return jsx('div')
        }
      }
    }
  })
  const blockComponent = defineComponent({
    type: ContentType.BlockComponent,
    name: 'Block',
    setup() {
      return {
        render() {
          return jsx('div')
        }
      }
    }
  })
  test('静态属性', () => {
    expect(Slot.placeholder).toBe('\u200b')
    expect(Slot.emptyPlaceholder).toBe('\n')
  })
  test('初始值', () => {
    const slot = new Slot([])
    expect(slot.length).toBe(1)
    expect(slot.isEmpty).toBeTruthy()
    expect(slot.index).toBe(0)
  })
  test('插入拦截', () => {
    const slot = new Slot([])
    expect(slot.insert('xxx')).toBeFalsy()
    expect(slot.length).toBe(1)
    expect(slot.index).toBe(0)
    expect(slot.isEmpty).toBeTruthy()

    expect(slot.insert(inlineComponent.createInstance(injector)))
    expect(slot.length).toBe(1)
    expect(slot.index).toBe(0)
    expect(slot.isEmpty).toBeTruthy()

    expect(slot.insert(blockComponent.createInstance(injector)))
    expect(slot.length).toBe(1)
    expect(slot.index).toBe(0)
    expect(slot.isEmpty).toBeTruthy()
  })
})

describe('Slot 数据变更', () => {
  const blockComponent = defineComponent({
    type: ContentType.BlockComponent,
    name: 'Block',
    setup() {
      return {
        render() {
          return jsx('div')
        }
      }
    }
  })
  const componentInstance = blockComponent.createInstance({} as any)
  let slot: Slot
  beforeEach(() => {
    slot = new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ])
  })
  test('插入字符时，自动更新 index 和 length', () => {
    slot.insert('1')
    expect(slot.length).toBe(1)
    expect(slot.index).toBe(1)
    slot.insert('2')
    expect(slot.length).toBe(2)
    expect(slot.index).toBe(2)

    slot.insert('34')
    expect(slot.length).toBe(4)
    expect(slot.index).toBe(4)

    slot.insert(componentInstance)

    expect(slot.length).toBe(5)
    expect(slot.index).toBe(5)
  })

  test('从指定位置插入内容', () => {
    slot.insert('1234')
    slot.retain(2)
    slot.insert('xx')
    expect(slot.toString()).toBe('12xx34')
    slot.insert(componentInstance)
    expect(slot.sliceContent()).toEqual([
      '12xx', componentInstance, '34'
    ])
  })

  test('不能插入重复的组件', () => {
    slot.insert('1')
    slot.insert(componentInstance)
    slot.insert('2345')
    slot.retain(3)
    slot.insert(componentInstance)
    expect(slot.sliceContent()).toEqual([
      '123', componentInstance, '45'
    ])
  })

  test('删除内容', () => {
    slot.insert('1234')
    slot.delete(20)
    expect(slot.toString()).toBe('1234')

    slot.retain(2)
    slot.delete(20)
    expect(slot.toString()).toBe('12')

    slot.retain(0)
    slot.delete(20)
    expect(slot.toString()).toBe('\n')
    expect(slot.isEmpty).toBeTruthy()
    expect(slot.length).toBe(1)
  })
})

describe('Slot 格式应用', () => {
  const blockComponent = defineComponent({
    type: ContentType.BlockComponent,
    name: 'Block',
    setup() {
      return {
        render() {
          return jsx('div')
        }
      }
    }
  })
  const componentInstance = blockComponent.createInstance({} as any)
  let slot: Slot
  beforeEach(() => {
    slot = new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ])
  })
  test('带格式的文本', () => {
    slot.insert('123', boldFormatter, true)
    expect(slot.getFormatRangesByFormatter(boldFormatter, 0, 3)).toEqual([{
      startIndex: 0,
      endIndex: 3,
      value: true
    }])
  })
})
