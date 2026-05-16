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
import {
  stackCommentFormatter,
  stackNoInheritFormatter,
  stackNoteObjectFormatter
} from '../../_editor/formatters/stackable-test.formatters'
import { Editor, ParagraphComponent, RootComponent } from '../../_editor/_api'
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

/** 含对象可堆叠，用于 PendingErasure 与跨段用例 */
const stackableEditorFormattersWithObject = [
  ...stackableEditorFormatters,
  stackNoteObjectFormatter
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

    history.forward()
    await sleep()
    const afterRedo = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(afterRedo.length).toBe(2)
    expect(afterRedo.map((r: { value: string }) => r.value).sort()).toEqual(['s1', 's2'])
  })
})

describe('Commander — PendingErasure 与 unApplyFormat（API 预期）', () => {
  let editor!: Editor

  afterEach(() => {
    editor.destroy()
  })

  test('折叠选区：光标邻零宽位且前一字为 placeholder 时，PendingErasure(false) 只去掉指定取值', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    // 不可分三次 insert：在零宽后 insert 会按 Slot 规则删掉前一字 placeholder，应用一次字符串保证中间保留 \u200b
    slot.insert('x' + Slot.placeholder + 'y')
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 2, value: 'keep' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 2, value: 'drop' })
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setPosition(ref.component.state.slot, 2)
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, 'drop'))
    await sleep()
    const onPh = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 1, 2)
    expect(onPh.some((r: { value: string }) => r.value === 'keep')).toBe(true)
    expect(onPh.some((r: { value: string }) => r.value === 'drop')).toBe(false)
  })

  test('折叠选区：前一字非 placeholder 时 unApplyFormat 仍作用于零宽占位段', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const s = ref.component.state.slot

    selection.setBaseAndExtent(s, 0, s, 5)
    commander.applyFormat(stackCommentFormatter, 'mark')
    selection.setPosition(s, 3)
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, 'mark'))
    await sleep()

    const onCaret = s.getFormatRangesByFormatter(stackCommentFormatter, 3, 4)
    expect(onCaret.length).toBe(0)
    expect(s.getContentAtIndex(2)).not.toBe(Slot.placeholder)
  })

  test('unApplyFormat(formatter) 无第二参时清除选区内该 stackable 全部区间', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)

    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'x')
    commander.applyFormat(stackCommentFormatter, 'y')
    commander.unApplyFormat(stackCommentFormatter)
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(0)
  })

  test('对象取值 PendingErasure(false) 与存储值非 deepEqual 时为 no-op', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)

    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackNoteObjectFormatter, { id: 1 })
    commander.applyFormat(stackNoteObjectFormatter, { id: 2 })
    commander.unApplyFormat(stackNoteObjectFormatter, new PendingErasure(false, { id: 1, tag: 'extra' }))
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackNoteObjectFormatter, 0, 99)
    expect(ranges.length).toBe(2)
    expect(ranges.map((r: { value: { id: number } }) => r.value.id).sort()).toEqual([1, 2])
  })

  test('部分选区：PendingErasure(false, value) 只清除与选区重叠且取值匹配的堆叠', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('0123456789')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 10)
    commander.applyFormat(stackCommentFormatter, 'full')
    selection.setBaseAndExtent(ref.component.state.slot, 3, ref.component.state.slot, 7)
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, 'full'))
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    const sorted = [...ranges].sort((a, b) => a.startIndex - b.startIndex)
    expect(sorted.length).toBe(2)
    expect(sorted[0]).toMatchObject({ startIndex: 0, endIndex: 3, value: 'full' })
    expect(sorted[1]).toMatchObject({ startIndex: 7, endIndex: 10, value: 'full' })
  })

  test('可堆叠：PendingErasure(true) 等价于整类清空（选区内该 Formatter 全部区间清除）', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'u1')
    commander.applyFormat(stackCommentFormatter, 'u2')
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(true))
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(0)
  })

  test('对象取值：PendingErasure(false, obj) 仅在结构相等时清除对应堆叠', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackNoteObjectFormatter, { id: 1 })
    commander.applyFormat(stackNoteObjectFormatter, { id: 2 })
    commander.unApplyFormat(stackNoteObjectFormatter, new PendingErasure(false, { id: 1 }))
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackNoteObjectFormatter, 0, 99)
    expect(ranges.length).toBe(1)
    expect(ranges[0].value).toEqual({ id: 2 })
  })

  test('PendingErasure(false, 无匹配取值) 为稳定 no-op（堆叠条数与取值不变）', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'one')
    commander.applyFormat(stackCommentFormatter, 'two')
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, '__none__'))
    await sleep()
    const ranges = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(ranges.length).toBe(2)
    const vals = ranges.map((r: { value: string }) => r.value).sort()
    expect(vals).toEqual(['one', 'two'])
  })

  test('历史：unApplyFormat + PendingErasure(false) 可撤销 / 重做', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const history = editor.get(History)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'h-a')
    await sleep()
    commander.applyFormat(stackCommentFormatter, 'h-b')
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(2)
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, 'h-b'))
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(1)
    history.back()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(2)
    history.forward()
    await sleep()
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99).length).toBe(1)
    expect(ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)[0].value).toBe('h-a')
  })

  test('跨多个插槽作用域：各段分别按 PendingErasure(false) 清除匹配取值', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: stackableEditorFormattersWithObject
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const p1 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p1.state.slot.insert('aa')
    const p2 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p2.state.slot.insert('bb')
    rootSlot.insert(p1)
    rootSlot.insert(p2)
    const root = new RootComponent({ slot: rootSlot })
    await editor.render(root)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(p1.state.slot, 0, p1.state.slot, 2)
    commander.applyFormat(stackCommentFormatter, 'keep')
    commander.applyFormat(stackCommentFormatter, 'drop')
    selection.setBaseAndExtent(p2.state.slot, 0, p2.state.slot, 2)
    commander.applyFormat(stackCommentFormatter, 'keep')
    commander.applyFormat(stackCommentFormatter, 'drop')
    selection.setBaseAndExtent(p1.state.slot, 0, p2.state.slot, 2)
    commander.unApplyFormat(stackCommentFormatter, new PendingErasure(false, 'drop'))
    await sleep()
    const r1 = p1.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    const r2 = p2.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(r1.length).toBe(1)
    expect(r1[0].value).toBe('keep')
    expect(r2.length).toBe(1)
    expect(r2[0].value).toBe('keep')
  })

  test('普通 Formatter（bold）：PendingErasure(false) 仅当与存储值一致时清除；PendingErasure(true) 整段清空', async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const s = ref.component.state.slot

    selection.setBaseAndExtent(s, 0, s, 3)
    commander.applyFormat(boldFormatter, true)
    await sleep()
    commander.unApplyFormat(boldFormatter, new PendingErasure(false, false))
    await sleep()
    expect(s.getFormatRangesByFormatter(boldFormatter, 0, 99).length).toBeGreaterThan(0)

    commander.unApplyFormat(boldFormatter, new PendingErasure(false, true))
    await sleep()
    expect(s.getFormatRangesByFormatter(boldFormatter, 0, 99).length).toBe(0)

    commander.applyFormat(boldFormatter, true)
    await sleep()
    commander.unApplyFormat(boldFormatter, new PendingErasure(true))
    await sleep()
    expect(s.getFormatRangesByFormatter(boldFormatter, 0, 99).length).toBe(0)
  })

  test('普通 Formatter（fontSize）：错值 no-op；PendingErasure(true) 整段清空', async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    const root = new RootComponent({ slot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const s = ref.component.state.slot

    selection.setBaseAndExtent(s, 0, s, 3)
    commander.applyFormat(fontSizeFormatter, '12px')
    await sleep()
    commander.unApplyFormat(fontSizeFormatter, new PendingErasure(false, '16px'))
    await sleep()
    expect(s.getFormatRangesByFormatter(fontSizeFormatter, 0, 99).some((r: { value: string }) => r.value === '12px')).toBe(true)

    commander.unApplyFormat(fontSizeFormatter, new PendingErasure(true))
    await sleep()
    expect(s.getFormatRangesByFormatter(fontSizeFormatter, 0, 99).length).toBe(0)
  })
})

