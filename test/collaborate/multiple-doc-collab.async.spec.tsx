/**
 * 多子文档协作：{@link MultipleDocumentCollaborateModule} + {@link CachingSubModelLoader}。
 *
 * - {@link MultipleDocCollabHistory} 未注入配置时，合并栈项的定时默认约 500ms；此处通过
 *   {@link CustomUndoManagerConfig} 显式注入较小的非零值，既缩短单测耗时，又保留「一段时间内的合并」行为（勿设为 0）。
 * - lib0 的 `getUnixTime` 需与下方超时同量级 mock，否则 Yjs UndoManager 合并窗口与 Textbus 栈定时脱钩；
 *   写法同 {@link collab-history.observable-state.spec.tsx}。
 *
 * **为何浏览器里撤销正常，而旧版单测里 `History.back()` 像没生效？**
 * 1. `MultipleDocCollabHistory` 在 `setTimeout(captureTimeout)` 之后才把 Yjs 的批记录入 `actionStack`；此前 `canBack` 为 false，`back()` 直接 return。
 * 2. `test/util` 的 `sleep()` 默认只 `advanceTimersByTime(1)`，且每次调用 `jest.useFakeTimers()`，既不能走出合并窗口，还可能打乱已挂起的合并定时器。
 * 3. 单文档 {@link CollabHistory} 无这层「延迟入栈」，其它协作测试继续用 `sleep()` 往往仍能过，易误判为多文档 / 异步独有 bug。
 * 4. 若在单测里全局启用假定时器而不谨慎推进，可能与 Yjs 撤销路径冲突；合并栈等待宜用真实间隔（见 {@link flushMultiDocCollabHistoryStack}）或与 captureTimeout 对齐地推进时钟。
 * 5. 跑全量 `pnpm test` 时，前置套件里的 `sleep()` 可能遗留 **假定时器**；若不 `jest.useRealTimers()`，本文件中的 `setTimeout` 永远不会走完，`flushMultiDocCollabHistoryStack` 会 **永久挂起**。
 * 6. `BrowserModule.setup` 会 `await Input.onReady`；默认 `MagicInput` 要等 iframe `load`，在 Jest/jsdom 里可能永远不触发，`editor.render()` 会一直卡住。本文件对 {@link Editor} 传入 `useContentEditable: true` 使用 {@link NativeInput}。
 */
const MULTI_DOC_UNDO_CAPTURE_TIMEOUT_MS = 80

const fakeUnixMsForCollabTests = { current: 1_000_000 }

jest.mock('lib0/time', () => {
  const actual = jest.requireActual('lib0/time') as Record<string, unknown>
  return {
    ...actual,
    getUnixTime: () => fakeUnixMsForCollabTests.current,
  }
})

