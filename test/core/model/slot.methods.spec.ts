import {
  Attribute,
  Component,
  ContentType,
  createVNode,
  DeltaLite,
  Format,
  Formatter,
  FormatHostBindingRender,
  Slot,
  VElement,
  VTextNode
} from '@textbus/core'

function textSlot() {
  return new Slot([ContentType.Text])
}

function fullSchemaSlot() {
  return new Slot([ContentType.Text, ContentType.InlineComponent, ContentType.BlockComponent])
}

function noopAttrRender(): void {
  void 0
}

describe('Slot changeMarker', () => {
  test('实例暴露变更标记器', () => {
    const slot = textSlot()
    expect(slot.changeMarker).toBe(slot.__changeMarker__)
    expect(slot.changeMarker.host).toBe(slot)
  })
})

describe('Slot 构造与静态成员', () => {
  test('每个实例有唯一 id', () => {
    const a = textSlot()
    const b = textSlot()
    expect(typeof a.id).toBe('number')
    expect(a.id).not.toBe(b.id)
  })

  test('schema 按枚举值排序', () => {
    const slot = new Slot([ContentType.BlockComponent, ContentType.Text])
    expect(slot.schema).toEqual([ContentType.Text, ContentType.BlockComponent])
  })

  test('placeholder / emptyPlaceholder', () => {
    expect(Slot.placeholder).toBe('\u200b')
    expect(Slot.emptyPlaceholder).toBe('\n')
  })

  test('初始为空占位且长度为 1', () => {
    const slot = textSlot()
    expect(slot.isEmpty).toBe(true)
    expect(slot.length).toBe(1)
    expect(slot.getContentAtIndex(0)).toBe('\n')
  })

  test('state 可初始化并被 observe', () => {
    const slot = new Slot([ContentType.Text], { x: 1 })
    expect(slot.state.x).toBe(1)
  })
})

describe('Slot 父子关系', () => {
  class Block extends Component<{ slot: Slot }> {
    static type = ContentType.BlockComponent
    static componentName = 'Block'
    override getSlots() {
      return [this.state.slot]
    }
  }

  test('嵌套在组件 state 中的插槽可解析 parent', () => {
    const inner = new Slot([ContentType.Text])
    const block = new Block({ slot: inner })
    void block.state.slot
    expect(inner.parent).toBe(block)
  })

  test('文档流中的块其内层插槽的 parentSlot 为外层插槽', () => {
    const root = fullSchemaSlot()
    const inner = new Slot([ContentType.Text])
    const block = new Block({ slot: inner })
    root.insert(block)
    expect(inner.parent).toBe(block)
    expect(inner.parentSlot).toBe(root)
  })
})

describe('Slot 属性 API', () => {
  const align = new Attribute<string>('align', {
    render: noopAttrRender
  })

  test('onlySelf 不向子组件插槽扩散', () => {
    class Block extends Component<{ slot: Slot }> {
      static type = ContentType.BlockComponent
      static componentName = 'Block'
      override getSlots() {
        return [this.state.slot]
      }
    }
    const inner = textSlot()
    const block = new Block({ slot: inner })
    const outer = fullSchemaSlot()
    outer.insert(block)
    const local = new Attribute<string>('local', { onlySelf: true, render: noopAttrRender })
    outer.setAttribute(local, 'x')
    expect(outer.hasAttribute(local)).toBe(true)
    expect(inner.hasAttribute(local)).toBe(false)
  })

  test('setAttribute / getAttribute / hasAttribute / getAttributes', () => {
    const slot = textSlot()
    slot.insert('a')
    expect(slot.hasAttribute(align)).toBe(false)
    slot.setAttribute(align, 'center')
    expect(slot.hasAttribute(align)).toBe(true)
    expect(slot.getAttribute(align)).toBe('center')
    expect(slot.getAttributes().some(([k]) => k === align)).toBe(true)
  })

  test('removeAttribute 删除后可再查询', () => {
    const slot = textSlot()
    slot.insert('x')
    slot.setAttribute(align, 'left')
    slot.removeAttribute(align)
    expect(slot.hasAttribute(align)).toBe(false)
    expect(slot.getAttribute(align)).toBeNull()
  })

  test('canSet 返回 false 时不写入', () => {
    const slot = textSlot()
    slot.insert('x')
    slot.setAttribute(align, 'c', () => false)
    expect(slot.hasAttribute(align)).toBe(false)
  })

  test('checkHost 返回 false 时不写入', () => {
    const gated = new Attribute('g', {
      checkHost: () => false,
      render: noopAttrRender
    })
    const slot = textSlot()
    slot.insert('x')
    slot.setAttribute(gated, 1)
    expect(slot.hasAttribute(gated)).toBe(false)
  })

  test('removeAttribute 当不存在时直接返回', () => {
    const slot = textSlot()
    slot.insert('x')
    slot.removeAttribute(align)
    expect(slot.hasAttribute(align)).toBe(false)
  })

  test('canRemove 为 false 时不删除', () => {
    const slot = textSlot()
    slot.insert('x')
    slot.setAttribute(align, 'c')
    slot.removeAttribute(align, () => false)
    expect(slot.hasAttribute(align)).toBe(true)
  })
})

