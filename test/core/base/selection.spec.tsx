/**
 * 校验 Selection 在 setBaseAndExtent / API 设置后：
 * - anchor* / focus* 为调用方传入的锚点与焦点（经 Slot.retain 修正后的 index）
 * - start* / end* 为文档顺序上的「较小」端与「较大」端（由路径比较归一化）
 *
 * 明确不覆盖（均依赖 `NativeSelectionBridge.getPreviousLinePositionByCurrent` /
 * `getNextLinePositionByCurrent` 的平台行盒几何）：
 * `toPreviousLine`、`toNextLine`、`wrapToPreviousLine`、`wrapToNextLine`。
 */
import {
  ContentType,
  NativeSelectionBridge,
  RootComponentRef,
  Selection,
  Slot,
  SlotRange
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { Editor, ParagraphComponent, RootComponent } from '../../_editor/_api'

const bridgeProviders = [
  { provide: NativeSelectionBridge, useClass: NodeSelectionBridge }
]

function expectRangeMatchesGetRanges(selection: Selection) {
  const ranges = selection.getRanges()
  expect(ranges.length).toBe(1)
  expect(ranges[0].startSlot).toBe(selection.startSlot)
  expect(ranges[0].startOffset).toBe(selection.startOffset)
  expect(ranges[0].endSlot).toBe(selection.endSlot)
  expect(ranges[0].endOffset).toBe(selection.endOffset)
}

describe('Selection — anchor/focus 与 start/end 归一化', () => {
  let editor!: Editor
  let rootSlot!: Slot
  let paragraph!: ParagraphComponent
  let paragraphSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('abcde')
    paragraph = new ParagraphComponent({
      slot: new Slot([ContentType.Text])
    })
    paragraphSlot = paragraph.state.slot
    paragraphSlot.insert('xyz')
    rootSlot.insert(paragraph)
    rootSlot.insert('!')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('同插槽正向：start/end 与 anchor/focus 一致', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 4)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(1)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.focusOffset).toBe(4)
    expect(selection.startSlot).toBe(rootSlot)
    expect(selection.startOffset).toBe(1)
    expect(selection.endSlot).toBe(rootSlot)
    expect(selection.endOffset).toBe(4)
    expect(selection.isCollapsed).toBe(false)
    expectRangeMatchesGetRanges(selection)
  })

  test('同插槽反向：start/end 为文档序较小→较大端，anchor/focus 保持调用顺序', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 4, rootSlot, 1)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(4)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.focusOffset).toBe(1)
    expect(selection.startSlot).toBe(rootSlot)
    expect(selection.startOffset).toBe(1)
    expect(selection.endSlot).toBe(rootSlot)
    expect(selection.endOffset).toBe(4)
    expectRangeMatchesGetRanges(selection)
  })

  test('同插槽折叠：anchor/focus/start/end 四元一致', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 3, rootSlot, 3)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(3)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.focusOffset).toBe(3)
    expect(selection.startSlot).toBe(rootSlot)
    expect(selection.startOffset).toBe(3)
    expect(selection.endSlot).toBe(rootSlot)
    expect(selection.endOffset).toBe(3)
    expect(selection.isCollapsed).toBe(true)
    expectRangeMatchesGetRanges(selection)
  })

  test('跨插槽正向（根 → 段落内）：start 为锚点侧，end 为焦点侧', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 2, paragraphSlot, 2)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(2)
    expect(selection.focusSlot).toBe(paragraphSlot)
    expect(selection.focusOffset).toBe(2)
    expect(selection.startSlot).toBe(rootSlot)
    expect(selection.startOffset).toBe(2)
    expect(selection.endSlot).toBe(paragraphSlot)
    expect(selection.endOffset).toBe(2)
    expectRangeMatchesGetRanges(selection)
  })

  test('跨插槽反向（段落内 → 根）：start/end 交换为文档序，anchor/focus 不变', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(paragraphSlot, 1, rootSlot, 1)
    expect(selection.anchorSlot).toBe(paragraphSlot)
    expect(selection.anchorOffset).toBe(1)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.focusOffset).toBe(1)
    expect(selection.startSlot).toBe(rootSlot)
    expect(selection.startOffset).toBe(1)
    expect(selection.endSlot).toBe(paragraphSlot)
    expect(selection.endOffset).toBe(1)
    expectRangeMatchesGetRanges(selection)
  })
})

