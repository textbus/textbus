import { Commander, ContentType, History, NativeSelectionBridge, Selection, Slot } from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter, Editor, fontSizeFormatter, ParagraphComponent, RootComponent } from '../../_editor/_api'
import { sleep } from '../../util'

const bridgeProviders = [
  {
    provide: NativeSelectionBridge,
    useClass: NodeSelectionBridge
  }
]

async function createHistoryEditor(config: ConstructorParameters<typeof Editor>[1] = {}) {
  const editor = new Editor(document.body, {
    providers: bridgeProviders,
    ...config
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
  const paragraph = new ParagraphComponent({
    slot: new Slot([
      ContentType.Text
    ])
  })
  paragraph.state.slot.write('content', fontSizeFormatter, '12px')
  slot.insert(paragraph)
  slot.insert('textbus', boldFormatter, true)
  slot.insert('!')

  await editor.render(root)
  return { editor, paragraph }
}

describe('本地历史记录', () => {
  let editor!: Editor
  let paragraph!: ParagraphComponent

  beforeEach(async () => {
    const ctx = await createHistoryEditor()
    editor = ctx.editor
    paragraph = ctx.paragraph
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

describe('本地历史记录 — 清空、事件与栈深度', () => {
  test('clear 后不可撤销也不可重做，文档保持清空前的内容', async () => {
    const { editor, paragraph } = await createHistoryEditor()
    try {
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const history = editor.get(History)

      selection.selectFirstPosition(paragraph)
      commander.write('x')
      await sleep()

      const htmlBeforeClear = editor.getHTML()
      history.clear()

      expect(history.canBack).toBe(false)
      expect(history.canForward).toBe(false)
      expect(editor.getHTML()).toBe(htmlBeforeClear)
    } finally {
      editor.destroy()
    }
  })

  test('产生新编辑后丢弃尾部重做分支', async () => {
    const { editor, paragraph } = await createHistoryEditor()
    try {
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const history = editor.get(History)

      selection.selectFirstPosition(paragraph)
      commander.write('1')
      await sleep()
      commander.write('2')
      await sleep()
      history.back()
      await sleep()

      expect(history.canForward).toBe(true)

      commander.write('a')
      await sleep()

      expect(history.canForward).toBe(false)
      // eslint-disable-next-line max-len
      expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">1acontent</span></p></div><strong>textbus</strong>!</div></div>')
    } finally {
      editor.destroy()
    }
  })

  test('onPush / onChange 在本地编辑入栈时触发', async () => {
    const { editor, paragraph } = await createHistoryEditor()
    try {
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const history = editor.get(History)

      let pushes = 0
      let changes = 0
      const sub = history.onPush.subscribe(() => pushes++)
      const sub2 = history.onChange.subscribe(() => changes++)

      selection.selectFirstPosition(paragraph)
      commander.write('z')
      await sleep()

      expect(pushes).toBe(1)
      expect(changes).toBeGreaterThanOrEqual(1)

      sub.unsubscribe()
      sub2.unsubscribe()
    } finally {
      editor.destroy()
    }
  })

  test('historyStackSize 限制栈长度：仅保留最近若干步可撤销', async () => {
    const { editor, paragraph } = await createHistoryEditor({ historyStackSize: 2 })
    try {
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const history = editor.get(History)

      selection.selectFirstPosition(paragraph)
      commander.write('1')
      await sleep()
      commander.write('2')
      await sleep()
      commander.write('3')
      await sleep()
      commander.write('4')
      await sleep()

      expect(history.canBack).toBe(true)

      history.back()
      await sleep()
      // eslint-disable-next-line max-len
      expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">123content</span></p></div><strong>textbus</strong>!</div></div>')

      history.back()
      await sleep()
      // eslint-disable-next-line max-len
      expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">12content</span></p></div><strong>textbus</strong>!</div></div>')

      expect(history.canBack).toBe(false)

      history.back()
      await sleep()
      // eslint-disable-next-line max-len
      expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><strong>hello,</strong><div data-component="ParagraphComponent"><p><span style="font-size:12px">12content</span></p></div><strong>textbus</strong>!</div></div>')
    } finally {
      editor.destroy()
    }
  })

  test('back / forward 触发对应事件', async () => {
    const { editor, paragraph } = await createHistoryEditor()
    try {
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const history = editor.get(History)

      selection.selectFirstPosition(paragraph)
      commander.write('1')
      await sleep()

      let backs = 0
      let forwards = 0
      const b = history.onBack.subscribe(() => backs++)
      const f = history.onForward.subscribe(() => forwards++)

      history.back()
      await sleep()
      expect(backs).toBe(1)

      history.forward()
      await sleep()
      expect(forwards).toBe(1)

      b.unsubscribe()
      f.unsubscribe()
    } finally {
      editor.destroy()
    }
  })
})
