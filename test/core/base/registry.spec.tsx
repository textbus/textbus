/**
 * Registry：组件/格式/属性映射，createComponentByData、createSlot、fillSlot；
 * 以及未实现 fromJSON 时 createComponent 的报错语义。
 */
import {
  AsyncComponentLiteral,
  Component,
  ContentType,
  Formatter,
  NativeSelectionBridge,
  Registry,
  Slot,
  SlotLiteral,
  createVNode,
  VElement,
  VTextNode
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import {
  Editor,
  JsonAsyncProbe,
  JsonProbeBlock,
  JsonProbeInline,
  ParagraphComponent,
  RootComponent,
  boldFormatter,
  fontSizeFormatter,
  textAlignAttribute
} from '../../_editor/_api'

const bridgeProviders = [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]

describe('Registry — getComponent / getFormatter / getAttribute', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.createElement('div'), { providers: bridgeProviders })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('按 componentName 取到构造函数', () => {
    const r = editor.get(Registry)
    expect(r.getComponent(RootComponent.componentName)).toBe(RootComponent)
    expect(r.getComponent(ParagraphComponent.componentName)).toBe(ParagraphComponent)
  })

  test('未知组件名为 null', () => {
    expect(editor.get(Registry).getComponent('__NoSuchComponent__')).toBeNull()
  })

  test('按格式名取到 Formatter', () => {
    const r = editor.get(Registry)
    expect(r.getFormatter(boldFormatter.name)).toBe(boldFormatter)
    expect(r.getFormatter(fontSizeFormatter.name)).toBe(fontSizeFormatter)
  })

  test('未知格式名为 null', () => {
    expect(editor.get(Registry).getFormatter('__no_fmt__')).toBeNull()
  })

  test('按属性名取到 Attribute', () => {
    expect(editor.get(Registry).getAttribute(textAlignAttribute.name)).toBe(textAlignAttribute)
  })

  test('未知属性名为 null', () => {
    expect(editor.get(Registry).getAttribute('__no_attr__')).toBeNull()
  })

  test('同名格式：FORMATTER_LIST 逆序 set，最终保留配置数组中靠前的 Formatter', () => {
    const host = document.createElement('div')
    const altBold = new Formatter<boolean>('bold', {
      render(children: Array<VElement | VTextNode | Component>) {
        return createVNode('b', { class: 'alt-bold' }, children)
      }
    })
    const ed = new Editor(host, {
      providers: bridgeProviders,
      formatters: [boldFormatter, altBold]
    })
    expect(ed.get(Registry).getFormatter('bold')).toBe(boldFormatter)
    ed.destroy()
  })

  test('同名格式：配置数组中靠前的 Formatter 覆盖靠后的（逆序 set 时后写入 Map）', () => {
    const host = document.createElement('div')
    const altBold = new Formatter<boolean>('bold', {
      render(children: Array<VElement | VTextNode | Component>) {
        return createVNode('b', { class: 'alt-bold' }, children)
      }
    })
    const ed = new Editor(host, {
      providers: bridgeProviders,
      formatters: [altBold, boldFormatter]
    })
    expect(ed.get(Registry).getFormatter('bold')).toBe(altBold)
    ed.destroy()
  })
})

describe('Registry — createComponentByData', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.createElement('div'), { providers: bridgeProviders })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('已知组件名构造实例', () => {
    const r = editor.get(Registry)
    const inner = new Slot([ContentType.Text])
    inner.insert('p')
    const p = r.createComponentByData(ParagraphComponent.componentName, {
      slot: inner
    }) as ParagraphComponent
    expect(p).toBeInstanceOf(ParagraphComponent)
    expect(p.state.slot.sliceContent().join('')).toContain('p')
  })

  test('未知组件名返回 null', () => {
    expect(
      editor.get(Registry).createComponentByData('Ghost', { slot: new Slot([ContentType.Text]) })
    ).toBeNull()
  })
})

describe('Registry — createSlot / fillSlot', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.createElement('div'), { providers: bridgeProviders })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('createSlot 还原文本、格式与属性', () => {
    const r = editor.get(Registry)
    const literal: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['ab'],
      attributes: { [textAlignAttribute.name]: 'right' },
      formats: {
        [boldFormatter.name]: [{ startIndex: 0, endIndex: 2, value: true }]
      }
    }
    const slot = r.createSlot(literal)
    expect(slot.sliceContent().join('')).toBe('ab')
    expect(slot.getAttribute(textAlignAttribute)).toBe('right')
    const boldRanges = slot.getFormatRangesByFormatter(boldFormatter, 0, 2)
    expect(boldRanges.length).toBeGreaterThan(0)
    expect(boldRanges[0].value).toBe(true)
  })

  test('fillSlot 将字面量合并进已有插槽', () => {
    const r = editor.get(Registry)
    const target = new Slot([ContentType.Text])
    target.insert(Slot.emptyPlaceholder)
    const literal: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['xy'],
      attributes: {},
      formats: {}
    }
    r.fillSlot(literal, target)
    expect(target.sliceContent().join('')).toContain('xy')
  })
})

