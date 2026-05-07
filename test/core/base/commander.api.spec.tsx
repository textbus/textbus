import {
  Adapter,
  Attribute,
  Commander,
  ContentType,
  NativeSelectionBridge,
  RootComponentRef,
  Selection,
  Slot,
  TransformRule
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import {
  boldFormatter,
  Editor,
  fontSizeFormatter,
  ParagraphComponent,
  RootComponent,
  textAlignAttribute
} from '../../_editor/_api'
import { sleep } from '../../util'

const bridgeProviders = [
  { provide: NativeSelectionBridge, useClass: NodeSelectionBridge }
]

function noopAttrRender(): void {
  void 0
}

describe('Commander API — write / insert 重载', () => {
  let editor!: Editor

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const root = new RootComponent({
      slot: new Slot([ContentType.Text])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('write(content) 无格式', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    expect(commander.write('ab')).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('ab')
  })

  test('write(content, formatter, value)', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    expect(commander.write('x', boldFormatter, true)).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('<strong>x</strong>')
  })

  test('write(content, Formats[])', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    expect(commander.write('z', [
      [boldFormatter, true],
      [fontSizeFormatter, '10px']
    ])).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('10px')
    expect(editor.getHTML()).toContain('z')
  })

  test('write：选区非闭合时先删后写', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('012345')
    selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 4)
    commander.write('X')
    await sleep()
    expect(editor.getHTML()).toContain('0X45')
  })

  test('insert(content) 与 insert(content, formatter, value) 与 insert(content, Formats)', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('hi')
    selection.setPosition(selection.focusSlot!, 1)
    expect(commander.insert('!')).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('h!i')

    selection.setPosition(selection.focusSlot!, 3)
    expect(commander.insert('x', boldFormatter, true)).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('<strong>x</strong>')

    selection.selectLastPosition(ref.component, false, true)
    expect(commander.insert('end', [[fontSizeFormatter, '8px']])).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('8px')
  })
})

describe('Commander API — delete 重载', () => {
  let editor!: Editor

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const slot = new Slot([ContentType.Text, ContentType.InlineComponent])
    const root = new RootComponent({ slot })
    slot.insert('abcd')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('delete() 默认向前删除', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    selection.setPosition(selection.focusSlot!, 2)
    commander.delete()
    await sleep()
    expect(editor.getHTML()).toContain('acd')
  })

  test('delete(true) 显式向前', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    selection.setPosition(selection.focusSlot!, 2)
    commander.delete(true)
    await sleep()
    expect(editor.getHTML()).toContain('acd')
  })

  test('delete(false) 向后删除', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    selection.setPosition(selection.focusSlot!, 1)
    commander.delete(false)
    await sleep()
    expect(editor.getHTML()).toContain('acd')
  })

  test('delete(receiver) 与 delete(receiver, false)', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 3)
    const received: string[] = []
    commander.delete(s => {
      received.push(s.sliceContent().join(''))
    })
    await sleep()
    expect(received.length).toBe(1)
    expect(received[0]).toBe('bc')

    commander.write('xyz')
    selection.setBaseAndExtent(selection.focusSlot!, 0, selection.focusSlot!, 3)
    const r2: string[] = []
    commander.delete(s => r2.push(s.sliceContent().join('')), false)
    await sleep()
    expect(r2.length).toBe(1)
  })

  test('delete：无选区时返回 false', () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.unSelect()
    expect(commander.delete()).toBe(false)
  })
})

describe('Commander API — break', () => {
  let editor!: Editor

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const root = new RootComponent({
      slot: new Slot([ContentType.Text])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('break：无选区返回 false', () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.unSelect()
    expect(commander.break()).toBe(false)
  })

  test('break：在文本中间插入换行', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('ab')
    selection.setPosition(selection.focusSlot!, 1)
    expect(commander.break()).toBe(true)
    await sleep()
    expect(editor.getHTML()).toMatch(/<br/)
  })

  test('break：选区非闭合时先删后换行', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('abcd')
    selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 3)
    expect(commander.break()).toBe(true)
    await sleep()
    expect(editor.getHTML()).toMatch(/<br/)
    expect(editor.getHTML()).not.toContain('bc')
  })
})

