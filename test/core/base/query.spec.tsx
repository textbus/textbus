import {
  ContentType,
  NativeSelectionBridge,
  Query,
  QueryStateType,
  Range,
  RootComponentRef,
  Selection,
  Slot
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import {
  boldFormatter,
  Editor,
  fontSizeFormatter,
  InlineComponent,
  ParagraphComponent,
  RootComponent,
  textAlignAttribute
} from '../../_editor/_api'

describe('样式查询', () => {
  let editor!: Editor
  beforeEach(async () => {
    editor = new Editor(document.body, {
      providers: [
        {
          provide: NativeSelectionBridge,
          useClass: NodeSelectionBridge
        }
      ]
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({
      slot
    })
    slot.insert('hello,', boldFormatter, true)
    const p = new ParagraphComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    p.state.slot.write('content', fontSizeFormatter, '12px')
    slot.insert(p)
    slot.insert('textbus', boldFormatter, true)
    slot.insert('!')

    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('光标在内返回 true', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    selection.toNext()

    expect(query.queryFormat(boldFormatter).state).toBe(QueryStateType.Enabled)
  })
  test('选区在内返回 true', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    selection.setBaseAndExtent(selection.focusSlot!, 2, selection.focusSlot!, 4)

    expect(query.queryFormat(boldFormatter).state).toBe(QueryStateType.Enabled)
  })

  test('部分选中返回 false', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    selection.setBaseAndExtent(selection.focusSlot!, 2, selection.focusSlot!, 8)

    expect(query.queryFormat(boldFormatter).state).toBe(QueryStateType.Normal)
  })
})

describe('属性查询', () => {
  let editor!: Editor
  let paragraph: ParagraphComponent
  let inline: InlineComponent
  beforeEach(async () => {
    editor = new Editor(document.body, {
      providers: [
        {
          provide: NativeSelectionBridge,
          useClass: NodeSelectionBridge
        }
      ]
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({
      slot
    })
    slot.insert('hello,')
    paragraph = new ParagraphComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    paragraph.state.slot.insert('content')
    paragraph.state.slot.setAttribute(textAlignAttribute, 'right')
    slot.insert(paragraph)
    slot.insert('textbus!')
    inline = new InlineComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    inline.state.slot.insert('inline')
    slot.insert(inline)
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('光标在外返回 false', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component)

    expect(query.queryAttribute(textAlignAttribute).state).toBe(QueryStateType.Normal)
  })

  test('光标在内返回 true', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)

    selection.selectFirstPosition(paragraph)

    expect(query.queryAttribute(textAlignAttribute).state).toBe(QueryStateType.Enabled)
    expect(query.queryAttribute(textAlignAttribute).value).toBe('right')
  })
})

describe('组件查询', () => {
  let editor!: Editor
  let paragraph: ParagraphComponent

  beforeEach(async () => {
    editor = new Editor(document.body, {
      providers: [
        {
          provide: NativeSelectionBridge,
          useClass: NodeSelectionBridge
        }
      ]
    })
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({
      slot
    })
    slot.insert('hello,', boldFormatter, true)
    const p = new ParagraphComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    paragraph = p
    p.state.slot.write('content', fontSizeFormatter, '12px')
    slot.insert(p)
    slot.insert('textbus', boldFormatter, true)
    slot.insert('!')

    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('光标在内返回 true', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)

    selection.selectFirstPosition(paragraph, false, true)
    selection.toNext()

    expect(query.queryComponent(ParagraphComponent).state).toBe(QueryStateType.Enabled)
    expect(query.queryComponent(ParagraphComponent).value).toBe(paragraph)
  })

  test('光标在外返回 false', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component)

    expect(query.queryComponent(ParagraphComponent).state).toBe(QueryStateType.Normal)
    expect(query.queryComponent(ParagraphComponent).value).toBe(null)
  })

  test('和 Range 重叠返回 true', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)

    selection.selectComponent(paragraph)

    expect(query.queryWrappedComponent(ParagraphComponent).state).toBe(QueryStateType.Enabled)
    expect(query.queryWrappedComponent(ParagraphComponent).value).toBe(paragraph)
  })

  test('和 Range 不重叠返回 false', () => {
    const selection = editor.get(Selection)
    const query = editor.get(Query)

    selection.selectComponent(paragraph)
    selection.wrapToBefore()

    expect(query.queryWrappedComponent(ParagraphComponent).state).toBe(QueryStateType.Normal)
    expect(query.queryWrappedComponent(ParagraphComponent).value).toBe(null)
  })
})

