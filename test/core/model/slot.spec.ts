import { Component, ContentType, createVNode, FormatHostBindingRender, Formatter, PendingErasure, Slot, StackableFormatter, Textbus, VElement, VTextNode } from '@textbus/core'
import { NodeModule, NodeViewAdapter } from '@textbus/platform-node'

let textbus: Textbus

beforeAll(() => {
  textbus = new Textbus({
    imports: [
      new NodeModule(new NodeViewAdapter({}, () => {
        //
      }))
    ]
  })
})

afterAll(() => {
  textbus.destroy()
})

describe('slot 数据限制', () => {
  class Inline extends Component {
    static type = ContentType.InlineComponent
    static componentName = 'Inline'
  }

  class Block extends Component {
    static type = ContentType.BlockComponent
    static componentName = 'Block'
  }

  test('不能插入任何内容', () => {
    const slot = new Slot([])
    slot.insert('x')
    const inline = new Inline({})
    const block = new Block({})
    slot.insert(inline)
    slot.insert(block)

    expect(slot.length).toBe(1)
    expect(slot.isEmpty).toBeTruthy()
  })
  test('可插入预期内容', () => {
    const slot = new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ])
    slot.insert('x')
    const inline = new Inline({})
    const block = new Block({})
    slot.insert(inline)
    slot.insert(block)

    expect(slot.length).toBe(3)
    expect(slot.sliceContent()).toEqual(['x', inline, block])
  })
})

describe('字符串支持', () => {
  test('合并字符器', () => {
    const slot = new Slot([
      ContentType.Text
    ])
    slot.insert('1234')
    slot.insert('1234')
    expect(slot.sliceContent()).toEqual(['12341234'])
  })
  test('支持 emoji', () => {
    const slot = new Slot([
      ContentType.Text
    ])

    slot.insert('❤️❤️')
    expect(slot.length).toBe(4)
    slot.retain(1)
    slot.insert('x')
    expect(slot.sliceContent()).toEqual(['x❤️❤️'])
  })
  test('支持 emoji', () => {
    // eslint-disable-next-line max-len
    const str = '🇦🇱🇩🇿🇦🇫🇦🇷🇦🇪🇦🇼🇴🇲🇦🇿🇪🇬🇪🇹🇮🇪🇪🇪🇦🇩🇦🇴🇦🇮🇦🇬🇦🇹🇦🇽🇦🇺🇧🇧🇵🇬🇧🇸🇵🇰🇵🇾🇵🇸🇧🇭🇵🇦🇧🇷🇧🇾🇧🇲🇧🇬🇲🇵🇧🇯🇧🇪🇮🇸🇵🇷🇵🇱🇧🇦🇧🇴🇧🇿🇧🇼🇧🇹🇧🇫🇧🇮🇰🇵🇬🇶🇩🇰🇩🇪🇹🇱🇹🇬🇩🇴🇩🇲🇷🇺🇪🇨🇪🇷🇫🇷🇫🇴🇵🇫🇬🇫🇹🇫🇻🇦🇵🇭🇫🇯🇫🇮🇨🇻🇫🇰🇬🇲🇨🇬🇨🇩🇨🇴🇨🇷🇬🇩🇬🇱🇬🇪🇬🇬🇨🇺🇬🇵🇬🇺🇬🇾🇰🇿🇭🇹🇰🇷🇳🇱🇧🇶🇸🇽🇲🇪🇭🇳🇰🇮🇩🇯🇰🇬🇬🇳🇬🇼🇨🇦🇬🇭🇮🇨🇬🇦🇰🇭🇨🇿🇿🇼🇨🇲🇶🇦🇰🇾🇨🇨🇰🇲🇽🇰🇨🇮🇰🇼🇭🇷🇰🇪🇨🇰🇨🇼🇱🇻🇱🇸🇱🇦🇱🇧🇱🇹🇱🇷🇱🇾🇱🇮🇷🇪🇱🇺🇷🇼🇷🇴🇲🇬🇲🇻🇲🇹🇲🇼🇲🇾🇲🇱🇲🇰🇲🇭🇲🇶🇾🇹🇮🇲🇲🇺🇲🇷🇺🇸🇦🇸🇻🇮🇲🇳🇲🇸🇧🇩🇵🇪🇫🇲🇲🇲🇲🇩🇲🇦🇲🇨🇲🇿🇲🇽🇳🇦🇿🇦🇦🇶🇬🇸🇸🇸🇳🇷🇳🇮🇳🇵🇳🇪🇳🇬🇳🇺🇳🇴🇳🇫🇪🇺🇵🇼🇵🇳🇵🇹🇯🇵🇸🇪🇨🇭🇸🇻🇼🇸🇷🇸🇸🇱🇸🇳🇨🇾🇸🇨🇸🇦🇧🇱🇨🇽🇸🇹🇸🇭🇰🇳🇱🇨🇸🇲🇵🇲🇻🇨🇱🇰🇸🇰🇸🇮🇸🇿🇸🇩🇸🇷🇸🇧🇸🇴🇹🇯🇹🇭🇹🇿🇹🇴🇹🇨🇹🇹🇹🇳🇹🇻🇹🇷🇹🇲🇹🇰🇼🇫🇻🇺🇬🇹🇻🇪🇧🇳🇺🇬🇺🇦🇺🇾🇺🇿🇬🇷🇪🇸🇪🇭🇸🇬🇳🇨🇳🇿🇭🇺🇸🇾🇯🇲🇦🇲🇾🇪🇮🇶🇮🇷🇮🇱🇮🇹🇮🇳🇮🇩🇬🇧🇻🇬🇮🇴🇯🇴🇻🇳🇿🇲🇯🇪🇹🇩🇬🇮🇨🇱🇨🇫🇲🇴🇭🇰🇨🇳'

    const slot = new Slot([
      ContentType.Text
    ])

    slot.insert(str)

    for (let i = 0; i < str.length; i++) {
      slot.retain(i)
      expect(slot.index % 4).toEqual(0)
    }
  })
})

