import { ContentType, History, NativeSelectionBridge, Slot } from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { Editor, ParagraphComponent, RootComponent, StateProbe } from '../../_editor/_api'
import { sleep } from '../../util'

type RootLike = InstanceType<typeof RootComponent>

const bridgeProviders = [
  {
    provide: NativeSelectionBridge,
    useClass: NodeSelectionBridge,
  },
]

async function createEditorWithProbe() {
  const editor = new Editor(document.body, {
    providers: bridgeProviders,
  })
  const rootSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])
  const probeSlot = new Slot([ContentType.Text])
  const probe = new StateProbe({
    slot: probeSlot,
    nums: [1, 2],
    nest: { x: 0 },
  })
  rootSlot.insert(probe)
  const root = new RootComponent({ slot: rootSlot })
  await editor.render(root)
  return { editor, probe }
}

function numsNestSnapshot(probe: StateProbe) {
  const s = probe.toJSON().state as { nums: number[]; nest: { x: number } }
  return {
    nums: [...s.nums],
    nest: { ...s.nest },
  }
}

/**
 * 子组件仅允许出现在父组件的 Slot 内（符合数据模型约定）
 */
async function createEditorWithNestedProbes() {
  const editor = new Editor(document.body, {
    providers: bridgeProviders,
  })
  const rootSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])

  const innerSlot = new Slot([ContentType.Text])
  const inner = new StateProbe({
    slot: innerSlot,
    nums: [10, 20],
    nest: { x: 1 },
  })

  const outerSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])
  outerSlot.insert(inner)

  const outer = new StateProbe({
    slot: outerSlot,
    nums: [1, 2],
    nest: { x: 0 },
  })

  rootSlot.insert(outer)
  const root = new RootComponent({ slot: rootSlot })
  await editor.render(root)
  return { editor, outer, inner, root }
}

/**
 * Root → StateProbe → ParagraphComponent → StateProbe（混合组件类型的 Slot 链）
 */
async function createEditorWithProbeParagraphProbe() {
  const editor = new Editor(document.body, {
    providers: bridgeProviders,
  })
  const rootSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])

  const leafSlot = new Slot([ContentType.Text])
  const leaf = new StateProbe({
    slot: leafSlot,
    nums: [100],
    nest: { x: -1 },
  })

  const paragraphSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])
  paragraphSlot.insert(leaf)

  const paragraph = new ParagraphComponent({
    slot: paragraphSlot,
  })

  const outerSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])
  outerSlot.insert(paragraph)

  const outer = new StateProbe({
    slot: outerSlot,
    nums: [1, 2],
    nest: { x: 0 },
  })

  rootSlot.insert(outer)
  const root = new RootComponent({ slot: rootSlot })
  await editor.render(root)
  return { editor, outer, paragraph, leaf, root }
}

describe('本地历史记录 — 组件 observable state 全量变更', () => {
  let editor!: Editor
  let probe!: StateProbe

  afterEach(() => {
    editor?.destroy()
  })

  test('nums.push / undo / redo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.push(3)
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2, 3])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])

    history.forward()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2, 3])
  })

  test('nums.pop / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.pop()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nums.shift / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.shift()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([2])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nums.unshift / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.unshift(0)
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([0, 1, 2])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nums.splice / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.splice(1, 1, 9, 8)
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 9, 8])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nums.sort / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    probe.state.nums.push(0)
    await sleep()
    const history = editor.get(History)

    probe.state.nums.sort((a, b) => a - b)
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([0, 1, 2])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2, 0])
  })

  test('nums.reverse / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.reverse()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([2, 1])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nums.fill / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.fill(7)
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([7, 7])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nums.copyWithin / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    probe.state.nums.push(3)
    await sleep()
    const history = editor.get(History)

    probe.state.nums.copyWithin(0, 2)
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([3, 2, 3])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2, 3])
  })

  test('nums.length 缩短 / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    probe.state.nums.push(3)
    await sleep()
    const history = editor.get(History)

    probe.state.nums.length = 1
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2, 3])
  })

  test('nums.length 增长（空洞）/ undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums.length = 4
    await sleep()
    expect(probe.state.nums.length).toBe(4)
    expect(numsNestSnapshot(probe).nums.filter((_, i) => i < 2)).toEqual([1, 2])

    history.back()
    await sleep()
    expect(probe.state.nums.length).toBe(2)
  })

  test('nums 下标赋值 / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nums[0] = 99
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([99, 2])

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('nest.x 赋值 / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nest.x = 42
    await sleep()
    expect(numsNestSnapshot(probe).nest.x).toBe(42)

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nest.x).toBe(0)
  })

  test('nest 整体替换 / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)

    probe.state.nest = { x: 5 }
    await sleep()
    expect(numsNestSnapshot(probe).nest.x).toBe(5)

    history.back()
    await sleep()
    expect(numsNestSnapshot(probe).nest.x).toBe(0)
  })

  test('动态属性增删 / undo', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    probe = env.probe
    const history = editor.get(History)
    const st = probe.state as typeof probe.state & { flag?: boolean }

    st.flag = true
    await sleep()
    expect((probe.toJSON().state as { flag?: boolean }).flag).toBe(true)

    history.back()
    await sleep()
    expect((probe.toJSON().state as { flag?: boolean }).flag).toBeUndefined()

    st.flag = true
    await sleep()
    delete st.flag
    await sleep()
    expect((probe.toJSON().state as { flag?: boolean }).flag).toBeUndefined()

    history.back()
    await sleep()
    expect((probe.toJSON().state as { flag?: boolean }).flag).toBe(true)

    history.back()
    await sleep()
    expect((probe.toJSON().state as { flag?: boolean }).flag).toBeUndefined()
  })
})

