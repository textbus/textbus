/**
 * lib0 将 `getUnixTime` 导出为加载时刻的 `Date.now`，假计时器无法影响 Yjs UndoManager 的栈合并判断。
 * 通过 jest.mock 注入可变的 Unix 毫秒；推进量需大于下方注入的 {@link COLLAB_TEST_CAPTURE_TIMEOUT_MS}。
 */
/** 业务侧可将 captureTimeout 配为 0；本集成测试需 >0 才能断言「多步撤销」与 Yjs 合并窗口。 */
const COLLAB_TEST_CAPTURE_TIMEOUT_MS = 80

const fakeUnixMsForCollabTests = { current: 1_000_000 }

jest.mock('lib0/time', () => {
  const actual = jest.requireActual('lib0/time') as Record<string, unknown>
  return {
    ...actual,
    getUnixTime: () => fakeUnixMsForCollabTests.current,
  }
})

import {
  Component,
  ContentType,
  History,
  NativeSelectionBridge,
  RootComponentRef,
  Slot,
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'
import {
  CollabHistory,
  CollaborateModule,
  CustomUndoManagerConfig,
  LocalConnector,
  SyncConnector,
} from '@textbus/collaborate'
import { Doc as YDoc } from 'yjs'

import { Editor, ParagraphComponent, RootComponent, StateProbe } from '../_editor/_api'
import { textAlignAttribute } from '../_editor/attributes/text-align.attribute'
import { boldFormatter } from '../_editor/formatters/bold.formatter'
import { sleep } from '../util'

async function waitCollabHistoryStackWindow() {
  fakeUnixMsForCollabTests.current += COLLAB_TEST_CAPTURE_TIMEOUT_MS + 10
  await Promise.resolve()
}

beforeEach(() => {
  fakeUnixMsForCollabTests.current = 1_000_000
})

type RootLike = InstanceType<typeof RootComponent>

const bridgeProviders = [
  {
    provide: CustomUndoManagerConfig,
    useValue: {
      captureTimeout: COLLAB_TEST_CAPTURE_TIMEOUT_MS,
    } as CustomUndoManagerConfig,
  },
  {
    provide: NativeSelectionBridge,
    useClass: NodeSelectionBridge,
  },
]

function collabModules() {
  return [
    new CollaborateModule({
      createConnector(yDoc: YDoc): SyncConnector {
        return new LocalConnector(yDoc)
      },
    }),
  ]
}

async function createEditorWithProbe() {
  const editor = new Editor(
    document.body,
    {
      providers: bridgeProviders,
    },
    collabModules(),
  )
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
  expect(editor.get(History)).toBeInstanceOf(CollabHistory)
  return { editor, probe }
}

function numsNestSnapshot(probe: StateProbe) {
  const s = probe.toJSON().state as { nums: number[]; nest: { x: number } }
  return {
    nums: [...s.nums],
    nest: { ...s.nest },
  }
}

/** 组件曾被删掉再撤销恢复时会是新实例；仅此类场景用结构匹配（类型 / nums），勿用旧引用 */
function countComponents<T extends Component>(
  slot: Slot,
  Ctor: new (...args: any[]) => T,
): number {
  let n = 0
  for (let i = 0; i < slot.length; i++) {
    if (slot.getContentAtIndex(i) instanceof Ctor) {
      n++
    }
  }
  return n
}

function findStateProbeByNums(slot: Slot, nums: number[]): StateProbe | null {
  const key = nums.join(',')
  for (let i = 0; i < slot.length; i++) {
    const c = slot.getContentAtIndex(i)
    if (c instanceof StateProbe && numsNestSnapshot(c).nums.join(',') === key) {
      return c
    }
  }
  return null
}

/**
 * 子组件仅允许出现在父组件的 Slot 内（符合数据模型约定）
 */
async function createEditorWithNestedProbes() {
  const editor = new Editor(
    document.body,
    {
      providers: bridgeProviders,
    },
    collabModules(),
  )
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
  expect(editor.get(History)).toBeInstanceOf(CollabHistory)
  return { editor, outer, inner, root }
}

/**
 * Root → StateProbe → ParagraphComponent → StateProbe（混合组件类型的 Slot 链）
 */
async function createEditorWithProbeParagraphProbe() {
  const editor = new Editor(
    document.body,
    {
      providers: bridgeProviders,
    },
    collabModules(),
  )
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
  expect(editor.get(History)).toBeInstanceOf(CollabHistory)
  return { editor, outer, paragraph, leaf, root }
}

/** 根插槽仅文本，便于断言插槽文本内容与撤销栈 */
async function createEditorRootTextOnly() {
  const editor = new Editor(
    document.body,
    {
      providers: bridgeProviders,
    },
    collabModules(),
  )
  const root = new RootComponent({
    slot: new Slot([ContentType.Text]),
  })
  await editor.render(root)
  expect(editor.get(History)).toBeInstanceOf(CollabHistory)
  return { editor, root }
}

function slotTextSnapshot(slot: Slot) {
  const parts: string[] = []
  for (let i = 0; i < slot.length; i++) {
    const c = slot.getContentAtIndex(i)
    if (typeof c === 'string') {
      parts.push(c)
    } else {
      parts.push(`[${c.constructor.name}]`)
    }
  }
  return parts.join('')
}

function slotDeltaUsesFormatter(slot: Slot, formatter: { name: string }) {
  for (const item of slot.toDelta()) {
    if (typeof item.insert !== 'string') {
      continue
    }
    for (const [fmt] of item.formats) {
      if (fmt.name === formatter.name) {
        return true
      }
    }
  }
  return false
}

describe('协作 CollabHistory — 插槽内容、格式、属性与插槽 state（撤销/重做）', () => {
  let editor!: Editor

  afterEach(() => {
    editor?.destroy()
  })

  test('根插槽（纯文本）写入文本：撤销/重做与模型一致', async () => {
    const { editor: ed, root } = await createEditorRootTextOnly()
    editor = ed

    root.state.slot.retain(0)
    root.state.slot.insert('协作')
    await sleep()

    expect(slotTextSnapshot(root.state.slot)).toContain('协作')

    const history = editor.get(History)
    history.back()
    await sleep()
    expect(slotTextSnapshot(root.state.slot)).not.toContain('协作')

    history.forward()
    await sleep()
    expect(slotTextSnapshot(root.state.slot)).toContain('协作')
  })

  test('组件内插槽插入加粗文本：撤销去掉格式、重做恢复', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const inner = env.probe.state.slot

    inner.retain(0)
    inner.insert('粗体', boldFormatter, true)
    await sleep()

    expect(slotTextSnapshot(inner)).toContain('粗体')
    expect(slotDeltaUsesFormatter(inner, boldFormatter)).toBe(true)

    const history = editor.get(History)
    history.back()
    await sleep()
    expect(slotTextSnapshot(inner)).not.toContain('粗体')
    expect(slotDeltaUsesFormatter(inner, boldFormatter)).toBe(false)

    history.forward()
    await sleep()
    expect(slotTextSnapshot(inner)).toContain('粗体')
    expect(slotDeltaUsesFormatter(inner, boldFormatter)).toBe(true)
  })

  test('根插槽设置块级属性 textAlign：撤销恢复未设置', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const root = editor.get(RootComponentRef).component as RootComponent
    const slot = root.state.slot

    expect(slot.getAttribute(textAlignAttribute)).toBeNull()

    slot.setAttribute(textAlignAttribute, 'center')
    await sleep()

    expect(slot.getAttribute(textAlignAttribute)).toBe('center')

    const history = editor.get(History)
    history.back()
    await sleep()
    expect(slot.getAttribute(textAlignAttribute)).toBeNull()

    history.forward()
    await sleep()
    expect(slot.getAttribute(textAlignAttribute)).toBe('center')
  })

  test('根插槽扩展 state 字段变更：撤销后恢复初值', async () => {
    editor = new Editor(
      document.body,
      {
        providers: bridgeProviders,
      },
      collabModules(),
    )
    const rootSlot = new Slot<{ tag: number }>([ContentType.Text], { tag: 0 })
    const root = new RootComponent({ slot: rootSlot })
    await editor.render(root)

    rootSlot.state.tag = 9
    await sleep()
    expect(rootSlot.toJSON().state.tag).toBe(9)

    const history = editor.get(History)
    history.back()
    await sleep()
    expect(rootSlot.toJSON().state.tag).toBe(0)

    history.forward()
    await sleep()
    expect(rootSlot.toJSON().state.tag).toBe(9)
  })

  test('根插槽在已有块前插入文本：撤销恢复块前无正文', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const { probe } = env
    const root = editor.get(RootComponentRef).component as RootComponent

    root.state.slot.retain(0)
    root.state.slot.insert('前文')
    await sleep()

    expect(root.state.slot.indexOf(probe)).toBeGreaterThan(0)
    expect(slotTextSnapshot(root.state.slot)).toContain('前文')

    editor.get(History).back()
    await sleep()

    expect(root.state.slot.indexOf(probe)).toBe(0)
    expect(slotTextSnapshot(root.state.slot)).not.toContain('前文')
  })

  test('根插槽追加第二个块级组件：撤销移除第二块、保留第一块', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const { probe } = env
    const root = editor.get(RootComponentRef).component as RootComponent
    const slot = root.state.slot

    const inner = new Slot([ContentType.Text])
    const second = new StateProbe({
      slot: inner,
      nums: [7, 8],
      nest: { x: 3 },
    })

    slot.retain(slot.length)
    slot.insert(second)
    await sleep()

    expect(slot.indexOf(probe)).toBe(0)
    expect(slot.indexOf(second)).toBe(1)

    editor.get(History).back()
    await sleep()

    expect(slot.indexOf(second)).toBe(-1)
    expect(slot.indexOf(probe)).toBe(0)
    expect(numsNestSnapshot(probe).nums).toEqual([1, 2])
  })

  test('StateProbe 内插槽插入文本：撤销清空插入', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const { probe } = env
    const inner = probe.state.slot

    inner.retain(0)
    inner.insert('内文')
    await sleep()

    expect(slotTextSnapshot(inner)).toContain('内文')

    editor.get(History).back()
    await sleep()

    expect(slotTextSnapshot(inner)).not.toContain('内文')
  })

  test('根插槽删除块级组件：撤销恢复该块', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const { probe } = env
    const root = editor.get(RootComponentRef).component as RootComponent
    const slot = root.state.slot

    slot.removeComponent(probe)
    await sleep()

    expect(countComponents(slot, StateProbe)).toBe(0)

    editor.get(History).back()
    await sleep()

    const slotAfter = (editor.get(RootComponentRef).component as RootComponent).state.slot
    expect(countComponents(slotAfter, StateProbe)).toBe(1)
    expect(findStateProbeByNums(slotAfter, [1, 2])).not.toBeNull()
  })

  test('插槽两步修改：按捕获窗口分隔后逆序撤销', async () => {
    const env = await createEditorWithProbe()
    editor = env.editor
    const { probe } = env
    const inner = probe.state.slot

    inner.retain(0)
    inner.insert('一')
    await sleep()
    await waitCollabHistoryStackWindow()

    inner.retain(inner.length)
    inner.insert('二')
    await sleep()

    expect(slotTextSnapshot(inner)).toContain('一')
    expect(slotTextSnapshot(inner)).toContain('二')

    const history = editor.get(History)
    history.back()
    await sleep()
    expect(slotTextSnapshot(inner)).toContain('一')
    expect(slotTextSnapshot(inner)).not.toContain('二')

    history.back()
    await sleep()
    expect(slotTextSnapshot(inner)).not.toContain('一')
  })
})

describe('协作 CollabHistory — 组件 observable state 全量变更（数据模型 undo/redo）', () => {
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
    await waitCollabHistoryStackWindow()
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
    await waitCollabHistoryStackWindow()
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
    await waitCollabHistoryStackWindow()
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
    await waitCollabHistoryStackWindow()
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

describe('协作 CollabHistory — 嵌套 Slot 内的组件 state（数据模型 + 撤销重做）', () => {
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
    await waitCollabHistoryStackWindow()
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
    expect(
      innerList!.some(
        (item): item is Lit =>
          typeof item === 'object' && item !== null && (item as Lit).name === StateProbe.componentName,
      ),
    ).toBe(true)
    expect(outer.toJSON().name).toBe(StateProbe.componentName)
    expect(inner.toJSON().name).toBe(StateProbe.componentName)
  })
})

describe('协作 CollabHistory — StateProbe → Paragraph → StateProbe（混合组件嵌套）', () => {
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
    await waitCollabHistoryStackWindow()
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

