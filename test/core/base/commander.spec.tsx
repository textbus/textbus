import { Commander, ContentType, NativeSelectionBridge, RootComponentRef, Selection, Slot } from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { sleep } from '../../util'
import {
  boldFormatter,
  Editor,
  fontSizeFormatter,
  InlineComponent,
  ParagraphComponent,
  RootComponent,
  textAlignAttribute
} from '../../_editor/_api'

describe('字符串内容写入', () => {
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
    const root = new RootComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })
  test('写入普通字符串', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div>textbus</div></div>')
  })

  test('写入带样式的字符串', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', boldFormatter, true)
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>textbus</strong></div></div>')
  })

  test('写入带样式的字符串', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', [
      [boldFormatter, true],
      [fontSizeFormatter, '12px']
    ])
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong style="font-size:12px">textbus</strong></div></div>')

    commander.write('!')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong style="font-size:12px">textbus!</strong></div></div>')
  })

  test('insert 普通字符串样式不会扩展', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', [
      [boldFormatter, true],
      [fontSizeFormatter, '12px']
    ])
    commander.insert('!')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong style="font-size:12px">textbus</strong>!</div></div>')
  })

  test('在起始位置 write 字符样式自动生效', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', [
      [boldFormatter, true],
      [fontSizeFormatter, '12px']
    ])

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('!')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong style="font-size:12px">!textbus</strong></div></div>')
  })
  test('在中间 insert 字符样式自动拆分', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', [
      [boldFormatter, true],
      [fontSizeFormatter, '12px']
    ])
    selection.setPosition(selection.focusSlot!, 3)
    commander.insert('!')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong style="font-size:12px">tex</strong>!<strong style="font-size:12px">tbus</strong></div></div>')
  })
  test('不能插入被限制的内容', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write(new ParagraphComponent({
      slot: new Slot([
        ContentType.Text
      ])
    }))

    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><br></div></div>')
  })
})


describe('组件内容写入', () => {
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
    const root = new RootComponent({
      slot: new Slot([
        ContentType.Text,
        ContentType.BlockComponent,
        ContentType.InlineComponent
      ])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })
  test('写入 block 内容不继承样式', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', boldFormatter, true)
    commander.write(new ParagraphComponent({
      slot: new Slot([
        ContentType.Text,
      ])
    }))
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>textbus</strong><div data-component="ParagraphComponent"><p><br></p></div></div></div>')
  })

  test('写入 inline 内容继承样式', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    commander.write('textbus', boldFormatter, true)
    commander.write(new InlineComponent({
      slot: new Slot([
        ContentType.Text
      ])
    }))
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>textbus<span data-component="InlineComponent"><span><br></span></span></strong></div></div>')
  })
})

describe('内容删除', () => {
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
    slot.insert(new InlineComponent({
      slot: new Slot([
        ContentType.Text
      ])
    }))
    slot.insert('textbus', boldFormatter, true)
    slot.insert('!')

    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('删除带样式内容，样式范围自动缩小', async () => {
    const selection = editor.get(Selection)
    const commander = editor.get(Commander)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)
    selection.setPosition(selection.focusSlot!, 3)
    commander.delete()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>helo,</strong><span data-component="InlineComponent"><span><br></span></span><strong>textbus</strong>!</div></div>')

    commander.delete(true)
    await sleep()

    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hlo,</strong><span data-component="InlineComponent"><span><br></span></span><strong>textbus</strong>!</div></div>')
  })

  test('删除选区内容', async () => {
    const selection = editor.get(Selection)
    const commander = editor.get(Commander)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)

    selection.setBaseAndExtent(selection.focusSlot!, 2, selection.focusSlot!, 5)
    commander.delete()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>he,</strong><span data-component="InlineComponent"><span><br></span></span><strong>textbus</strong>!</div></div>')
  })

  test('删除选区内容后自动合并样式', async () => {
    const selection = editor.get(Selection)
    const commander = editor.get(Commander)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component, false, true)

    selection.setBaseAndExtent(selection.focusSlot!, 6, selection.focusSlot!, 7)
    commander.delete()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,textbus</strong>!</div></div>')
  })
})

describe('应用样式和属性', () => {
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

  test('应用和删除属性', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const rootComponentRef = editor.get(RootComponentRef)

    selection.selectFirstPosition(rootComponentRef.component)
    commander.applyAttribute(textAlignAttribute, 'right')

    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div style="text-align:right">hello,<div data-component="ParagraphComponent"><p style="text-align:right">content</p></div>textbus!<span data-component="InlineComponent"><span style="text-align:right">inline</span></span></div></div>')

    commander.unApplyAttribute(textAlignAttribute)
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div>hello,<div data-component="ParagraphComponent"><p>content</p></div>textbus!<span data-component="InlineComponent"><span>inline</span></span></div></div>')
  })
})