describe('Selection — selectFirstPosition / selectComponent', () => {
  let editor!: Editor
  let rootSlot!: Slot
  let paragraph!: ParagraphComponent

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    paragraph = new ParagraphComponent({
      slot: new Slot([ContentType.Text])
    })
    paragraph.state.slot.insert('inner')
    rootSlot.insert(paragraph)
    rootSlot.insert('tail')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('selectFirstPosition 深进段落：折叠且 anchor 与 start 一致', () => {
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectFirstPosition(ref.component, false, true)
    expect(selection.isCollapsed).toBe(true)
    expect(selection.anchorSlot).toBe(selection.focusSlot)
    expect(selection.anchorOffset).toBe(selection.focusOffset)
    expect(selection.startSlot).toBe(selection.anchorSlot)
    expect(selection.startOffset).toBe(selection.anchorOffset)
    expect(selection.endSlot).toBe(selection.focusSlot)
    expect(selection.endOffset).toBe(selection.focusOffset)
    expect(selection.anchorSlot).toBe(paragraph.state.slot)
    expect(selection.anchorOffset).toBe(0)
    expectRangeMatchesGetRanges(selection)
  })

  test('selectComponent：在父插槽上为 [index, index+1)，start/end 与 getRanges 一致', () => {
    const selection = editor.get(Selection)
    const idx = rootSlot.indexOf(paragraph)
    selection.selectComponent(paragraph)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(idx)
    expect(selection.focusOffset).toBe(idx + 1)
    expect(selection.startSlot).toBe(rootSlot)
    expect(selection.startOffset).toBe(idx)
    expect(selection.endSlot).toBe(rootSlot)
    expect(selection.endOffset).toBe(idx + 1)
    expectRangeMatchesGetRanges(selection)
  })
})

describe('Selection — setPosition / selectSlot / setAnchor+setFocus', () => {
  let editor!: Editor
  let rootSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('012345')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('setPosition：锚点与焦点相同，start/end 与之对齐', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 4)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(4)
    expect(selection.focusOffset).toBe(4)
    expect(selection.startOffset).toBe(4)
    expect(selection.endOffset).toBe(4)
    expect(selection.isCollapsed).toBe(true)
    expectRangeMatchesGetRanges(selection)
  })

  test('selectSlot：整槽选区为 [0, length]，getRanges 一致', () => {
    const selection = editor.get(Selection)
    selection.selectSlot(rootSlot)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.focusSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(0)
    expect(selection.focusOffset).toBe(rootSlot.length)
    expect(selection.startOffset).toBe(0)
    expect(selection.endOffset).toBe(rootSlot.length)
    expectRangeMatchesGetRanges(selection)
  })

  test('setAnchor 后 setFocus：同槽展开，start/end 按文档序', () => {
    const selection = editor.get(Selection)
    selection.setAnchor(rootSlot, 5)
    selection.setFocus(rootSlot, 1)
    expect(selection.anchorOffset).toBe(5)
    expect(selection.focusOffset).toBe(1)
    expect(selection.startOffset).toBe(1)
    expect(selection.endOffset).toBe(5)
    expectRangeMatchesGetRanges(selection)
  })
})

describe('Selection — unSelect', () => {
  test('取消选区后 isSelected 为 false，起止与锚点均为空', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('ab')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 0, rootSlot, 2)
    expect(selection.isSelected).toBe(true)
    selection.unSelect()
    expect(selection.isSelected).toBe(false)
    expect(selection.startSlot).toBeNull()
    expect(selection.endSlot).toBeNull()
    expect(selection.startOffset).toBeNull()
    expect(selection.endOffset).toBeNull()
    expect(selection.anchorSlot).toBeNull()
    expect(selection.focusSlot).toBeNull()
    expect(selection.anchorOffset).toBeNull()
    expect(selection.focusOffset).toBeNull()
    expect(selection.getRanges().length).toBe(0)
    editor.destroy()
  })
})