import {
  AsyncSlot,
  ContentType,
  History,
  Module,
  NativeSelectionBridge,
  Slot,
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'
import {
  CustomUndoManagerConfig,
  LocalConnector,
  MultipleDocCollabHistory,
  MultipleDocumentCollaborateModule,
  SyncConnector,
} from '@textbus/collaborate'
import { Doc as YDoc } from 'yjs'

import {
  AsyncSlotHolder,
  Editor,
  JsonAsyncProbe,
  RootComponent,
} from '../_editor/_api'
import {
  CachingSubModelLoader,
  DOC_ID_METADATA_KEY,
} from './caching-sub-model-loader'

async function waitCollabHistoryStackWindow() {
  fakeUnixMsForCollabTests.current += MULTI_DOC_UNDO_CAPTURE_TIMEOUT_MS + 10
  await Promise.resolve()
}

/**
 * {@link MultipleDocCollabHistory} 在 `stack-item-added` 后用 `setTimeout(captureTimeout)` 才把一批 UndoManager 写入 `actionStack`
 *（见 collaborate `multiple-doc-collab-history.ts`）。未满 captureTimeout 时 `canBack` 仍为 false，`History.back()` 会直接 return。
 *
 * 使用真实 `setTimeout` 等待合并窗口（与浏览器一致）。不要用 `test/util` 的 `sleep()`：默认只前进 1ms；
 * 也不要对本文件启用 `jest.useFakeTimers()`：会与 Yjs 撤销、`Scheduler.historyApplyTransact` 的路径冲突（曾出现 `sliceContent` 未定义）。
 */
async function flushMultiDocCollabHistoryStack() {
  jest.useRealTimers()
  await new Promise<void>(resolve => {
    setTimeout(resolve, MULTI_DOC_UNDO_CAPTURE_TIMEOUT_MS + 25)
  })
}

async function tick() {
  await Promise.resolve()
}

/** 子文档 Y.Doc 已由 Loader 创建且 Collaborate 已完成 sync / markAsLoaded 之前，勿改 state 或插槽内容（否则无对应 yDoc 事务）。 */
async function awaitAsyncComponentSubDocReady(probe: JsonAsyncProbe, loader: CachingSubModelLoader) {
  await waitUntil(() => probe.loader.isLoaded, 'JsonAsyncProbe.loader')
  const yDoc = loader.getLoadedModelByComponent(probe)
  expect(yDoc).not.toBeNull()
  expect(yDoc!.getMap('state')).toBeDefined()
}

async function awaitAsyncSlotSubDocReady(slot: AsyncSlot, loader: CachingSubModelLoader) {
  await waitUntil(() => slot.loader.isLoaded, 'AsyncSlot.loader')
  const yDoc = loader.getLoadedModelBySlot(slot)
  expect(yDoc).not.toBeNull()
  expect(yDoc!.getText('content')).toBeDefined()
  expect(yDoc!.getMap('state')).toBeDefined()
}

/**
 * `markAsLoaded` 常在微任务里早于测试里对 `onLoaded` 的订阅执行，Subject 已 complete 后订阅者永远收不到事件 → 原 `await onLoaded` 会 **永久挂起**。
 * 这里轮询 `isLoaded`，仅用 `Promise.resolve()` 让出微任务（不依赖 `setTimeout`，避免与其它套件遗留的假定时器纠缠）。
 */
async function waitUntil(pred: () => boolean, label: string, maxMicrotaskYields = 10_000) {
  for (let i = 0; i < maxMicrotaskYields; i++) {
    if (pred()) {
      return
    }
    await Promise.resolve()
  }
  throw new Error(`[multiple-doc-collab.async] timeout waiting for: ${label}`)
}

beforeEach(() => {
  /** 其它套件里的 `test/util.sleep()` 会 `jest.useFakeTimers()`；若不恢复，本文件的 `setTimeout` 由假时钟接管且从不前进，`flushMultiDocCollabHistoryStack` 会永久挂起。 */
  jest.useRealTimers()
  fakeUnixMsForCollabTests.current = 1_000_000
})

afterEach(() => {
  jest.useRealTimers()
})

const bridgeProviders = [
  {
    provide: CustomUndoManagerConfig,
    useValue: {
      captureTimeout: MULTI_DOC_UNDO_CAPTURE_TIMEOUT_MS,
    } as CustomUndoManagerConfig,
  },
  {
    provide: NativeSelectionBridge,
    useClass: NodeSelectionBridge,
  },
]

function multiDocCollaborateModules(loader: CachingSubModelLoader): Module[] {
  return [
    new MultipleDocumentCollaborateModule({
      createConnector(yDoc: YDoc): SyncConnector {
        return new LocalConnector(yDoc)
      },
      subModelLoader: loader,
    }),
  ]
}

function countNamedBlocks(slot: Slot, componentName: string): number {
  let n = 0
  for (let i = 0; i < slot.length; i++) {
    const c = slot.getContentAtIndex(i)
    if (typeof c !== 'string' && c.name === componentName) {
      n++
    }
  }
  return n
}

function firstBlockByName(slot: Slot, componentName: string) {
  for (let i = 0; i < slot.length; i++) {
    const c = slot.getContentAtIndex(i)
    if (typeof c !== 'string' && c.name === componentName) {
      return c
    }
  }
  return null
}

async function createEditorWithJsonAsyncProbe(loader: CachingSubModelLoader) {
  const editor = new Editor(
    document.body,
    {
      providers: bridgeProviders,
      useContentEditable: true,
    },
    multiDocCollaborateModules(loader),
  )
  const innerSlot = new Slot([ContentType.Text])
  const probe = new JsonAsyncProbe(
    { slot: innerSlot, title: 't0' },
    { rev: 1, source: 'probe-src', docId: '' },
  )
  loader.ensureStableDocIdForAsyncComponent(probe)
  const rootSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])
  rootSlot.insert(probe)
  const root = new RootComponent({ slot: rootSlot })
  await editor.render(root)
  expect(editor.get(History)).toBeInstanceOf(MultipleDocCollabHistory)
  return { editor, probe, root, loader }
}

async function createEditorWithAsyncSlotHolder(loader: CachingSubModelLoader) {
  const editor = new Editor(
    document.body,
    {
      providers: bridgeProviders,
      useContentEditable: true,
    },
    multiDocCollaborateModules(loader),
  )
  const holder = new AsyncSlotHolder({})
  loader.ensureStableDocIdForAsyncSlot(holder.state.slot)
  const rootSlot = new Slot([
    ContentType.Text,
    ContentType.BlockComponent,
    ContentType.InlineComponent,
  ])
  rootSlot.insert(holder)
  const root = new RootComponent({ slot: rootSlot })
  await editor.render(root)
  expect(editor.get(History)).toBeInstanceOf(MultipleDocCollabHistory)
  return { editor, holder, root, loader }
}