describe('slot 行内样式', () => {
  class Inline extends Component {
    static type = ContentType.InlineComponent
    static componentName = 'Inline'
  }

  interface BlockState {
    slot: Slot
  }

  class Block extends Component<BlockState> {
    static type = ContentType.BlockComponent
    static componentName = 'Block'

    override getSlots(): Slot[] {
      return [this.state.slot]
    }
  }

  test('合并/拆分常量样式', () => {
    const formatter = new Formatter<string>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])

    slot.insert('123456789')
    slot.retain(2)
    slot.retain(2, formatter, 'xxx')
    slot.retain(4)
    slot.retain(2, formatter, 'xxx')
    expect(slot.getFormats().length).toBe(1)
    expect(slot.getFormats()[0]).toEqual({
      startIndex: 2,
      endIndex: 6,
      value: 'xxx',
      formatter
    })
    slot.retain(4)
    slot.insert(new Inline({}))
    expect(slot.getFormats().length).toBe(2)
    expect(slot.getFormats()).toEqual([{
      startIndex: 2,
      endIndex: 4,
      value: 'xxx',
      formatter
    }, {
      startIndex: 5,
      endIndex: 7,
      value: 'xxx',
      formatter
    }])
  })
  test('合并/拆分复杂样式', () => {
    interface TestFormatValue {
      a: string
      b: number
      c: number
    }

    const formatter = new Formatter<TestFormatValue>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: TestFormatValue): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])

    slot.insert('123456789')
    slot.retain(2)
    slot.retain(2, formatter, {
      a: 'a',
      b: 1,
      c: 2
    })
    slot.retain(4)
    slot.retain(2, formatter, {
      a: 'a',
      b: 1,
      c: 2
    })
    expect(slot.getFormats().length).toBe(1)
    expect(slot.getFormats()[0]).toEqual({
      startIndex: 2,
      endIndex: 6,
      value: {
        a: 'a',
        b: 1,
        c: 2
      },
      formatter
    })
    slot.retain(4)
    slot.insert(new Inline({}))
    expect(slot.getFormats().length).toBe(2)
    expect(slot.getFormats()).toEqual([{
      startIndex: 2,
      endIndex: 4,
      value: {
        a: 'a',
        b: 1,
        c: 2
      },
      formatter
    }, {
      startIndex: 5,
      endIndex: 7,
      value: {
        a: 'a',
        b: 1,
        c: 2
      },
      formatter
    }])
  })
  test('行内组件可应用样式', () => {
    const slot = new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])
    const formatter = new Formatter<string>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const inline = new Inline({})
    slot.insert('1234')
    slot.insert(inline)
    slot.insert('5678')
    slot.applyFormat(formatter, {
      startIndex: 0,
      endIndex: 8,
      value: 'xxx'
    })

    expect(slot.getFormats().length).toBe(1)
  })
  test('块级组件不可应用样式', () => {
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent
    ])
    const formatter = new Formatter<string>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const block = new Block({ slot: new Slot([ContentType.Text]) })
    slot.insert('1234')
    slot.insert(block)
    slot.insert('5678')
    slot.applyFormat(formatter, {
      startIndex: 0,
      endIndex: 8,
      value: 'xxx'
    })

    expect(slot.getFormats().length).toBe(2)
    expect(slot.getFormats()).toEqual([
      {
        startIndex: 0,
        endIndex: 4,
        value: 'xxx',
        formatter
      },
      {
        startIndex: 5,
        endIndex: 8,
        value: 'xxx',
        formatter
      }
    ])
    expect(block.state.slot.getFormats()).toEqual([{
      startIndex: 0,
      endIndex: 1,
      value: 'xxx',
      formatter
    }])
  })
})