describe('Commander API — insertBefore / insertAfter / replaceComponent / removeComponent', () => {
  let editor!: Editor
  let p1!: ParagraphComponent
  let p2!: ParagraphComponent

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const slot = new Slot([ContentType.Text, ContentType.BlockComponent])
    const root = new RootComponent({ slot })
    p1 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p1.state.slot.insert('a')
    p2 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p2.state.slot.insert('b')
    slot.insert(p1)
    slot.insert(p2)
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('insertBefore：将已存在的块移到参照块之前', async () => {
    const commander = editor.get(Commander)
    expect(commander.insertBefore(p2, p1)).toBe(true)
    await sleep()
    const html = editor.getHTML()
    const i1 = html.indexOf('>a<')
    const i2 = html.indexOf('>b<')
    expect(i2).toBeLessThan(i1)
  })

  test('insertAfter：将已存在的块移到参照块之后', async () => {
    const commander = editor.get(Commander)
    expect(commander.insertAfter(p1, p2)).toBe(true)
    await sleep()
    const html = editor.getHTML()
    const i1 = html.indexOf('>a<')
    const i2 = html.indexOf('>b<')
    expect(i1).toBeGreaterThan(i2)
  })

  test('replaceComponent', async () => {
    const commander = editor.get(Commander)
    const p3 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p3.state.slot.insert('c')
    expect(commander.replaceComponent(p1, p3)).toBe(true)
    await sleep()
    expect(editor.getHTML()).toContain('>c<')
    expect(editor.getHTML()).not.toContain('>a<')
  })

  test('removeComponent', async () => {
    const commander = editor.get(Commander)
    expect(commander.removeComponent(p2)).toBe(true)
    await sleep()
    expect(editor.getHTML()).not.toContain('>b<')
  })

  test('removeComponent：无父级时返回 false', () => {
    const commander = editor.get(Commander)
    const orphan = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    expect(commander.removeComponent(orphan)).toBe(false)
  })

  test('replaceComponent：删除失败时返回 false', () => {
    const commander = editor.get(Commander)
    const orphan = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    const p3 = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    expect(commander.replaceComponent(orphan, p3)).toBe(false)
  })

  test('insertBefore：ref 无父级时返回 false', () => {
    const commander = editor.get(Commander)
    const orphan = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    expect(commander.insertBefore(p1, orphan)).toBe(false)
  })

  test('insertAfter：ref 无父级时返回 false', () => {
    const commander = editor.get(Commander)
    const orphan = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    expect(commander.insertAfter(p1, orphan)).toBe(false)
  })
})

describe('Commander API — copy / cut / paste', () => {
  test('copy 调用适配器 copy', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const adapter = editor.get(Adapter)
      const spy = jest.spyOn(adapter, 'copy').mockImplementation(() => {
        void 0
      })
      editor.get(Commander).copy()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    } finally {
      editor.destroy()
    }
  })

  test('cut：闭合选区返回 false', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const ref = editor.get(RootComponentRef)
      selection.selectFirstPosition(ref.component, false, true)
      const adapter = editor.get(Adapter)
      jest.spyOn(adapter, 'copy').mockImplementation(() => {
        void 0
      })
      expect(commander.cut()).toBe(false)
    } finally {
      editor.destroy()
    }
  })

  test('cut：非闭合选区删除并曾调用 copy', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const ref = editor.get(RootComponentRef)
      selection.selectFirstPosition(ref.component, false, true)
      commander.write('hello')
      selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 4)
      const adapter = editor.get(Adapter)
      const spy = jest.spyOn(adapter, 'copy').mockImplementation(() => {
        void 0
      })
      expect(commander.cut()).toBe(true)
      expect(spy).toHaveBeenCalled()
      await sleep()
      expect(editor.getHTML()).toContain('ho')
      spy.mockRestore()
    } finally {
      editor.destroy()
    }
  })

  test('paste：空剪贴板插槽返回 false', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const ref = editor.get(RootComponentRef)
      selection.selectFirstPosition(ref.component, false, true)
      commander.write('abc')
      const emptyPaste = new Slot([ContentType.Text])
      expect(commander.paste(emptyPaste, '')).toBe(false)
    } finally {
      editor.destroy()
    }
  })

  test('paste：无选区返回 false', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const buf = new Slot([ContentType.Text])
      buf.insert('z')
      editor.get(Selection).unSelect()
      expect(editor.get(Commander).paste(buf, 't')).toBe(false)
    } finally {
      editor.destroy()
    }
  })

  test('paste：有内容时插入 delta', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const ref = editor.get(RootComponentRef)
      selection.selectFirstPosition(ref.component, false, true)
      commander.write('xx')
      selection.setPosition(selection.focusSlot!, 1)
      const buf = new Slot([ContentType.Text])
      buf.insert('Z')
      expect(commander.paste(buf, 'ignored')).toBe(true)
      await sleep()
      expect(editor.getHTML()).toContain('xZx')
    } finally {
      editor.destroy()
    }
  })
})

