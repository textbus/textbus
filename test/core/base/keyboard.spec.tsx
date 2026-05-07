/**
 * Keyboard：全局/组件快捷键注册与 execShortcut，以及 Zen 语法糖（addZenCodingInterceptor + 组件 shortcutList）。
 */
import {
  Component,
  ContentType,
  Keyboard,
  KeymapState,
  NativeSelectionBridge,
  RootComponentRef,
  Selection,
  Slot,
  useDynamicShortcut
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import {
  Editor,
  InlineComponent,
  ParagraphComponent,
  RootComponent,
  ZenBlock
} from '../../_editor/_api'

const bridgeProviders = [
  { provide: NativeSelectionBridge, useClass: NodeSelectionBridge }
]

function agent(key: string): KeymapState['agent'] {
  return { key, code: `Key${key.toUpperCase()}`, keyCode: 0 }
}

function keymap(partial: Partial<Omit<KeymapState, 'agent'>> & { key: string }): KeymapState {
  return {
    modKey: false,
    altKey: false,
    shiftKey: false,
    ...partial,
    agent: agent(partial.key)
  }
}

/** 继承根组件，沿用 RootComponent 的 componentName 与测试 Editor 中的视图映射 */
class DynamicShortcutRoot extends RootComponent {
  dynHit = false
  override setup() {
    const self = this as DynamicShortcutRoot
    useDynamicShortcut({
      keymap: { key: 'q', modKey: true },
      action: () => {
        self.dynHit = true
        return true
      }
    })
  }
}

function createEditor(host: HTMLElement, zenCoding = false) {
  return new Editor(host, {
    providers: bridgeProviders,
    zenCoding,
    components: [DynamicShortcutRoot, ParagraphComponent, InlineComponent, ZenBlock]
  })
}

describe('Keyboard — execShortcut 前置条件', () => {
  test('无选区时 execShortcut 为 false', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host, true)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('x')
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    editor.get(Selection).unSelect()
    expect(keyboard.execShortcut(keymap({ key: 'a' }))).toBe(false)
    editor.destroy()
    host.remove()
  })
})

