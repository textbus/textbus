import { ContentType, NativeSelectionBridge, Query, QueryStateType, RootComponentRef, Selection, Slot } from '@textbus/core'
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
    const root = new RootComponent(editor, {
      slot
    })
    slot.insert('hello,', boldFormatter, true)
    const p = new ParagraphComponent(editor, {
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
    const root = new RootComponent(editor, {
      slot
    })
    slot.insert('hello,')
    paragraph = new ParagraphComponent(editor, {
      slot: new Slot([
        ContentType.Text
      ])
    })
    paragraph.state.slot.insert('content')
    paragraph.state.slot.setAttribute(textAlignAttribute, 'right')
    slot.insert(paragraph)
    slot.insert('textbus!')
    inline = new InlineComponent(editor, {
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
    const root = new RootComponent(editor, {
      slot
    })
    slot.insert('hello,', boldFormatter, true)
    const p = new ParagraphComponent(editor, {
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
