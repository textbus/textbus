import { Commander, ContentType, History, NativeSelectionBridge, Selection, Slot } from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter, Editor, fontSizeFormatter, ParagraphComponent, RootComponent } from '../../_editor/_api'
import { sleep } from '../../util'

describe('本地历史记录', () => {
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

  test('基本状态确认', () => {
    const history = editor.get(History)

    expect(history.canBack).toBeFalsy()
    expect(history.canForward).toBeFalsy()
  })

  test('可正常回退', async () => {
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">content</span></p></div><strong>textbus</strong>!</div></div>')

    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const history = editor.get(History)

    selection.selectFirstPosition(paragraph)
    commander.write('1')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">1content</span></p></div><strong>textbus</strong>!</div></div>')

    commander.write('2')
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">12content</span></p></div><strong>textbus</strong>!</div></div>')

    history.back()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">1content</span></p></div><strong>textbus</strong>!</div></div>')
    expect(selection.isCollapsed).toBeTruthy()
    expect(selection.focusSlot).toStrictEqual(paragraph.state.slot)
    expect(selection.focusOffset).toBe(1)

    history.back()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">content</span></p></div><strong>textbus</strong>!</div></div>')

    expect(selection.isCollapsed).toBeTruthy()
    expect(selection.focusSlot).toStrictEqual(paragraph.state.slot)
    expect(selection.focusOffset).toBe(0)

    history.back()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">content</span></p></div><strong>textbus</strong>!</div></div>')

    expect(selection.isCollapsed).toBeTruthy()
    expect(selection.focusSlot).toStrictEqual(paragraph.state.slot)
    expect(selection.focusOffset).toBe(0)
  })
  test('可正常前进', async () => {
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">content</span></p></div><strong>textbus</strong>!</div></div>')

    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const history = editor.get(History)

    selection.selectFirstPosition(paragraph)
    commander.write('1')
    await sleep()
    commander.write('2')
    await sleep()
    history.back()
    history.back()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">content</span></p></div><strong>textbus</strong>!</div></div>')

    expect(selection.isCollapsed).toBeTruthy()
    expect(selection.focusSlot).toStrictEqual(paragraph.state.slot)
    expect(selection.focusOffset).toBe(0)

    history.forward()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">1content</span></p></div><strong>textbus</strong>!</div></div>')

    expect(selection.isCollapsed).toBeTruthy()
    expect(selection.focusSlot).toStrictEqual(paragraph.state.slot)
    expect(selection.focusOffset).toBe(1)


    history.forward()
    await sleep()
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">12content</span></p></div><strong>textbus</strong>!</div></div>')

    expect(selection.isCollapsed).toBeTruthy()
    expect(selection.focusSlot).toStrictEqual(paragraph.state.slot)
    expect(selection.focusOffset).toBe(2)
  })
})
