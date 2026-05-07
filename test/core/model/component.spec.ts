import { Component, ContentType, Slot } from '@textbus/core'

class Demo extends Component<{ title: string; count: number }> {
  static componentName = 'Demo'
  static type = ContentType.InlineComponent
}

describe('Component', () => {
  test('toJSON 包含组件名与状态字面量', () => {
    const c = new Demo({ title: 't', count: 2 })
    expect(c.toJSON()).toEqual({
      name: 'Demo',
      state: { title: 't', count: 2 }
    })
  })

  test('length 恒为 1，slots 默认空数组', () => {
    const c = new Demo({ title: '', count: 0 })
    expect(c.length).toBe(1)
    expect(c.slots).toEqual([])
    expect(c.toString()).toBe('')
  })

  test('可通过 getSlots 暴露插槽', () => {
    class WithSlot extends Component<{ n: number }> {
      static componentName = 'WithSlot'
      static type = ContentType.BlockComponent
      constructor() {
        super({ n: 1 })
      }
      override getSlots(): Slot[] {
        return []
      }
    }
    const w = new WithSlot()
    expect(w.slots).toEqual([])
  })
})