describe('Registry — createComponent（字面量）与 fromJSON', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.createElement('div'), { providers: bridgeProviders })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('未实现 fromJSON 的组件在 createComponent 时抛出', () => {
    const r = editor.get(Registry)
    const slotLit: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['z'],
      attributes: {},
      formats: {}
    }
    expect(() =>
      r.createComponent({
        name: ParagraphComponent.componentName,
        state: { slot: slotLit }
      })
    ).toThrow(/fromJSON/)
  })
})

describe('Registry — 带 fromJSON / fromJSONAndMetadata 的探针组件', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.createElement('div'), { providers: bridgeProviders })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('JsonProbeInline：createComponent 还原 caption 与子槽', () => {
    const r = editor.get(Registry)
    const innerSlot: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['inner'],
      attributes: {},
      formats: {}
    }
    const inst = r.createComponent({
      name: JsonProbeInline.componentName,
      state: { slot: innerSlot, caption: 'hello-inline' }
    }) as JsonProbeInline
    expect(inst).toBeInstanceOf(JsonProbeInline)
    expect(inst.state.caption).toBe('hello-inline')
    expect(inst.state.slot.sliceContent().join('')).toBe('inner')
  })

  test('JsonProbeBlock：createComponent 还原 blockId 与嵌套槽', () => {
    const r = editor.get(Registry)
    const inner: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['blk'],
      attributes: {},
      formats: {}
    }
    const inst = r.createComponent({
      name: JsonProbeBlock.componentName,
      state: { slot: inner, blockId: 42 }
    }) as JsonProbeBlock
    expect(inst.state.blockId).toBe(42)
    expect(inst.state.slot.sliceContent().join('')).toBe('blk')
  })

  test('JsonAsyncProbe：createComponent 传入 metadata 与嵌套 SlotLiteral', () => {
    const r = editor.get(Registry)
    const slotLit: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['async-body'],
      attributes: {},
      formats: {}
    }
    const lit: AsyncComponentLiteral = {
      name: JsonAsyncProbe.componentName,
      async: true,
      metadata: { rev: 7, source: 'registry-test' },
      state: { title: 'MyTitle', slot: slotLit }
    }
    const inst = r.createComponent(lit) as JsonAsyncProbe
    expect(inst).toBeInstanceOf(JsonAsyncProbe)
    expect(inst.state.title).toBe('MyTitle')
    expect(inst.metadata.rev).toBe(7)
    expect(inst.metadata.source).toBe('registry-test')
    expect(inst.state.slot.sliceContent().join('')).toBe('async-body')
  })

  test('createSlot 嵌套 ComponentLiteral 时递归 createComponent', () => {
    const r = editor.get(Registry)
    const innerSlot: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['leaf'],
      attributes: {},
      formats: {}
    }
    const rootLit: SlotLiteral = {
      schema: [ContentType.Text, ContentType.InlineComponent],
      state: {},
      content: [
        'prefix',
        {
          name: JsonProbeInline.componentName,
          state: { slot: innerSlot, caption: 'nested' }
        }
      ],
      attributes: {},
      formats: {}
    }
    const slot = r.createSlot(rootLit)
    const parts = slot.sliceContent()
    expect(parts[0]).toBe('prefix')
    expect(parts[1]).toBeInstanceOf(JsonProbeInline)
    const inline = parts[1] as JsonProbeInline
    expect(inline.state.caption).toBe('nested')
    expect(inline.state.slot.sliceContent().join('')).toBe('leaf')
  })

  test('createComponentByFactory 显式工厂与 createComponent 等价', () => {
    const r = editor.get(Registry)
    const factory = r.getComponent(JsonProbeBlock.componentName)!
    const inner: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['f'],
      attributes: {},
      formats: {}
    }
    const literal = { name: JsonProbeBlock.componentName, state: { slot: inner, blockId: 99 } }
    const a = r.createComponent(literal) as JsonProbeBlock
    const b = r.createComponentByFactory(literal, factory) as JsonProbeBlock
    expect(a.state.blockId).toBe(99)
    expect(b.state.blockId).toBe(99)
    expect(b.state.slot.sliceContent().join('')).toBe('f')
  })
})