describe('Keyboard — addShortcut 与 remove', () => {
  let editor!: Editor
  let host!: HTMLDivElement

  beforeEach(async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    editor = createEditor(host)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('ab')
    await editor.render(root)
    editor.get(Selection).selectFirstPosition(editor.get(RootComponentRef).component, false, true)
  })

  afterEach(() => {
    editor.destroy()
    host.remove()
  })

  test('字符串 key 不区分大小写', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({
      keymap: { key: 'g' },
      action: spy
    })
    expect(keyboard.execShortcut(keymap({ key: 'G' }))).toBe(true)
    expect(spy).toHaveBeenCalledWith('G')
  })

  test('key 数组任一命中即触发', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({
      keymap: { key: ['h', 'j'] },
      action: spy
    })
    expect(keyboard.execShortcut(keymap({ key: 'j' }))).toBe(true)
    expect(spy).toHaveBeenCalledWith('j')
  })

  test('Key 语法糖：RegExp.match', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({
      keymap: {
        key: { name: 'rx', match: /^f$/i }
      },
      action: spy
    })
    expect(keyboard.execShortcut(keymap({ key: 'F' }))).toBe(true)
    expect(spy).toHaveBeenCalledWith('F')
  })

  test('Key 语法糖：match 函数 + RawKeyAgent', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({
      keymap: {
        key: {
          name: 'fn',
          match: (k: string, a: KeymapState['agent']) => k === 'm' && a.code === 'KeyM'
        }
      },
      action: spy
    })
    expect(keyboard.execShortcut(keymap({ key: 'm' }))).toBe(true)
    expect(spy).toHaveBeenCalledWith('m')
  })

  test('修饰键必须完全一致：缺 modKey 不匹配', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({
      keymap: { key: '1', modKey: true },
      action: spy
    })
    expect(keyboard.execShortcut(keymap({ key: '1', modKey: false }))).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  test('altKey / shiftKey 组合', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({
      keymap: { key: '2', altKey: true, shiftKey: true },
      action: spy
    })
    expect(
      keyboard.execShortcut(
        keymap({ key: '2', altKey: true, shiftKey: true })
      )
    ).toBe(true)
    expect(
      keyboard.execShortcut(
        keymap({ key: '2', altKey: true, shiftKey: false })
      )
    ).toBe(false)
  })

  test('action 返回 false 时继续匹配列表中下一项（后注册的先被尝试）', () => {
    const keyboard = editor.get(Keyboard)
    const tryOlder = jest.fn().mockReturnValue(true)
    const tryNewer = jest.fn().mockReturnValue(false)
    keyboard.addShortcut({ keymap: { key: 'n' }, action: tryOlder })
    keyboard.addShortcut({ keymap: { key: 'n' }, action: tryNewer })
    expect(keyboard.execShortcut(keymap({ key: 'n' }))).toBe(true)
    expect(tryNewer).toHaveBeenCalled()
    expect(tryOlder).toHaveBeenCalled()
  })

  test('remove 后不再触发', () => {
    const keyboard = editor.get(Keyboard)
    const spy = jest.fn().mockReturnValue(true)
    const { remove } = keyboard.addShortcut({
      keymap: { key: 'r' },
      action: spy
    })
    expect(keyboard.execShortcut(keymap({ key: 'r' }))).toBe(true)
    remove()
    expect(keyboard.execShortcut(keymap({ key: 'r' }))).toBe(false)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('后注册的快捷键优先于先注册（同条件）', () => {
    const keyboard = editor.get(Keyboard)
    const a = jest.fn().mockReturnValue(true)
    const b = jest.fn().mockReturnValue(true)
    keyboard.addShortcut({ keymap: { key: 'u' }, action: a })
    keyboard.addShortcut({ keymap: { key: 'u' }, action: b })
    keyboard.execShortcut(keymap({ key: 'u' }))
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })
})

describe('Keyboard — useDynamicShortcut（根 setup）', () => {
  test('execShortcut 命中根上动态快捷键', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('t')
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    const r = root as DynamicShortcutRoot
    r.dynHit = false
    editor.get(Selection).selectFirstPosition(r, false, true)
    expect(keyboard.execShortcut(keymap({ key: 'q', modKey: true }))).toBe(true)
    expect(r.dynHit).toBe(true)
    editor.destroy()
    host.remove()
  })
})

describe('Keyboard — Zen addZenCodingInterceptor', () => {
  test('折叠单字符串插槽 + 无修饰键时触发', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host, true)
    const rootSlot = new Slot([ContentType.Text])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('zc')
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    editor.get(Selection).setPosition(rootSlot, 2)
    const zenSpy = jest.fn().mockReturnValue(true)
    const { remove } = keyboard.addZenCodingInterceptor({
      match: (c: string) => c === 'zc',
      try: (k: string) => k === ' ',
      action: zenSpy
    })
    expect(
      keyboard.execShortcut(
        keymap({ key: ' ', modKey: false, shiftKey: false, altKey: false })
      )
    ).toBe(true)
    expect(zenSpy).toHaveBeenCalledWith('zc')
    zenSpy.mockClear()
    remove()
    expect(
      keyboard.execShortcut(
        keymap({ key: ' ', modKey: false, shiftKey: false, altKey: false })
      )
    ).toBe(false)
    expect(zenSpy).not.toHaveBeenCalled()
    editor.destroy()
    host.remove()
  })

  test('zenCoding 关闭时不走 Zen 分支', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host, false)
    const rootSlot = new Slot([ContentType.Text])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('zc')
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    editor.get(Selection).setPosition(rootSlot, 2)
    const zenSpy = jest.fn().mockReturnValue(true)
    keyboard.addZenCodingInterceptor({
      match: () => true,
      try: () => true,
      action: zenSpy
    })
    expect(keyboard.execShortcut(keymap({ key: ' ' }))).toBe(false)
    expect(zenSpy).not.toHaveBeenCalled()
    editor.destroy()
    host.remove()
  })

  test('有修饰键时不走 Zen', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host, true)
    const rootSlot = new Slot([ContentType.Text])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('zc')
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    editor.get(Selection).setPosition(rootSlot, 2)
    const zenSpy = jest.fn().mockReturnValue(true)
    keyboard.addZenCodingInterceptor({
      match: () => true,
      try: () => true,
      action: zenSpy
    })
    expect(keyboard.execShortcut(keymap({ key: ' ', modKey: true }))).toBe(false)
    expect(zenSpy).not.toHaveBeenCalled()
    editor.destroy()
    host.remove()
  })

  test('插槽内多段内容时不触发 Zen', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host, true)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('a')
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('b')
    rootSlot.insert(p)
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    editor.get(Selection).setPosition(rootSlot, 1)
    const zenSpy = jest.fn().mockReturnValue(true)
    keyboard.addZenCodingInterceptor({
      match: () => true,
      try: () => true,
      action: zenSpy
    })
    expect(keyboard.execShortcut(keymap({ key: ' ' }))).toBe(false)
    expect(zenSpy).not.toHaveBeenCalled()
    editor.destroy()
    host.remove()
  })
})