describe('样式范围自动更新', () => {
  class Inline extends Component {
    static type = ContentType.InlineComponent
    static componentName = 'Inline'
  }

  test('样式跟随内容', () => {
    const formatter = new Formatter<string>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])
    slot.insert('12345', [
      [formatter, 'xxx']
    ])

    expect(slot.getFormats()).toEqual([{
      startIndex: 0,
      endIndex: 5,
      formatter,
      value: 'xxx'
    }])

    slot.retain(3)
    slot.delete(1)
    expect(slot.getFormats()).toEqual([{
      startIndex: 0,
      endIndex: 4,
      formatter,
      value: 'xxx'
    }])
  })
  test('组件删除样式合并', () => {
    const formatter = new Formatter<string>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const inline = new Inline({})
    const slot = new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])
    slot.insert('12345', [
      [formatter, 'xxx']
    ])
    slot.insert(inline)

    slot.insert('678', formatter, 'xxx')

    expect(slot.getFormats().length).toBe(2)

    slot.retain(5)
    slot.delete(1)
    expect(slot.getFormats()).toEqual([{
      startIndex: 0,
      endIndex: 8,
      formatter,
      value: 'xxx'
    }])
  })
  test('写入内容自动扩展样式', () => {
    const formatter = new Formatter<string>('format', {
      render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
        return createVNode('span', { test: formatValue }, children)
      }
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])
    slot.insert('12345', [
      [formatter, 'xxx']
    ])
    slot.write('6')
    expect(slot.getFormats()).toEqual([{
      startIndex: 0,
      endIndex: 6,
      formatter,
      value: 'xxx'
    }])
  })
})

describe('根据内容生成渲染树', () => {
  const bold = new Formatter<boolean>('strong', {
    render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
      return createVNode('strong', null, children)
    }
  })
  const fontSize = new Formatter<string>('strong', {
    render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
      return {
        fallbackTagName: 'span',
        attach(host: VElement) {
          host.styles.set('fontSize', formatValue)
        }
      }
    }
  })

  test('可正确嵌套', () => {
    const slot = new Slot([
      ContentType.Text
    ])

    slot.insert('123456')
    slot.applyFormat(bold, {
      startIndex: 1,
      endIndex: 5,
      value: true
    })
    slot.applyFormat(fontSize, {
      startIndex: 2,
      endIndex: 4,
      value: '12px'
    })
    const tree = slot.toTree(children => {
      return createVNode('div', null, children)
    })
    expect(tree.children.length).toBe(3)
    expect(tree.children[0]).toHaveProperty('textContent', '1')
    expect(tree.children[1]).toHaveProperty('tagName', 'strong')
    expect(tree.children[2]).toHaveProperty('textContent', '6')

    const strong = tree.children[1] as VElement

    expect(strong.children[0]).toHaveProperty('textContent', '2')
    expect(strong.children[1]).toHaveProperty('tagName', 'span')
    expect((strong.children[1] as VElement).styles.get('fontSize')).toBe('12px')
    expect(strong.children[2]).toHaveProperty('textContent', '5')
  })

  test('复用标签', () => {
    const slot = new Slot([
      ContentType.Text
    ])

    slot.insert('123456')
    slot.applyFormat(bold, {
      startIndex: 1,
      endIndex: 5,
      value: true
    })
    slot.applyFormat(fontSize, {
      startIndex: 1,
      endIndex: 5,
      value: '12px'
    })
    const tree = slot.toTree(children => {
      return createVNode('div', null, children)
    })
    expect(tree.children.length).toBe(3)
    expect(tree.children[0]).toHaveProperty('textContent', '1')
    expect(tree.children[1]).toHaveProperty('tagName', 'strong')
    expect((tree.children[1] as VElement).styles.get('fontSize')).toBe('12px')
    expect(tree.children[2]).toHaveProperty('textContent', '6')

    const strong = tree.children[1] as VElement

    expect(strong.children[0]).toHaveProperty('textContent', '2345')
  })
})