describe('MultipleDocumentCollaborate — 异步组件 / 异步插槽', () => {
  describe('SubModelLoader 缓存与 docId', () => {
    test('createSubModelByComponent 后 getLoadedModelByComponent 返回同一 Y.Doc', async () => {
      const loader = new CachingSubModelLoader()
      const { probe } = await createEditorWithJsonAsyncProbe(loader)
      await awaitAsyncComponentSubDocReady(probe, loader)

      const id = probe.metadata[DOC_ID_METADATA_KEY]
      expect(typeof id).toBe('string')
      expect(id!.length).toBeGreaterThan(0)

      const y1 = loader.getLoadedModelByComponent(probe)
      const y2 = loader.docCache.get(id!)
      expect(y1).not.toBeNull()
      expect(y2).not.toBeNull()
      expect(y1).toBe(y2)
    })

    test('createSubModelBySlot 后 getLoadedModelBySlot 返回同一 Y.Doc', async () => {
      const loader = new CachingSubModelLoader()
      const { holder } = await createEditorWithAsyncSlotHolder(loader)
      await awaitAsyncSlotSubDocReady(holder.state.slot, loader)

      const slot = holder.state.slot
      const id = slot.metadata[DOC_ID_METADATA_KEY]
      expect(typeof id).toBe('string')

      const y1 = loader.getLoadedModelBySlot(slot)
      const y2 = loader.docCache.get(id!)
      expect(y1).not.toBeNull()
      expect(y2).not.toBeNull()
      expect(y1).toBe(y2)
    })
  })

  describe('异步组件 JsonAsyncProbe — state 与撤销', () => {
    let editor!: Editor

    afterEach(() => {
      editor?.destroy()
    })

    test('修改 title 后可撤销', async () => {
      const loader = new CachingSubModelLoader()
      const env = await createEditorWithJsonAsyncProbe(loader)
      editor = env.editor
      const { probe } = env
      await awaitAsyncComponentSubDocReady(probe, loader)

      probe.state.title = 't1'
      expect(probe.state.title).toBe('t1')

      await flushMultiDocCollabHistoryStack()

      editor.get(History).back()
      await tick()
      expect(probe.state.title).toBe('t0')
    })
  })

  describe('异步插槽 AsyncSlotHolder — 插槽文本与撤销', () => {
    let editor!: Editor

    afterEach(() => {
      editor?.destroy()
    })

    test('向内层 AsyncSlot 写入文本后可撤销', async () => {
      const loader = new CachingSubModelLoader()
      const env = await createEditorWithAsyncSlotHolder(loader)
      editor = env.editor
      const inner = env.holder.state.slot
      await awaitAsyncSlotSubDocReady(inner, loader)

      inner.retain(0)
      inner.insert('内')
      expect(inner.toString()).toContain('内')

      await flushMultiDocCollabHistoryStack()

      editor.get(History).back()
      await tick()
      expect(inner.toString()).not.toContain('内')
    })
  })

  describe('删除异步节点后的历史', () => {
    let editor!: Editor

    afterEach(() => {
      editor?.destroy()
    })

    test('移除 JsonAsyncProbe 后可撤销恢复', async () => {
      const loader = new CachingSubModelLoader()
      const env = await createEditorWithJsonAsyncProbe(loader)
      editor = env.editor
      const { probe, root } = env
      await awaitAsyncComponentSubDocReady(probe, loader)

      expect(countNamedBlocks(root.state.slot, JsonAsyncProbe.componentName)).toBe(1)

      root.state.slot.removeComponent(probe)
      expect(countNamedBlocks(root.state.slot, JsonAsyncProbe.componentName)).toBe(0)

      await flushMultiDocCollabHistoryStack()

      editor.get(History).back()
      await tick()
      expect(countNamedBlocks(root.state.slot, JsonAsyncProbe.componentName)).toBe(1)
    })

    test('移除 AsyncSlotHolder 后可撤销恢复', async () => {
      const loader = new CachingSubModelLoader()
      const env = await createEditorWithAsyncSlotHolder(loader)
      editor = env.editor
      const { holder, root } = env
      await awaitAsyncSlotSubDocReady(holder.state.slot, loader)

      expect(countNamedBlocks(root.state.slot, AsyncSlotHolder.componentName)).toBe(1)

      root.state.slot.removeComponent(holder)
      expect(countNamedBlocks(root.state.slot, AsyncSlotHolder.componentName)).toBe(0)

      await flushMultiDocCollabHistoryStack()

      editor.get(History).back()
      await tick()
      expect(countNamedBlocks(root.state.slot, AsyncSlotHolder.componentName)).toBe(1)
    })

    test('删除异步组件前修改 title：撤销先恢复删除再恢复标题（栈逆序）', async () => {
      const loader = new CachingSubModelLoader()
      const env = await createEditorWithJsonAsyncProbe(loader)
      editor = env.editor
      const { probe, root } = env
      await awaitAsyncComponentSubDocReady(probe, loader)

      probe.state.title = 'edited'
      await flushMultiDocCollabHistoryStack()
      await waitCollabHistoryStackWindow()

      root.state.slot.removeComponent(probe)
      expect(countNamedBlocks(root.state.slot, JsonAsyncProbe.componentName)).toBe(0)

      await flushMultiDocCollabHistoryStack()

      editor.get(History).back()
      await tick()
      expect(countNamedBlocks(root.state.slot, JsonAsyncProbe.componentName)).toBe(1)

      editor.get(History).back()
      await tick()
      const restored = firstBlockByName(root.state.slot, JsonAsyncProbe.componentName) as JsonAsyncProbe | null
      expect(restored).not.toBeNull()
      expect(restored!.state.title).toBe('t0')
    })
  })
})