describe('本地历史记录 — 嵌套 Slot 内的组件 state（数据模型 + 撤销重做）', () => {
  let editor!: Editor

  afterEach(() => {
    editor?.destroy()
  })

  test('挂载关系：子组件仅在父 Slot 内，parent / parentComponent 正确', async () => {
    const ctx = await createEditorWithNestedProbes()
    editor = ctx.editor
    const { outer, inner, root } = ctx

    expect(inner.parent).toBe(outer.state.slot)
    expect(inner.parentComponent).toBe(outer)
    expect(outer.state.slot.indexOf(inner)).toBe(0)
    expect(rootTreeContainsOuter(root, outer)).toBe(true)
  })

  test('仅修改子组件 state：撤销只恢复子、父不受影响', async () => {
    const ctx = await createEditorWithNestedProbes()
    editor = ctx.editor
    const { outer, inner } = ctx
    const history = editor.get(History)

    const beforeOuter = numsNestSnapshot(outer)
    inner.state.nums.push(30)
    await sleep()

    expect(numsNestSnapshot(inner).nums).toEqual([10, 20, 30])
    expect(numsNestSnapshot(outer)).toEqual(beforeOuter)

    history.back()
    await sleep()
    expect(numsNestSnapshot(inner).nums).toEqual([10, 20])
    expect(numsNestSnapshot(outer)).toEqual(beforeOuter)
  })

  test('仅修改父组件 state：子组件不受影响', async () => {
    const ctx = await createEditorWithNestedProbes()
    editor = ctx.editor
    const { outer, inner } = ctx
    const history = editor.get(History)

    const beforeInner = numsNestSnapshot(inner)
    outer.state.nest.x = 99
    await sleep()

    expect(numsNestSnapshot(outer).nest.x).toBe(99)
    expect(numsNestSnapshot(inner)).toEqual(beforeInner)

    history.back()
    await sleep()
    expect(numsNestSnapshot(outer).nest.x).toBe(0)
    expect(numsNestSnapshot(inner)).toEqual(beforeInner)
  })

  test('父子交替修改：按栈逆序撤销且挂载关系不变', async () => {
    const ctx = await createEditorWithNestedProbes()
    editor = ctx.editor
    const { outer, inner } = ctx
    const history = editor.get(History)

    outer.state.nums.push(3)
    await sleep()
    inner.state.nest.x = 7
    await sleep()

    expect(numsNestSnapshot(outer).nums).toEqual([1, 2, 3])
    expect(numsNestSnapshot(inner).nest.x).toBe(7)

    history.back()
    await sleep()
    expect(numsNestSnapshot(inner).nest.x).toBe(1)
    expect(numsNestSnapshot(outer).nums).toEqual([1, 2, 3])

    history.back()
    await sleep()
    expect(numsNestSnapshot(outer).nums).toEqual([1, 2])
    expect(numsNestSnapshot(inner).nest.x).toBe(1)

    expect(inner.parentComponent).toBe(outer)
    history.forward()
    await sleep()
    expect(numsNestSnapshot(outer).nums).toEqual([1, 2, 3])
    history.forward()
    await sleep()
    expect(numsNestSnapshot(inner).nest.x).toBe(7)
  })

  test('toJSON 嵌套结构完整', async () => {
    const ctx = await createEditorWithNestedProbes()
    editor = ctx.editor
    const { outer, inner } = ctx

    const doc = editor.getJSON()
    type Lit = { name: string; state: { slot?: { content?: unknown[] } } }
    const rootSlotContent = (doc.state as { slot?: { content?: unknown[] } }).slot?.content
    expect(Array.isArray(rootSlotContent)).toBe(true)
    const outerLit = rootSlotContent!.find(
      (c): c is Lit => typeof c === 'object' && c !== null && (c as Lit).name === StateProbe.componentName,
    )
    expect(outerLit).toBeDefined()
    const innerList = outerLit!.state.slot?.content
    expect(Array.isArray(innerList)).toBe(true)
    expect(innerList!.some(
      (item): item is Lit =>
        typeof item === 'object' && item !== null && (item as Lit).name === StateProbe.componentName,
    )).toBe(true)
    expect(outer.toJSON().name).toBe(StateProbe.componentName)
    expect(inner.toJSON().name).toBe(StateProbe.componentName)
  })
})