describe('Query — 未选区', () => {
  test('无选区时格式 / 属性 / 组件查询均为 Normal', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const slot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot })
    slot.insert('x', boldFormatter, true)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.unSelect()

    expect(query.queryFormat(boldFormatter).state).toBe(QueryStateType.Normal)
    expect(query.queryAttribute(textAlignAttribute).state).toBe(QueryStateType.Normal)
    expect(query.queryComponent(ParagraphComponent).state).toBe(QueryStateType.Normal)
    expect(query.queryWrappedComponent(ParagraphComponent).state).toBe(QueryStateType.Normal)
    editor.destroy()
  })
})

describe('Query — 跨插槽格式与 mergeState', () => {
  test('跨根插槽与段落内插槽且格式一致时 queryFormat 为 Enabled', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('a', boldFormatter, true)
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('b', boldFormatter, true)
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, 1)
    const r = query.queryFormat(boldFormatter)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe(true)
    editor.destroy()
  })

  test('跨根插槽与段落内插槽且仅一侧有加粗时 queryFormat 为 Normal', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('a', boldFormatter, true)
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('b')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, 1)
    expect(query.queryFormat(boldFormatter).state).toBe(QueryStateType.Normal)
    editor.destroy()
  })

  test('跨插槽 fontSize 均一致时 Enabled 且值为该字号', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('a', fontSizeFormatter, '14px')
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('b', fontSizeFormatter, '14px')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, 1)
    const r = query.queryFormat(fontSizeFormatter)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe('14px')
    editor.destroy()
  })

  test('跨插槽 fontSize 不一致时仍为 Enabled，取首个作用域的值', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('a', fontSizeFormatter, '10px')
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('b', fontSizeFormatter, '22px')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, 1)
    const r = query.queryFormat(fontSizeFormatter)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe('10px')
    editor.destroy()
  })

  test('queryFormatByRange 与 queryFormat 对当前选区结果一致', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('a', boldFormatter, true)
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('b', boldFormatter, true)
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, 1)
    const range = selection.getRanges()[0] as Range
    const bySelection = query.queryFormat(boldFormatter)
    const byRange = query.queryFormatByRange(boldFormatter, range)
    expect(byRange.state).toBe(bySelection.state)
    expect(byRange.value).toBe(bySelection.value)
    editor.destroy()
  })
})

