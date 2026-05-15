/**
 * 可堆叠格式 + Commander / Selection（需在 Editor 中注册 stack formatter）。
 */
import {
  Commander,
  ContentType,
  Formatter,
  History,
  NativeSelectionBridge,
  PendingErasure,
  RootComponentRef,
  Selection,
  Slot
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter } from '../../_editor/formatters/bold.formatter'
import { fontSizeFormatter } from '../../_editor/formatters/font-size.formatter'
import { stackCommentFormatter, stackNoInheritFormatter } from '../../_editor/formatters/stackable-test.formatters'
import { Editor, RootComponent } from '../../_editor/_api'
import { sleep } from '../../util'

const bridgeProviders = [
  { provide: NativeSelectionBridge, useClass: NodeSelectionBridge }
]

const stackableEditorFormatters = [
  boldFormatter,
  fontSizeFormatter,
  stackCommentFormatter,
  stackNoInheritFormatter
]

describe('Commander — 可堆叠格式', () => {
  let editor!: Editor

  afterEach(() => {
    editor.destroy()
  })

  test('applyFormat 两次同段不同取值应得到两条堆叠', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    const root = new RootComponent({ slot })
    await editor.render(root)

    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.setBaseAndExtent(ref.component.state.slot, 1, ref.component.state.slot, 4)
    commander.applyFormat(stackCommentFormatter, 'n1')
    commander.applyFormat(stackCommentFormatter, 'n2')
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(ranges.length).toBe(2)
  })

  test('unApplyFormat + PendingErasure(false, value) 只清除指定取值', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'keep')
    commander.applyFormat(stackCommentFormatter, 'drop')
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, 'drop'))
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(ranges.length).toBe(1)
    expect(ranges[0].value).toBe('keep')
  })

  test('inheritable:false 的可堆叠格式：段尾折叠光标后键入不应自动带上该堆叠', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('hi')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 2)
    commander.applyFormat(stackNoInheritFormatter, 'mark')
    selection.setPosition(ref.component.state.slot, 2)
    commander.write('X')
    await sleep()
    const tail = ref.component.state.slot.extractFormatsByIndex(ref.component.state.slot.length - 1)
    const inherited = tail.some(([f]: [Formatter<any>, unknown]) => f === stackNoInheritFormatter)
    expect(inherited).toBe(false)
  })
})

describe('History — 可堆叠格式', () => {
  let editor!: Editor

  afterEach(() => {
    editor.destroy()
  })

  test('撤销 / 重做 retain 产生的堆叠格式变更', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abcdef')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const history = editor.get(History)

    selection.setBaseAndExtent(ref.component.state.slot, 1, ref.component.state.slot, 5)
    commander.applyFormat(stackCommentFormatter, 'h1')
    await sleep()
    commander.applyFormat(stackCommentFormatter, 'h2')
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(2)

    history.back()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(1)

    history.back()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(0)

    history.forward()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(1)
  })
})

describe('Commander — 可堆叠格式（insert / cleanFormats / 历史与删除）', () => {
  let editor!: Editor

  afterEach(() => {
    editor.destroy()
  })

  test('insert(content, Formats) 可显式写入 stackable', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('ab')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.setPosition(ref.component.state.slot, 1)
    commander.insert('Z', [[stackCommentFormatter, 'ins-stack']])
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(ranges.some((r: { value: string }) => r.value === 'ins-stack')).toBe(true)
  })

  test('cleanFormats() 可清除选区内全部 stackable 段', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('xyz')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'a')
    commander.applyFormat(stackCommentFormatter, 'b')
    commander.cleanFormats()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(0)
  })

  test('删除选区后 undo 仍能恢复 stackable 双段', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormatters
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const history = editor.get(History)
    selection.setBaseAndExtent(ref.component.state.slot, 1, ref.component.state.slot, 5)
    commander.applyFormat(stackCommentFormatter, 's1')
    commander.applyFormat(stackCommentFormatter, 's2')
    await sleep()
    selection.setBaseAndExtent(ref.component.state.slot, 2, ref.component.state.slot, 3)
    commander.delete()
    await sleep()
    expect(ref.component.state.slot.sliceContent().join('').length).toBeLessThan(6)
    history.back()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(2)
  })
})