describe('可堆叠格式', () => {
  const commentFormatter = new StackableFormatter<string>('comment', {
    render(children: any, value: string) {
      return createVNode('span', {
        'data-data': value
      }, children)
    }
  })

  test('相同 Formatter 上可并存不同取值（同一段文本多次批注）', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.applyFormat(commentFormatter, { startIndex: 1, endIndex: 4, value: 'note-a' })
    slot.applyFormat(commentFormatter, { startIndex: 1, endIndex: 4, value: 'note-b' })
    const ranges = slot.getFormatRangesByFormatter(commentFormatter, 0, slot.length)
    expect(ranges.length).toBe(2)
    const values = ranges.map(r => r.value).sort()
    expect(values).toEqual(['note-a', 'note-b'])
    ranges.forEach(r => {
      expect(r.startIndex).toBe(1)
      expect(r.endIndex).toBe(4)
    })
  })

  test('相同取值在重叠区间上自动合并为一段', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('hello')
    slot.applyFormat(commentFormatter, { startIndex: 0, endIndex: 2, value: 'same' })
    slot.applyFormat(commentFormatter, { startIndex: 1, endIndex: 3, value: 'same' })
    const ranges = slot.getFormatRangesByFormatter(commentFormatter, 0, slot.length)
    expect(ranges.length).toBe(1)
    expect(ranges[0]).toMatchObject({
      startIndex: 0,
      endIndex: 3,
      value: 'same'
    })
  })

  test('PendingErasure(false, value) 可按指定取值擦除，其它堆叠段保留', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcdef')
    slot.applyFormat(commentFormatter, { startIndex: 0, endIndex: 2, value: 'keep-me' })
    slot.applyFormat(commentFormatter, { startIndex: 2, endIndex: 4, value: 'remove-me' })
    slot.applyFormat(commentFormatter, { startIndex: 4, endIndex: 6, value: 'also-keep' })
    slot.retain(0)
    slot.retain(6, commentFormatter, new PendingErasure(false, 'remove-me'))
    const ranges = slot.getFormatRangesByFormatter(commentFormatter, 0, slot.length)
    expect(ranges.length).toBe(2)
    const sorted = [...ranges].sort((a, b) => a.startIndex - b.startIndex)
    expect(sorted[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 'keep-me' })
    expect(sorted[1]).toMatchObject({ startIndex: 4, endIndex: 6, value: 'also-keep' })
  })

  test('null 在可堆叠格式上整段清除该 Formatter 全部区间', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.applyFormat(commentFormatter, { startIndex: 0, endIndex: 2, value: 'x' })
    slot.applyFormat(commentFormatter, { startIndex: 1, endIndex: 3, value: 'y' })
    expect(slot.getFormatRangesByFormatter(commentFormatter, 0, slot.length).length).toBeGreaterThan(0)
    slot.retain(0)
    slot.retain(3, commentFormatter, null)
    expect(slot.getFormatRangesByFormatter(commentFormatter, 0, slot.length).length).toBe(0)
  })

  test('cleanFormatter 可用 PendingErasure 按值擦除', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcd')
    slot.applyFormat(commentFormatter, { startIndex: 0, endIndex: 2, value: 't1' })
    slot.applyFormat(commentFormatter, { startIndex: 0, endIndex: 2, value: 't2' })
    slot.cleanFormatter(commentFormatter, 0, 2, new PendingErasure(false, 't1'))
    const ranges = slot.getFormatRangesByFormatter(commentFormatter, 0, slot.length)
    expect(ranges.length).toBe(1)
    expect(ranges[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 't2' })
  })
})