describe('Selection — selectLastPosition / selectComponentFront / selectComponentEnd', () => {
  let editor!: Editor
  let rootSlot!: Slot
  let paragraph!: ParagraphComponent

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    paragraph = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    paragraph.state.slot.insert('end')
    rootSlot.insert(paragraph)
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('selectLastPosition(deep) 落在段落内最后一处', () => {
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    selection.selectLastPosition(ref.component, false, true)
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusSlot).toBe(paragraph.state.slot)
    expect(selection.focusOffset).toBe(paragraph.state.slot.length)
  })

  test('selectComponentFront 在父插槽上落在组件前', () => {
    const selection = editor.get(Selection)
    const idx = rootSlot.indexOf(paragraph)
    selection.selectComponentFront(paragraph)
    expect(selection.isCollapsed).toBe(true)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(idx)
  })

  test('selectComponentEnd 在父插槽上落在组件后', () => {
    const selection = editor.get(Selection)
    const idx = rootSlot.indexOf(paragraph)
    selection.selectComponentEnd(paragraph)
    expect(selection.isCollapsed).toBe(true)
    expect(selection.anchorSlot).toBe(rootSlot)
    expect(selection.anchorOffset).toBe(idx + 1)
  })

  test('selectLastPosition(deep=false) 不进入子块，落在根插槽末尾', async () => {
    const ed = new Editor(document.body, { providers: bridgeProviders })
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('in')
    slot.insert(p)
    slot.insert('z')
    await ed.render(root)
    const selection = ed.get(Selection)
    const ref = ed.get(RootComponentRef)
    selection.selectLastPosition(ref.component, false, false)
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusSlot).toBe(slot)
    expect(selection.focusOffset).toBe(slot.length)
    ed.destroy()
  })
})

describe('Selection — selectChildSlots', () => {
  test('单插槽块组件：选中子插槽全文', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('child')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.selectChildSlots(p)
    expect(selection.startSlot).toBe(p.state.slot)
    expect(selection.startOffset).toBe(0)
    expect(selection.endSlot).toBe(p.state.slot)
    expect(selection.endOffset).toBe(p.state.slot.length)
    editor.destroy()
  })
})

describe('Selection — selectAll', () => {
  test('根组件单插槽时选中首尾全长', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('m')
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('n')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.selectAll()
    const first = editor.get(RootComponentRef).component.slots[0]!
    expect(selection.startSlot).toBe(first)
    expect(selection.startOffset).toBe(0)
    expect(selection.endSlot).toBe(first)
    expect(selection.endOffset).toBe(first.length)
    editor.destroy()
  })
})

describe('Selection — collapse / toPrevious / toNext / wrapTo*', () => {
  let editor!: Editor
  let rootSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('abcde')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('collapse() 展开选区收拢到 end', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 4)
    selection.collapse()
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusOffset).toBe(4)
    expect(selection.anchorOffset).toBe(4)
  })

  test('collapse(true) 收拢到 start', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 4)
    selection.collapse(true)
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusOffset).toBe(1)
    expect(selection.anchorOffset).toBe(1)
  })

  test('toPrevious 在展开选区上先收拢到起点', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 4)
    selection.toPrevious()
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusOffset).toBe(1)
  })

  test('toNext 在展开选区上先收拢到终点', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 4)
    selection.toNext()
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusOffset).toBe(4)
  })

  test('toNext 在折叠光标上前进一格', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 2)
    selection.toNext()
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusOffset).toBe(3)
  })

  test('toPrevious 在折叠光标上后退一格', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 2)
    selection.toPrevious()
    expect(selection.isCollapsed).toBe(true)
    expect(selection.focusOffset).toBe(1)
  })

  test('wrapToAfter 从折叠位置向右扩展选区', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 2)
    selection.wrapToAfter()
    expect(selection.isCollapsed).toBe(false)
    expect(selection.startOffset).toBe(2)
    expect(selection.endOffset).toBe(3)
  })

  test('wrapToBefore 从折叠位置向左扩展选区', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 2)
    selection.wrapToBefore()
    expect(selection.isCollapsed).toBe(false)
    expect(selection.startOffset).toBe(1)
    expect(selection.endOffset).toBe(2)
  })
})

describe('Selection — getNextPosition / getPreviousPosition', () => {
  let editor!: Editor
  let rootSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('xy')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('未选区时二者为 null', () => {
    const selection = editor.get(Selection)
    selection.unSelect()
    expect(selection.getNextPosition()).toBeNull()
    expect(selection.getPreviousPosition()).toBeNull()
  })

  test('折叠在中间：下一位置 offset+1', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 1)
    const next = selection.getNextPosition()
    expect(next!.slot).toBe(rootSlot)
    expect(next!.offset).toBe(2)
  })

  test('折叠在中间：上一位置 offset-1', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 1)
    const prev = selection.getPreviousPosition()
    expect(prev!.slot).toBe(rootSlot)
    expect(prev!.offset).toBe(0)
  })
})