describe('本地历史记录 — StateProbe → Paragraph → StateProbe（混合组件嵌套）', () => {
  let editor!: Editor

  afterEach(() => {
    editor?.destroy()
  })

  test('挂载链：叶子仅在 Paragraph.slot 内，经 Paragraph 挂到外层 StateProbe', async () => {
    const ctx = await createEditorWithProbeParagraphProbe()
    editor = ctx.editor
    const { outer, paragraph, leaf, root } = ctx

    expect(leaf.parent).toBe(paragraph.state.slot)
    expect(leaf.parentComponent).toBe(paragraph)
    expect(paragraph.parent).toBe(outer.state.slot)
    expect(paragraph.parentComponent).toBe(outer)
    expect(rootTreeContainsOuter(root, outer)).toBe(true)
    expect(outer.state.slot.indexOf(paragraph)).toBe(0)
    expect(paragraph.state.slot.indexOf(leaf)).toBe(0)
  })

  test('仅修改最内层 StateProbe：撤销不影响 Paragraph 与外层 StateProbe', async () => {
    const ctx = await createEditorWithProbeParagraphProbe()
    editor = ctx.editor
    const { outer, paragraph, leaf } = ctx
    const history = editor.get(History)

    const snapOuter = numsNestSnapshot(outer)
    const beforeParagraphSlotLen = paragraph.state.slot.length

    leaf.state.nums.push(200)
    await sleep()

    expect(numsNestSnapshot(leaf).nums).toEqual([100, 200])
    expect(numsNestSnapshot(outer)).toEqual(snapOuter)
    expect(paragraph.state.slot.length).toBe(beforeParagraphSlotLen)

    history.back()
    await sleep()
    expect(numsNestSnapshot(leaf).nums).toEqual([100])
    expect(numsNestSnapshot(outer)).toEqual(snapOuter)
  })

  test('修改外层后修改叶子：历史栈逆序撤销', async () => {
    const ctx = await createEditorWithProbeParagraphProbe()
    editor = ctx.editor
    const { outer, leaf } = ctx
    const history = editor.get(History)

    outer.state.nest.x = 5
    await sleep()
    leaf.state.nest.x = 9
    await sleep()

    history.back()
    await sleep()
    expect(numsNestSnapshot(leaf).nest.x).toBe(-1)
    expect(numsNestSnapshot(outer).nest.x).toBe(5)

    history.back()
    await sleep()
    expect(numsNestSnapshot(outer).nest.x).toBe(0)
    expect(numsNestSnapshot(leaf).nest.x).toBe(-1)
  })

  test('getJSON 含 StateProbe → Paragraph → StateProbe 三层字面量', async () => {
    const ctx = await createEditorWithProbeParagraphProbe()
    editor = ctx.editor

    const doc = editor.getJSON()
    type Lit = {
      name: string
      state: { slot?: { content?: unknown[] } }
    }
    const rootContent = (doc.state as { slot?: { content?: unknown[] } }).slot?.content
    const outerLit = rootContent!.find(
      (c): c is Lit =>
        typeof c === 'object' && c !== null && (c as Lit).name === StateProbe.componentName,
    )
    expect(outerLit).toBeDefined()

    const paraLit = outerLit!.state.slot?.content?.find(
      (c): c is Lit =>
        typeof c === 'object' && c !== null && (c as Lit).name === ParagraphComponent.componentName,
    )
    expect(paraLit).toBeDefined()

    const leafLit = paraLit!.state.slot?.content?.find(
      (c): c is Lit =>
        typeof c === 'object' && c !== null && (c as Lit).name === StateProbe.componentName,
    )
    expect(leafLit).toBeDefined()
    expect((leafLit!.state as { nums?: number[] }).nums).toEqual([100])
  })
})

function rootTreeContainsOuter(root: RootLike, outer: StateProbe): boolean {
  const slot = root.state.slot
  for (let i = 0; i < slot.length; i++) {
    const c = slot.getContentAtIndex(i)
    if (c === outer) {
      return true
    }
  }
  return false
}