describe('Commander API — cleanFormats / cleanAttributes', () => {
  let editor!: Editor

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const root = new RootComponent({
      slot: new Slot([ContentType.Text])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('cleanFormats 数组谓词与函数谓词', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('abcd', boldFormatter, true)
    commander.applyFormat(fontSizeFormatter, '11px')
    selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 3)
    commander.cleanFormats([boldFormatter])
    await sleep()
    expect(editor.getHTML()).toMatch(/font-size:11px/)
    expect(editor.getHTML()).not.toMatch(/<strong[^>]*>b<\/strong>/)

    const slot = selection.focusSlot!
    selection.setBaseAndExtent(slot, 0, slot, slot.length)
    commander.cleanFormats(f => f.name === 'strong')
    await sleep()
    expect(editor.getHTML()).not.toContain('<strong>')
  })

  test('cleanAttributes：保留列表与谓词', async () => {
    const attrKeep = new Attribute<string>('keep', { render: noopAttrRender })
    const attrDrop = new Attribute<string>('drop', { render: noopAttrRender })
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('wx')
    const slot = selection.focusSlot!
    selection.setBaseAndExtent(slot, 0, slot, slot.length)
    commander.applyAttribute(attrKeep, 'k')
    commander.applyAttribute(attrDrop, 'd')
    commander.cleanAttributes([attrKeep])
    await sleep()
    expect(slot.hasAttribute(attrKeep)).toBe(true)
    expect(slot.hasAttribute(attrDrop)).toBe(false)

    commander.applyAttribute(attrDrop, 'd2')
    commander.cleanAttributes(a => a.name === 'keep')
    await sleep()
    expect(slot.hasAttribute(attrKeep)).toBe(true)
    expect(slot.hasAttribute(attrDrop)).toBe(false)
  })
})

describe('Commander API — applyFormat / unApplyFormat / applyAttribute / unApplyAttribute', () => {
  let editor!: Editor

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    const root = new RootComponent({
      slot: new Slot([ContentType.Text])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('applyFormat + unApplyFormat（闭合与展开选区）', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('hello')
    selection.setPosition(selection.focusSlot!, 3)
    commander.applyFormat(boldFormatter, true)
    await sleep()
    expect(editor.getHTML()).toContain('<strong>')

    commander.unApplyFormat(boldFormatter)
    await sleep()

    selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 4)
    commander.applyFormat(fontSizeFormatter, '9px')
    await sleep()
    expect(editor.getHTML()).toContain('9px')
  })

  test('applyAttribute / unApplyAttribute（闭合选区）', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('t')
    commander.applyAttribute(textAlignAttribute, 'justify')
    await sleep()
    expect(editor.getHTML()).toContain('justify')

    commander.unApplyAttribute(textAlignAttribute)
    await sleep()
    expect(editor.getHTML()).not.toContain('justify')
  })

  test('applyAttribute / unApplyAttribute（展开选区）', async () => {
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    commander.write('abcd')
    selection.setBaseAndExtent(selection.focusSlot!, 1, selection.focusSlot!, 3)
    commander.applyAttribute(textAlignAttribute, 'center')
    await sleep()
    expect(editor.getHTML()).toContain('center')

    commander.unApplyAttribute(textAlignAttribute)
    await sleep()
    expect(editor.getHTML()).not.toContain('center')
  })
})

describe('Commander API — 无选区与非法插入', () => {
  test('write / insert 在无选区时返回 false', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const commander = editor.get(Commander)
      editor.get(Selection).unSelect()
      expect(commander.write('x')).toBe(false)
      expect(commander.insert('x')).toBe(false)
    } finally {
      editor.destroy()
    }
  })

  test('insert：目标 schema 不接受块级时返回 false', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const commander = editor.get(Commander)
      const selection = editor.get(Selection)
      const ref = editor.get(RootComponentRef)
      selection.selectFirstPosition(ref.component, false, true)
      const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
      expect(commander.insert(p)).toBe(false)
    } finally {
      editor.destroy()
    }
  })
})

describe('Commander API — transform', () => {
  test('无选区时 transform 返回 false', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    try {
      const root = new RootComponent({ slot: new Slot([ContentType.Text]) })
      await editor.render(root)
      const selection = editor.get(Selection)
      selection.unSelect()
      const rule: TransformRule = {
        targetType: ContentType.Text,
        slotFactory: () => new Slot([ContentType.Text]),
        stateFactory: () => []
      }
      expect(editor.get(Commander).transform(rule)).toBe(false)
    } finally {
      editor.destroy()
    }
  })
})