describe('Selection — getNextPositionByPosition / getPreviousPositionByPosition', () => {
  let editor!: Editor
  let rootSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('ab')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('getNextPositionByPosition 与 getNextPosition（折叠）一致', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 0)
    const a = selection.getNextPosition()
    const b = selection.getNextPositionByPosition(rootSlot, 0)
    expect(b).toEqual(a)
  })

  test('getPreviousPositionByPosition 与 getPreviousPosition（折叠）一致', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 1)
    const a = selection.getPreviousPosition()
    const b = selection.getPreviousPositionByPosition(rootSlot, 1)
    expect(b).toEqual(a)
  })
})

describe('Selection — getPaths / usePaths', () => {
  let editor!: Editor
  let rootSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('pq')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('getPaths 与锚点/焦点一致；usePaths 可还原', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 0, rootSlot, 2)
    const paths = selection.getPaths()
    expect(paths.anchor.length).toBeGreaterThan(0)
    expect(paths.focus.length).toBeGreaterThan(0)
    expect(paths.anchor[paths.anchor.length - 1]).toBe(0)
    expect(paths.focus[paths.focus.length - 1]).toBe(2)
    selection.setPosition(rootSlot, 1)
    selection.usePaths(paths)
    expect(selection.anchorOffset).toBe(0)
    expect(selection.focusOffset).toBe(2)
    expect(selection.startOffset).toBe(0)
    expect(selection.endOffset).toBe(2)
  })

  test('未选区时 getPaths 返回空数组', () => {
    const selection = editor.get(Selection)
    selection.unSelect()
    const paths = selection.getPaths()
    expect(paths.anchor).toEqual([])
    expect(paths.focus).toEqual([])
  })
})

describe('Selection — findSlotByPaths / findComponentByPaths', () => {
  let editor!: Editor
  let rootSlot!: Slot
  let paragraph!: ParagraphComponent

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    paragraph = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    paragraph.state.slot.insert('t')
    rootSlot.insert(paragraph)
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('findSlotByPaths([0]) 为根插槽', () => {
    const selection = editor.get(Selection)
    expect(selection.findSlotByPaths([0])).toBe(rootSlot)
  })

  test('findComponentByPaths([]) 为根组件', () => {
    const selection = editor.get(Selection)
    const ref = editor.get(RootComponentRef)
    expect(selection.findComponentByPaths([])).toBe(ref.component)
  })

  test('findComponentByPaths 定位到子块', () => {
    const selection = editor.get(Selection)
    const idx = rootSlot.indexOf(paragraph)
    expect(selection.findComponentByPaths([0, idx])).toBe(paragraph)
  })
})

describe('Selection — createSnapshot', () => {
  test('restore 后恢复锚点与起止', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('snap')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 3)
    const snap = selection.createSnapshot()
    selection.setPosition(rootSlot, 0)
    snap.restore(false)
    expect(selection.anchorOffset).toBe(1)
    expect(selection.focusOffset).toBe(3)
    expect(selection.startOffset).toBe(1)
    expect(selection.endOffset).toBe(3)
    editor.destroy()
  })
})

describe('Selection — setSelectedRanges 与 customRanges', () => {
  test('多段 SlotRange 时 getRanges 条数与 custom 一致', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('0123456789')
    await editor.render(root)
    const selection = editor.get(Selection)
    const ranges: SlotRange[] = [
      { slot: rootSlot, startIndex: 0, endIndex: 2 },
      { slot: rootSlot, startIndex: 5, endIndex: 7 }
    ]
    selection.setSelectedRanges(ranges)
    expect(selection.getRanges().length).toBe(2)
    expect(selection.getRanges()[0].startOffset).toBe(0)
    expect(selection.getRanges()[0].endOffset).toBe(2)
    expect(selection.getRanges()[1].startOffset).toBe(5)
    expect(selection.getRanges()[1].endOffset).toBe(7)
    expect(selection.isCollapsed).toBe(false)
    const scopes = selection.getSelectedScopes()
    expect(scopes.length).toBe(2)
    expect(scopes[0]).toEqual(ranges[0])
    editor.destroy()
  })

  test('setSelectedRanges 空数组等价于取消选区', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('x')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 1)
    selection.setSelectedRanges([])
    expect(selection.isSelected).toBe(false)
    editor.destroy()
  })
})