describe('Slot insert / write / delete / retain', () => {
  class Inline extends Component {
    static type = ContentType.InlineComponent
    static componentName = 'Mv'
  }

  test('insert 将已从其它插槽移除的组件迁入当前插槽', () => {
    const a = fullSchemaSlot()
    const b = fullSchemaSlot()
    const c = new Inline({})
    a.insert(c)
    b.insert('z')
    b.retain(1)
    expect(b.insert(c)).toBe(true)
    expect(a.indexOf(c)).toBe(-1)
    expect(b.indexOf(c)).toBeGreaterThan(-1)
  })

  const bold = new Formatter<boolean>('b', {
    render(children): VElement | FormatHostBindingRender {
      return createVNode('strong', null, children)
    }
  })

  test('insert 违反 schema 时返回 false', () => {
    const slot = new Slot([]) // 无允许类型，但仍会有占位
    const ok = slot.insert('x')
    expect(ok).toBe(false)
  })

  test('insert 空字符串返回 true', () => {
    const slot = textSlot()
    const before = slot.index
    expect(slot.insert('')).toBe(true)
    expect(slot.index).toBe(before)
  })

  test('write 空字符串', () => {
    const slot = textSlot()
    expect(slot.write('')).toBe(true)
  })

  test('delete(count<=0) 返回 false', () => {
    const slot = textSlot()
    slot.insert('a')
    expect(slot.delete(0)).toBe(false)
    expect(slot.delete(-1)).toBe(false)
  })

  test('retain 仅移动光标：负向下界、超长度上界', () => {
    const slot = textSlot()
    slot.insert('abc')
    slot.retain(-100)
    expect(slot.index).toBe(0)
    slot.retain(1000)
    expect(slot.index).toBe(slot.length)
  })

  test('retain 传入空格式数组时提前返回且不移动光标', () => {
    const slot = textSlot()
    slot.insert('abc')
    slot.retain(1)
    const i = slot.index
    expect(slot.retain(2, [])).toBe(true)
    expect(slot.index).toBe(i)
  })

  test('write 继承邻域格式', () => {
    const slot = textSlot()
    slot.insert('12', bold, true)
    slot.retain(1)
    slot.write('x')
    expect(slot.sliceContent().join('')).toBe('1x2')
    const formats = slot.getFormats().filter(f => f.formatter === bold)
    expect(formats.length).toBeGreaterThan(0)
  })

  test('insert canApply 过滤格式', () => {
    const slot = textSlot()
    slot.insert('a')
    slot.retain(0)
    slot.insert('b', bold, true, () => false)
    expect(slot.getFormats().every(f => f.formatter !== bold)).toBe(true)
  })
})

describe('Slot removeComponent', () => {
  class Inline extends Component {
    static type = ContentType.InlineComponent
    static componentName = 'I'
  }

  test('移除存在的组件', () => {
    const slot = fullSchemaSlot()
    const c = new Inline({})
    slot.insert('a')
    slot.insert(c)
    expect(slot.removeComponent(c)).toBe(true)
    expect(slot.indexOf(c)).toBe(-1)
  })

  test('移除不存在的组件返回 false', () => {
    const slot = fullSchemaSlot()
    slot.insert('x')
    expect(slot.removeComponent(new Inline({}))).toBe(false)
  })
})

describe('Slot indexOf / sliceContent / getContentAtIndex', () => {
  class Inline extends Component {
    static type = ContentType.InlineComponent
    static componentName = 'I'
  }

  test('indexOf 与 sliceContent', () => {
    const slot = fullSchemaSlot()
    const c = new Inline({})
    slot.insert('ab')
    slot.insert(c)
    expect(slot.indexOf(c)).toBe(2)
    expect(slot.sliceContent(1, 3)).toEqual(['b', c])
    expect(slot.getContentAtIndex(0)).toBe('a')
  })
})