describe('Query — 跨组件属性（textAlign）', () => {
  test('跨两个段落插槽且 textAlign 相同时为 Enabled', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p1 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p1.state.slot.insert('a')
    p1.state.slot.setAttribute(textAlignAttribute, 'justify')
    const p2 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p2.state.slot.insert('b')
    p2.state.slot.setAttribute(textAlignAttribute, 'justify')
    rootSlot.insert(p1)
    rootSlot.insert(p2)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(p1.state.slot, 0, p2.state.slot, p2.state.slot.length)
    const r = query.queryAttribute(textAlignAttribute)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe('justify')
    editor.destroy()
  })

  test('跨两个段落且 textAlign 不同时仍为 Enabled，取首个作用域的值', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p1 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p1.state.slot.insert('a')
    p1.state.slot.setAttribute(textAlignAttribute, 'left')
    const p2 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p2.state.slot.insert('b')
    p2.state.slot.setAttribute(textAlignAttribute, 'right')
    rootSlot.insert(p1)
    rootSlot.insert(p2)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(p1.state.slot, 0, p2.state.slot, p2.state.slot.length)
    const r = query.queryAttribute(textAlignAttribute)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe('left')
    editor.destroy()
  })

  test('queryAttributeByRange 与 queryAttribute 对展开选区一致', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p1 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p1.state.slot.insert('a')
    p1.state.slot.setAttribute(textAlignAttribute, 'center')
    const p2 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p2.state.slot.insert('b')
    p2.state.slot.setAttribute(textAlignAttribute, 'center')
    rootSlot.insert(p1)
    rootSlot.insert(p2)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(p1.state.slot, 0, p2.state.slot, p2.state.slot.length)
    const range = selection.getRanges()[0] as Range
    const a = query.queryAttribute(textAlignAttribute)
    const b = query.queryAttributeByRange(textAlignAttribute, range)
    expect(b.state).toBe(a.state)
    expect(b.value).toBe(a.value)
    editor.destroy()
  })

  test('选区含根插槽文本与段落时，段落属性与根无属性合并为 Normal', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('root')
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('inner')
    p.state.slot.setAttribute(textAlignAttribute, 'right')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, p.state.slot.length)
    expect(query.queryAttribute(textAlignAttribute).state).toBe(QueryStateType.Normal)
    editor.destroy()
  })
})

describe('Query — 跨组件 queryComponent / ByRange', () => {
  test('选区从段落到行内组件时，公共祖先为根，对段落类型为 Normal', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('p')
    const inline = new InlineComponent({ slot: new Slot([ContentType.Text]) })
    inline.state.slot.insert('i')
    rootSlot.insert(p)
    rootSlot.insert(inline)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.setBaseAndExtent(p.state.slot, 0, inline.state.slot, 1)
    expect(query.queryComponent(ParagraphComponent).state).toBe(QueryStateType.Normal)
    expect(query.queryComponent(InlineComponent).state).toBe(QueryStateType.Normal)
    editor.destroy()
  })

  test('光标仅在行内组件内时 queryComponent(Inline) 为 Enabled', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const inline = new InlineComponent({ slot: new Slot([ContentType.Text]) })
    inline.state.slot.insert('i')
    rootSlot.insert(inline)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.selectFirstPosition(inline, false, true)
    const r = query.queryComponent(InlineComponent)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe(inline)
    editor.destroy()
  })

  test('queryComponent 带 filter 时只命中满足条件的实例', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p1 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p1.state.slot.insert('1')
    const p2 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p2.state.slot.insert('2')
    rootSlot.insert(p1)
    rootSlot.insert(p2)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.selectFirstPosition(p2, false, true)
    const r = query.queryComponent(ParagraphComponent, c => c === p2)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toBe(p2)
    const r2 = query.queryComponent(ParagraphComponent, c => c === p1)
    expect(r2.state).toBe(QueryStateType.Normal)
    editor.destroy()
  })

  test('queryComponentByRange 与 queryComponent 结果一致', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('x')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.selectFirstPosition(p, false, true)
    const range = selection.getRanges()[0] as Range
    const a = query.queryComponent(ParagraphComponent)
    const b = query.queryComponentByRange(ParagraphComponent, range)
    expect(b.state).toBe(a.state)
    expect(b.value).toBe(a.value)
    editor.destroy()
  })
})

describe('Query — queryWrappedComponentByRange', () => {
  test('与 queryWrappedComponent 对「选中单个块」一致', async () => {
    const editor = new Editor(document.body, {
      providers: [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('c')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    selection.selectComponent(p)
    const range = selection.getRanges()[0] as Range
    const a = query.queryWrappedComponent(ParagraphComponent)
    const b = query.queryWrappedComponentByRange(ParagraphComponent, range)
    expect(b.state).toBe(a.state)
    expect(b.value).toBe(a.value)
    editor.destroy()
  })
})