describe('Selection — getSelectedScopes / getScopes / getGreedyRanges / getBlocks', () => {
  let editor!: Editor
  let rootSlot!: Slot

  beforeEach(async () => {
    editor = new Editor(document.body, { providers: bridgeProviders })
    rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('wxyz')
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('折叠选区 getSelectedScopes 为单点', () => {
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 2)
    const scopes = selection.getSelectedScopes()
    expect(scopes).toEqual([
      { slot: rootSlot, startIndex: 2, endIndex: 2 }
    ])
  })

  test('getScopes 实例与静态 Selection.getScopes 一致', () => {
    const selection = editor.get(Selection)
    const a = selection.getScopes(rootSlot, 1, rootSlot, 3, false)
    const b = Selection.getScopes(
      { startSlot: rootSlot, startOffset: 1, endSlot: rootSlot, endOffset: 3 },
      false
    )
    expect(a).toEqual(b)
  })

  test('getGreedyRanges 在纯文本内按行内边界扩展', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 3)
    const greedy = selection.getGreedyRanges()
    expect(greedy.length).toBe(1)
    expect(greedy[0].slot).toBe(rootSlot)
    expect(greedy[0].startIndex).toBe(0)
    expect(greedy[0].endIndex).toBe(4)
  })

  test('getBlocks 对纯文本 greedy 区间做分解', () => {
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 3)
    const blocks = selection.getBlocks()
    expect(blocks.length).toBe(1)
    expect(blocks[0].slot).toBe(rootSlot)
    expect(blocks[0].startIndex).toBe(0)
    expect(blocks[0].endIndex).toBe(4)
  })
})

describe('Selection — getSlotRangeInCommonAncestorComponent / getCommonAncestorSlotScope', () => {
  test('同一段落内选区：公共祖先为段落组件', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('ab')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(p.state.slot, 0, p.state.slot, 2)
    expect(selection.commonAncestorComponent).toBe(p)
    const slotRange = selection.getSlotRangeInCommonAncestorComponent()
    expect(slotRange).not.toBeNull()
    expect(slotRange!.component).toBe(p)
    expect(slotRange!.startOffset).toBe(0)
    expect(slotRange!.endOffset).toBe(1)
    const scope = selection.getCommonAncestorSlotScope()
    expect(scope).not.toBeNull()
    expect(scope!.startSlot).toBe(p.state.slot)
    expect(scope!.endSlot).toBe(p.state.slot)
    expect(scope!.startOffset).toBe(0)
    expect(scope!.endOffset).toBe(3)
    editor.destroy()
  })
})

describe('Selection — findFirstPosition / findLastPosition', () => {
  test('findFirstPosition / findLastPosition 与 selectChildSlots 边界一致', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('mn')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const first = selection.findFirstPosition(p.state.slot, false)
    const last = selection.findLastPosition(p.state.slot, false)
    expect(first.slot).toBe(p.state.slot)
    expect(first.offset).toBe(0)
    expect(last.slot).toBe(p.state.slot)
    expect(last.offset).toBe(p.state.slot.length)
    editor.destroy()
  })
})

describe('Selection — commonAncestorSlot / 跨槽', () => {
  test('跨根与段落插槽时公共祖先为根插槽', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('x')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 0, p.state.slot, 1)
    expect(selection.commonAncestorSlot).toBe(rootSlot)
    editor.destroy()
  })
})

describe('Selection — static 工具', () => {
  test('getCommonAncestorSlot 同槽返回自身', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('a')
    await editor.render(root)
    expect(Selection.getCommonAncestorSlot(rootSlot, rootSlot)).toBe(rootSlot)
    editor.destroy()
  })

  test('compareSelectionPaths 判定先后', () => {
    expect(Selection.compareSelectionPaths([0, 1], [0, 2])).toBe(true)
    expect(Selection.compareSelectionPaths([0, 2], [0, 1])).toBe(false)
  })

  test('getSelectedScopes 静态与实例展开选区一致', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('01234')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(rootSlot, 1, rootSlot, 4)
    const range = selection.getRanges()[0]
    expect(Selection.getSelectedScopes(range, false)).toEqual(selection.getSelectedScopes(false))
    editor.destroy()
  })
})