describe('Slot 格式查询', () => {
  const fmt = new Formatter<string>('fmt', {
    render(children): VElement | FormatHostBindingRender {
      return createVNode('span', null, children)
    }
  })

  test('getFormatRangesByFormatter', () => {
    const slot = textSlot()
    slot.insert('abcd')
    slot.applyFormat(fmt, { startIndex: 1, endIndex: 3, value: 'v' })
    const ranges = slot.getFormatRangesByFormatter(fmt, 0, 4)
    expect(ranges).toEqual([{ startIndex: 1, endIndex: 3, value: 'v' }])
  })

  test('extractFormatsByIndex：下标 0 与中间位置', () => {
    const slot = textSlot()
    slot.insert('abc', fmt, 'x')
    const at0 = slot.extractFormatsByIndex(0)
    expect(at0.some(([f]) => f === fmt)).toBe(true)
    const at2 = slot.extractFormatsByIndex(2)
    expect(at2.some(([f]) => f === fmt)).toBe(true)
  })
})

describe('Slot cut / cutTo', () => {
  test('cut 得到新插槽且源插槽保留剩余', () => {
    const slot = textSlot()
    slot.insert('abcd')
    const piece = slot.cut(1, 3)
    expect(piece.sliceContent().join('')).toBe('bc')
    expect(slot.sliceContent().join('')).toBe('ad')
  })

  test('cutTo：目标为空时复制属性', () => {
    const align = new Attribute<string>('align', { render: noopAttrRender })
    const src = textSlot()
    src.insert('x')
    src.setAttribute(align, 'right')
    const empty = textSlot()
    src.cutTo(empty, 0, 1)
    expect(empty.getAttribute(align)).toBe('right')
  })

  test('cut 边界修正：start>end 时返回目标不变', () => {
    const slot = textSlot()
    slot.insert('ab')
    const target = textSlot()
    const out = slot.cutTo(target, 2, 1)
    expect(out).toBe(target)
  })
})

describe('Slot toJSON / toString / toDelta / insertDelta', () => {
  test('toJSON 结构', () => {
    const slot = fullSchemaSlot()
    slot.insert('hi')
    const json = slot.toJSON()
    expect(json.schema.sort()).toEqual(fullSchemaSlot().schema.sort())
    expect(Array.isArray(json.content)).toBe(true)
    expect(json.formats).toBeDefined()
    expect(json.attributes).toBeDefined()
    expect(json.state).toBeDefined()
  })

  test('toString', () => {
    const slot = textSlot()
    slot.insert('ab')
    expect(slot.toString()).toBe('ab')
  })

  test('toDelta 产出分段 DeltaLite', () => {
    const slot = textSlot()
    slot.insert('ab')
    const d = slot.toDelta()
    expect(d).toBeInstanceOf(DeltaLite)
    expect(d.length).toBeGreaterThanOrEqual(1)
    expect(d.every(item => item.insert !== undefined)).toBe(true)
  })

  test('toDelta 含属性', () => {
    const align = new Attribute<string>('align', { render: noopAttrRender })
    const slot = textSlot()
    slot.insert('a')
    slot.setAttribute(align, 'c')
    const d = slot.toDelta()
    expect(d.attributes.get(align)).toBe('c')
  })

  test('insertDelta 应用属性并消费 delta', () => {
    const align = new Attribute<string>('align', { render: noopAttrRender })
    const slot = textSlot()
    const delta = new DeltaLite()
    delta.attributes.set(align, 'x')
    delta.push({ insert: 'z', formats: [] })
    const rest = slot.insertDelta(delta)
    expect(slot.getAttribute(align)).toBe('x')
    expect(rest.length).toBe(0)
    expect(delta.length).toBe(0)
  })

  test('insertDelta 在插入失败时中断并返回剩余', () => {
    const slot = new Slot([]) // insert 文本会失败
    const delta = new DeltaLite()
    delta.push({ insert: 'nope', formats: [] })
    const rest = slot.insertDelta(delta)
    expect(rest.length).toBe(1)
  })
})

