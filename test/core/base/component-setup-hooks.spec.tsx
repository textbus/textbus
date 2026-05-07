/**
 * 覆盖在 {@link setup} 中通过 onXxx 注册的、可由 Commander / Selection / triggerContextMenu / destroy 触发的钩子。
 *
 * 未在本文件做端到端断言的钩子（需原生输入或特定视图路径）：
 * - onCompositionStart / onCompositionUpdate / onCompositionEnd（platform-browser magic-input）
 * - onParentSlotUpdated（Adapter 在子组件再次参与 VDOM 构建时触发，与具体 diff 路径相关）
 * - onSelectionFromFront / onSelectionFromEnd（跨组件边界移动光标时的边界行为）
 */
import {
  Commander,
  ContentType,
  NativeSelectionBridge,
  RootComponentRef,
  Selection,
  Slot,
  triggerContextMenu
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter, textAlignAttribute } from '../../_editor/_api'
import {
  hookProbeLog,
  HookProbeEditor,
  HookProbeParagraphComponent,
  HookProbeRootComponent
} from '../../_editor/hook-probe-editor'
import { sleep } from '../../util'

const bridgeProviders = [
  { provide: NativeSelectionBridge, useClass: NodeSelectionBridge }
]

function has(hook: string) {
  return hookProbeLog.some(e => e.includes(hook))
}

function countHook(hook: string) {
  return hookProbeLog.filter(e => e.endsWith(`:${hook}`)).length
}

describe('组件 setup 事件钩子', () => {
  let editor!: HookProbeEditor
  let paragraph!: HookProbeParagraphComponent

  beforeEach(async () => {
    hookProbeLog.length = 0
    editor = new HookProbeEditor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const p = new HookProbeParagraphComponent({
      slot: new Slot([ContentType.Text])
    })
    paragraph = p
    p.state.slot.insert('para')
    rootSlot.insert('a')
    rootSlot.insert(p)
    rootSlot.insert('b')
    const root = new HookProbeRootComponent({ slot: rootSlot })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('选区变化触发 onGetRanges / onFocusIn（等）', async () => {
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    await sleep()
    expect(countHook('onGetRanges')).toBeGreaterThan(0)
    expect(countHook('onFocusIn')).toBeGreaterThan(0)
  })

  test('Commander.write 触发 onContentInsert 与 onContentInserted', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    commander.write('X')
    await sleep()
    expect(has('paragraph:onContentInsert')).toBe(true)
    expect(has('paragraph:onContentInserted')).toBe(true)
  })

  test('Commander.delete 触发 onContentDelete 与 onContentDeleted', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    selection.setBaseAndExtent(selection.focusSlot!, 0, selection.focusSlot!, 2)
    commander.delete()
    await sleep()
    expect(has('paragraph:onContentDelete')).toBe(true)
    expect(has('paragraph:onContentDeleted')).toBe(true)
  })

  test('Commander.break 触发 onBreak', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    selection.setPosition(selection.focusSlot!, 2)
    commander.break()
    await sleep()
    expect(has('paragraph:onBreak')).toBe(true)
  })

  test('Commander.paste 触发 onPaste', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    selection.setPosition(selection.focusSlot!, 1)
    const buf = new Slot([ContentType.Text])
    buf.insert('Z')
    commander.paste(buf, 't')
    await sleep()
    expect(has('paragraph:onPaste')).toBe(true)
  })

  test('Commander.applyAttribute 触发 onSlotSetAttribute', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    commander.applyAttribute(textAlignAttribute, 'center')
    await sleep()
    expect(has('paragraph:onSlotSetAttribute')).toBe(true)
  })

  test('Commander.applyFormat 触发 onSlotApplyFormat', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    commander.write('ab')
    selection.setBaseAndExtent(selection.focusSlot!, 0, selection.focusSlot!, 2)
    commander.applyFormat(boldFormatter, true)
    await sleep()
    expect(has('paragraph:onSlotApplyFormat')).toBe(true)
  })

  test('triggerContextMenu 触发 onContextMenu', () => {
    hookProbeLog.length = 0
    const ref = editor.get(RootComponentRef)
    triggerContextMenu(ref.component)
    expect(has('root:onContextMenu')).toBe(true)
  })

  test('选中整块组件触发 onSelected，离开选区触发 onUnselect', async () => {
    const selection = editor.get(Selection)
    hookProbeLog.length = 0
    selection.selectComponent(paragraph)
    await sleep()
    expect(has('paragraph:onSelected')).toBe(true)

    hookProbeLog.length = 0
    selection.selectFirstPosition(paragraph, false, true)
    await sleep()
    expect(has('paragraph:onUnselect')).toBe(true)
  })
})

describe('组件 setup 钩子 — onDetach / onFocus / onBlur', () => {
  test('destroy 根实例时触发组件 onDetach', async () => {
    hookProbeLog.length = 0
    const ed = new HookProbeEditor(document.body, { providers: bridgeProviders })
    const root = new HookProbeRootComponent({
      slot: new Slot([ContentType.Text])
    })
    root.state.slot.insert('x')
    await ed.render(root)
    ed.destroy()
    expect(has('root:onDetach')).toBe(true)
  })

  test('选区在块内时触发 onFocus，切换插槽时触发 onBlur', async () => {
    hookProbeLog.length = 0
    const ed = new HookProbeEditor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent])
    const p = new HookProbeParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('hi')
    rootSlot.insert('r')
    rootSlot.insert(p)
    const root = new HookProbeRootComponent({ slot: rootSlot })
    await ed.render(root)
    const selection = ed.get(Selection)
    hookProbeLog.length = 0
    selection.selectFirstPosition(p, false, true)
    await sleep()
    expect(has('paragraph:onFocus')).toBe(true)

    hookProbeLog.length = 0
    selection.selectFirstPosition(root, false, true)
    await sleep()
    expect(has('paragraph:onBlur')).toBe(true)
    ed.destroy()
  })
})