describe('Selection — getScopes 在 customRanges 下返回 custom', () => {
  test('存在 customRanges 时 getScopes 直接返回 custom', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('abcdef')
    await editor.render(root)
    const selection = editor.get(Selection)
    const custom: SlotRange[] = [{ slot: rootSlot, startIndex: 0, endIndex: 1 }]
    selection.setSelectedRanges(custom)
    expect(selection.getScopes(rootSlot, 9, rootSlot, 9, false)).toEqual(custom)
    editor.destroy()
  })
})

describe('Selection — destroy', () => {
  test('destroy 不抛错', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('d')
    await editor.render(root)
    const selection = editor.get(Selection)
    expect(() => selection.destroy()).not.toThrow()
    editor.destroy()
  })
})

describe('Selection — nativeSelectionDelegate', () => {
  test('关闭后再打开不抛错', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('e')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.nativeSelectionDelegate = false
    selection.setPosition(rootSlot, 1)
    expect(selection.focusOffset).toBe(1)
    selection.nativeSelectionDelegate = true
    selection.setPosition(rootSlot, 0)
    expect(selection.focusOffset).toBe(0)
    editor.destroy()
  })
})

describe('Selection — getPathsBySlot / restore / onChange', () => {
  test('getPathsBySlot 返回根插槽在文档中的路径（不含 offset）', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('p')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 1)
    const paths = selection.getPathsBySlot(rootSlot)
    expect(paths).not.toBeNull()
    expect(Array.isArray(paths)).toBe(true)
    expect(paths!.length).toBeGreaterThan(0)
    editor.destroy()
  })

  test('restore 不抛错', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('r')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 0)
    expect(() => selection.restore(false)).not.toThrow()
    editor.destroy()
  })

  test('onChange 在选区变化时发出', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('oc')
    await editor.render(root)
    const selection = editor.get(Selection)
    let count = 0
    const sub = selection.onChange.subscribe(() => {
      count++
    })
    selection.setPosition(rootSlot, 1)
    expect(count).toBeGreaterThan(0)
    sub.unsubscribe()
    editor.destroy()
  })
})

describe('Selection — getCommonAncestorComponent / getInlineContent* / getSelectedScopes(decompose)', () => {
  test('同槽时 getCommonAncestorComponent 为父组件', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('x')
    rootSlot.insert(p)
    await editor.render(root)
    const ps = p.state.slot
    expect(Selection.getCommonAncestorComponent(ps, ps)).toBe(p)
    editor.destroy()
  })

  test('跨根与段落插槽时 getCommonAncestorComponent 为根组件', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('y')
    rootSlot.insert(p)
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    expect(Selection.getCommonAncestorComponent(rootSlot, p.state.slot)).toBe(ref.component)
    editor.destroy()
  })

  test('getInlineContentStartIndex / EndIndex 在纯文本内向两侧扩展到行内边界', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('wxyz')
    await editor.render(root)
    expect(Selection.getInlineContentStartIndex(rootSlot, 2)).toBe(0)
    expect(Selection.getInlineContentEndIndex(rootSlot, 2)).toBe(4)
    editor.destroy()
  })

  test('getSelectedScopes(decompose:true) 展开块内子插槽', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    const root = new RootComponent({ slot: rootSlot })
    const p = new ParagraphComponent({ slot: new Slot([ContentType.Text]) })
    p.state.slot.insert('inner')
    rootSlot.insert(p)
    await editor.render(root)
    const selection = editor.get(Selection)
    const idx = rootSlot.indexOf(p)
    selection.setBaseAndExtent(rootSlot, idx, rootSlot, idx + 1)
    const flat = selection.getSelectedScopes(false)
    const decomposed = selection.getSelectedScopes(true)
    expect(flat.length).toBe(1)
    expect(decomposed.length).toBeGreaterThanOrEqual(1)
    expect(decomposed.some(s => s.slot === p.state.slot)).toBe(true)
    editor.destroy()
  })
})

describe('Selection — usePaths 无效路径不改变选区', () => {
  test('锚点路径无法解析时不调用 setBaseAndExtent', async () => {
    const editor = new Editor(document.body, { providers: bridgeProviders })
    const rootSlot = new Slot([ContentType.Text])
    const root = new RootComponent({ slot: rootSlot })
    rootSlot.insert('uv')
    await editor.render(root)
    const selection = editor.get(Selection)
    selection.setPosition(rootSlot, 1)
    selection.usePaths({ anchor: [99999, 0], focus: [99999, 0] })
    expect(selection.focusOffset).toBe(1)
    editor.destroy()
  })
})