describe('Keyboard — 组件静态 zenCoding（ZenBlock）', () => {
  test('match + 空格插入块', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host, true)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    rootSlot.insert('zb')
    await editor.render(root)
    const keyboard = editor.get(Keyboard)
    editor.get(Selection).setPosition(rootSlot, 2)
    expect(
      rootSlot.sliceContent().some(c => typeof c !== 'string' && (c as Component).name === ZenBlock.componentName)
    ).toBe(false)
    expect(
      keyboard.execShortcut(
        keymap({ key: ' ', modKey: false, shiftKey: false, altKey: false })
      )
    ).toBe(true)
    expect(
      rootSlot.sliceContent().some(c => typeof c !== 'string' && (c as Component).name === ZenBlock.componentName)
    ).toBe(true)
    editor.destroy()
    host.remove()
  })
})

describe('Keyboard — 组件 shortcutList 与全局顺序', () => {
  test('段内 shortcutList 先于全局 addShortcut', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('x')
    rootSlot.insert(p)
    await editor.render(root)
    const compFn = jest.fn().mockReturnValue(true)
    const globalFn = jest.fn().mockReturnValue(true)
    p.shortcutList.push({
      keymap: { key: 'p' },
      action: compFn
    })
    editor.get(Keyboard).addShortcut({
      keymap: { key: 'p' },
      action: globalFn
    })
    editor.get(Selection).selectFirstPosition(p, false, true)
    expect(editor.get(Keyboard).execShortcut(keymap({ key: 'p' }))).toBe(true)
    expect(compFn).toHaveBeenCalled()
    expect(globalFn).not.toHaveBeenCalled()
    editor.destroy()
    host.remove()
  })

  test('组件 action 返回 false 时回落到全局', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const editor = createEditor(host)
    const rootSlot = new Slot([ContentType.Text, ContentType.BlockComponent, ContentType.InlineComponent])
    const root = new DynamicShortcutRoot({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('x')
    rootSlot.insert(p)
    await editor.render(root)
    const compFn = jest.fn().mockReturnValue(false)
    const globalFn = jest.fn().mockReturnValue(true)
    p.shortcutList.push({
      keymap: { key: 'w' },
      action: compFn
    })
    editor.get(Keyboard).addShortcut({
      keymap: { key: 'w' },
      action: globalFn
    })
    editor.get(Selection).selectFirstPosition(p, false, true)
    expect(editor.get(Keyboard).execShortcut(keymap({ key: 'w' }))).toBe(true)
    expect(compFn).toHaveBeenCalled()
    expect(globalFn).toHaveBeenCalled()
    editor.destroy()
    host.remove()
  })
})
