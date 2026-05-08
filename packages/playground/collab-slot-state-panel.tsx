/**
 * 与 `test/collaborate/collab-history.observable-state.spec.tsx` 中
 * 「根插槽扩展 state 字段变更：撤销后恢复初值」对齐，便于在浏览器里打断点调试。
 *
 * 控制台可访问：`window.__collabSlotDebug`（editor、rootSlot、refresh）
 */
import 'reflect-metadata'
import { createRef, onMounted } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { ContentType, History, Slot, Textbus } from '@textbus/core'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import {
  CollabHistory,
  CollaborateModule,
  CustomUndoManagerConfig,
  LocalConnector,
  SyncConnector,
} from '@textbus/collaborate'
import { Doc as YDoc } from 'yjs'

import { RootComponent, RootComponentView } from './test-editor/components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './test-editor/components/paragraph.component'
import { fontSizeFormatter } from './test-editor/formatters/font-size'

const COLLAB_DEBUG_CAPTURE_MS = 80

export function CollabSlotStatePanel() {
  const hostRef = createRef<HTMLDivElement>()
  const logRef = createRef<HTMLTextAreaElement>()

  const api: {
    editor: Textbus | null
    rootSlot: Slot<{ tag: number }> | null
  } = {
    editor: null,
    rootSlot: null,
  }

  function refresh() {
    const log = logRef.value
    const slot = api.rootSlot
    const ed = api.editor
    if (!log || !slot || !ed) {
      return
    }
    const h = ed.get(History)
    const tag = slot.toJSON().state.tag
    log.value = [
      `slot.toJSON().state.tag = ${tag} （期望撤销后为 0）`,
      `History 类型: ${h.constructor.name}（应为 CollabHistory）`,
      `canBack = ${h.canBack}  canForward = ${h.canForward}`,
      '',
      '说明：仅改插槽 state、未删除插槽时引用不变；若撤销无效多为 Y 事务 origin/record 未进 UndoManager。',
    ].join('\n')
  }

  async function afterOp() {
    await new Promise<void>(r => queueMicrotask(r))
    refresh()
  }

  onMounted(() => {
    const getHost = () => hostRef.value!

    const adapter = new ViewflyAdapter(
      {
        [RootComponent.componentName]: RootComponentView,
        [ParagraphComponent.componentName]: ParagraphComponentView,
      },
      (mountHost, root, context) => {
        const vf = createApp(root, { context })
        vf.mount(mountHost)
        return () => vf.destroy()
      },
    )

    const browserModule = new BrowserModule({
      adapter,
      renderTo: getHost,
    })

    const collabModule = new CollaborateModule({
      createConnector(yDoc: YDoc): SyncConnector {
        return new LocalConnector(yDoc)
      },
    })

    const editor = new Textbus({
      providers: [
        {
          provide: CustomUndoManagerConfig,
          useValue: {
            captureTimeout: COLLAB_DEBUG_CAPTURE_MS,
          } as CustomUndoManagerConfig,
        },
      ],
      components: [RootComponent, ParagraphComponent],
      formatters: [fontSizeFormatter],
      imports: [browserModule],
    })

    const rootSlot = new Slot<{ tag: number }>([ContentType.Text], { tag: 0 })
    const docRoot = new RootComponent({
      slot: rootSlot,
      items: [],
    })

    void editor.render(docRoot)

    api.editor = editor
    api.rootSlot = rootSlot

    const exposed = {
      editor,
      rootSlot,
      refresh,
      history: () => editor.get(History),
    }
    ;(window as unknown as { __collabSlotDebug: typeof exposed }).__collabSlotDebug = exposed

    refresh()

    return () => {
      editor.destroy()
      api.editor = null
      api.rootSlot = null
      delete (window as unknown as { __collabSlotDebug?: unknown }).__collabSlotDebug
    }
  })

  return () => (
    <section
      class="collab-slot-state-debug"
      style={{
        marginTop: '20px',
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '6px',
        background: '#fafafa',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>
        调试：根插槽扩展 state（tag）+ CollabHistory 撤销
      </h3>
      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#555' }}>
        与集成测试「根插槽扩展 state 字段变更：撤销后恢复初值」同构；使用 LocalConnector，无需 WebSocket。
      </p>
      <div
        ref={hostRef}
        class="tb-editor-host"
        style={{ minHeight: '80px', marginBottom: '10px', border: '1px dashed #bbb' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => {
            if (!api.rootSlot) {
              return
            }
            api.rootSlot.state.tag = 9
            void afterOp()
          }}
        >
          tag → 9
        </button>
        <button
          type="button"
          onClick={() => {
            api.editor?.get(History).back()
            void afterOp()
          }}
        >
          撤销
        </button>
        <button
          type="button"
          onClick={() => {
            api.editor?.get(History).forward()
            void afterOp()
          }}
        >
          重做
        </button>
        <button type="button" onClick={() => refresh()}>
          刷新状态
        </button>
      </div>
      <textarea
        ref={logRef}
        readonly
        style={{
          width: '100%',
          minHeight: '100px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
        }}
      />
      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#777' }}>
        控制台：<code>window.__collabSlotDebug</code>（含 editor、rootSlot、history()、refresh）
      </p>
    </section>
  )
}