describe('Slot cleanFormats / cleanAttributes / background', () => {
  const a = new Formatter<string>('fa', {
    render(c): VElement | FormatHostBindingRender {
      return createVNode('span', null, c)
    }
  })
  const b = new Formatter<string>('fb', {
    render(c): VElement | FormatHostBindingRender {
      return createVNode('em', null, c)
    }
  })

  test('cleanFormats 保留列表中的格式', () => {
    const slot = textSlot()
    slot.insert('abcd')
    slot.applyFormat(a, { startIndex: 0, endIndex: 4, value: '1' })
    slot.applyFormat(b, { startIndex: 0, endIndex: 4, value: '2' })
    slot.cleanFormats([a], 0, 4)
    expect(slot.getFormats().every(i => i.formatter === a)).toBe(true)
  })

  test('cleanFormats 使用函数谓词保留指定格式', () => {
    const slot = textSlot()
    slot.insert('ab', a, 'x')
    slot.cleanFormats(f => f.name !== 'fa', 0, 2)
    expect(slot.getFormats().length).toBe(0)
  })

  test('cleanFormats：自身无格式时递归清理块内子插槽', () => {
    class Block extends Component<{ slot: Slot }> {
      static type = ContentType.BlockComponent
      static componentName = 'Blk'
      override getSlots() {
        return [this.state.slot]
      }
    }
    const inner = textSlot()
    inner.insert('in', a, 'y')
    const block = new Block({ slot: inner })
    const outer = fullSchemaSlot()
    outer.insert(block)
    expect(outer.getFormats().length).toBe(0)
    outer.cleanFormats([], 0, outer.length)
    expect(inner.getFormats().length).toBe(0)
  })

  const attr = new Attribute<string>('id', { render: noopAttrRender })

  test('cleanAttributes 数组与函数两种过滤', () => {
    const slot = textSlot()
    slot.insert('x')
    slot.setAttribute(attr, '1')
    const other = new Attribute('o', { render: noopAttrRender })
    slot.setAttribute(other, '2')
    slot.cleanAttributes([attr])
    expect(slot.hasAttribute(attr)).toBe(true)
    expect(slot.hasAttribute(other)).toBe(false)
    slot.setAttribute(other, '2')
    slot.cleanAttributes(k => k.name === 'id')
    expect(slot.hasAttribute(attr)).toBe(true)
    expect(slot.hasAttribute(other)).toBe(false)
  })

  test('background 执行回调', () => {
    const slot = textSlot()
    let ran = false
    slot.background(() => {
      ran = true
    })
    expect(ran).toBe(true)
  })
})

describe('Slot 渲染与静态方法', () => {
  const bold = new Formatter<boolean>('sb', {
    render(children): VElement | FormatHostBindingRender {
      return createVNode('strong', null, children)
    }
  })

  test('toTree 默认根据插槽格式生成', () => {
    const slot = textSlot()
    slot.insert('ab')
    slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true })
    const root = slot.toTree(children => createVNode('div', null, children))
    expect(root.tagName).toBe('div')
    expect(root.location?.slot).toBe(slot)
  })

  test('toTree 传入自定义 Format 实例', () => {
    const slot = textSlot()
    slot.insert('xy')
    const format = (slot as unknown as { format: Format }).format
    const tree = slot.toTree(children => createVNode('section', null, children), format)
    expect(tree.tagName).toBe('section')
  })

  test('Slot.formatsToTree', () => {
    const f = new Formatter<string>('sf', {
      render(children): VElement | FormatHostBindingRender {
        return createVNode('u', null, children)
      }
    })
    const host = Slot.formatsToTree([[f, 'v']], [new VTextNode('t')], undefined)
    expect(host.tagName).toBe('u')
  })

  test('Slot.toTree 静态入口', () => {
    const slot = textSlot()
    slot.insert('z')
    const formatTree = (slot as unknown as { format: Format }).format.toTree(0, slot.length)
    const el = Slot.toTree(slot, ch => createVNode('p', null, ch), formatTree)
    expect(el.tagName).toBe('p')
  })

  test('toTree 可将非 Format 的第二参数作为 renderEnv 传入', () => {
    const slot = textSlot()
    slot.insert('z')
    const env = { marker: 'test' }
    const tree = slot.toTree(children => createVNode('article', null, children), env)
    expect(tree.tagName).toBe('article')
  })
})

describe('Slot onContentChange', () => {
  test('插入时发出变更', () => {
    const slot = textSlot()
    const actions: unknown[] = []
    const sub = slot.onContentChange.subscribe(a => actions.push(a))
    slot.insert('a')
    expect(actions.length).toBeGreaterThan(0)
    sub.unsubscribe()
  })
})

describe('Slot DeltaLite', () => {
  test('DeltaLite 继承 Array 且带 attributes', () => {
    const d = new DeltaLite()
    expect(d instanceof Array).toBe(true)
    expect(d.attributes).toBeInstanceOf(Map)
  })
})
