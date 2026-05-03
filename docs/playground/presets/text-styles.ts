import type { PlaygroundPreset } from '../preset-types'

/** 《文字样式》：段落 + 加粗/字号 Formatter + 工具条（应用 / 取消 + Query 同步） */
export const textStylesPreset: PlaygroundPreset = {
  id: 'text-styles',
  defaultOpenPath: 'App.tsx',
  files: {
    'style.css': `html {
  box-sizing: border-box;
  color-scheme: light;
}
*,
*::before,
*::after {
  box-sizing: inherit;
}
html,
body {
  margin: 0;
  min-height: 100%;
  font-family: system-ui, sans-serif;
}
/* 与文档站品牌色、Playground 所用变量名对齐（预览 iframe 内固定浅色，不受文档站深色模式影响） */
:root {
  --vp-c-bg: #ffffff;
  --vp-c-bg-soft: #f6f6f7;
  --vp-c-bg-alt: #f6f6f7;
  --vp-c-divider: rgba(60, 60, 60, 0.12);
  --vp-c-text-1: rgba(60, 60, 60, 0.92);
  --vp-c-text-2: rgba(60, 60, 60, 0.7);
  --vp-c-text-3: rgba(60, 60, 60, 0.56);
  --vp-c-brand-1: #07baf3;
  --vp-c-brand-soft: rgba(7, 186, 243, 0.14);
}

body {
  padding: 12px 16px;
  background: #fff;
  color: rgba(60, 60, 60, 0.92);
}

.text-styles-shell {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tb-editor-host {
  min-height: min(50vh, 480px);
  background: #fff;
  color: rgba(60, 60, 60, 0.92);
}

#boot-error {
  color: #b00020;
  white-space: pre-wrap;
  font-size: 13px;
  padding: 0 0 8px;
  margin: 0;
}

.format-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.tb-format-btn {
  appearance: none;
  font: inherit;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 550;
  letter-spacing: 0.02em;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    color 0.15s ease;
}

.tb-format-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tb-format-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.tb-format-btn[data-active] {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.tb-format-btn[data-variant='bold'] .tb-format-btn__label {
  font-weight: 800;
}

.tb-format-btn[data-variant='size'] .tb-format-btn__hint {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.75;
  margin-left: 4px;
  color: var(--vp-c-text-3);
}
`,

    'formatters.ts': `import { Component, createVNode, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'

export const boldFormatter = new Formatter<boolean>('bold', {
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('strong', null, children)
  },
})

export const fontSizeFormatter = new Formatter<string>('fontSize', {
  render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
    return {
      fallbackTagName: 'span',
      attach(host: VElement) {
        host.styles.set('fontSize', formatValue)
      },
    }
  },
})
`,

    'App.tsx': `// 必须在最先执行：为装饰器与依赖注入提供运行时元数据
import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted } from '@viewfly/core'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { FormatToolbar } from './ui/format-toolbar'
import { boldFormatter, fontSizeFormatter } from './formatters'

function App() {
  const editorHostRef = createRef<HTMLDivElement>()

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
    renderTo: () => editorHostRef.value as HTMLElement,
  })

  const editor = new Textbus({
    components: [RootComponent, ParagraphComponent],
    formatters: [boldFormatter, fontSizeFormatter],
    imports: [browserModule],
  })

  const docRoot = new RootComponent({
    slot: new Slot([ContentType.BlockComponent]),
  })
  const rootSlot = docRoot.state.slot
  const paraSlot = new Slot([ContentType.Text])
  paraSlot.insert('选中一段字或把光标放在句中，点下面按钮：加粗、大字；再点一次可取消。')
  rootSlot.insert(new ParagraphComponent({ slot: paraSlot }))

  onMounted(() => {
    void editor.render(docRoot)
  })

  return () => (
    <FormatToolbar editor={editor} editorHostRef={editorHostRef} />
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
`,

    'ui/format-toolbar.tsx': `import { createRef, onMounted } from '@viewfly/core'
import {
  Commander,
  Query,
  QueryStateType,
  Selection,
  Textbus,
} from '@textbus/core'
import { boldFormatter, fontSizeFormatter } from '../formatters'

export interface FormatToolbarProps {
  editor: Textbus
  editorHostRef: { value: HTMLDivElement | null }
}

/** Viewfly 外壳：工具条 + 编辑挂载点；待 editor.render 完成（onReady）后再绑定命令 */
export function FormatToolbar(props: FormatToolbarProps) {
  const boldBtnRef = createRef<HTMLButtonElement>()
  const sizeBtnRef = createRef<HTMLButtonElement>()

  onMounted(() => {
    const bindToolbar = () => {
      const commander = props.editor.get(Commander)
      const query = props.editor.get(Query)
      const selection = props.editor.get(Selection)

      const syncToolbar = () => {
        const boldState = query.queryFormat(boldFormatter)
        boldBtnRef.value?.toggleAttribute('data-active', boldState.state === QueryStateType.Enabled)
        const sizeState = query.queryFormat(fontSizeFormatter)
        sizeBtnRef.value?.toggleAttribute('data-active', sizeState.state === QueryStateType.Enabled)
      }

      boldBtnRef.value?.addEventListener('click', () => {
        const st = query.queryFormat(boldFormatter)
        if (st.state === QueryStateType.Enabled) {
          commander.unApplyFormat(boldFormatter)
        } else {
          commander.applyFormat(boldFormatter, true)
        }
        syncToolbar()
      })

      sizeBtnRef.value?.addEventListener('click', () => {
        const st = query.queryFormat(fontSizeFormatter)
        if (st.state === QueryStateType.Enabled) {
          commander.unApplyFormat(fontSizeFormatter)
        } else {
          commander.applyFormat(fontSizeFormatter, '22px')
        }
        syncToolbar()
      })

      selection.onChange.subscribe(() => {
        syncToolbar()
      })
      syncToolbar()
    }

    if (props.editor.isReady) {
      bindToolbar()
    } else {
      props.editor.onReady.subscribe(() => {
        bindToolbar()
      })
    }
  })

  return () => (
    <div class="text-styles-shell">
      <div class="format-toolbar" role="toolbar" aria-label="文字格式">
        <button ref={boldBtnRef} type="button" class="tb-format-btn" data-variant="bold">
          <span class="tb-format-btn__label">加粗</span>
        </button>
        <button ref={sizeBtnRef} type="button" class="tb-format-btn" data-variant="size">
          <span class="tb-format-btn__label">大字</span>
          <span class="tb-format-btn__hint">22px</span>
        </button>
      </div>
      <div ref={props.editorHostRef} id="editor-host" class="tb-editor-host" />
    </div>
  )
}
`,

    'components/root.component.tsx': `import {
  Adapter,
  Component,
  ComponentStateLiteral,
  ContentType,
  createVNode,
  onContentInsert,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext
} from '@textbus/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { ParagraphComponent } from './paragraph.component'

export interface RootComponentState {
  slot: Slot
}

export class RootComponent extends Component<RootComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, data: ComponentStateLiteral<RootComponentState>) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new RootComponent({ slot })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const selection = useContext(Selection)
    onContentInsert(ev => {
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        const slot = new Slot([ContentType.Text])
        const p = new ParagraphComponent({ slot })
        slot.insert(ev.data.content)
        ev.target.insert(p)
        selection.setPosition(slot, slot.index)
        ev.preventDefault()
      }
    })
  }
}

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children =>
      createVNode('div', { ref: props.rootRef }, children)
    )
  }
}
`,

    'components/paragraph.component.tsx': `import {
  Adapter,
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  createVNode,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
} from '@textbus/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'

export interface ParagraphComponentState {
  slot: Slot
}

export class ParagraphComponent extends Component<ParagraphComponentState> {
  static componentName = 'ParagraphComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, data: ComponentStateLiteral<ParagraphComponentState>) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new ParagraphComponent({ slot })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const commander = useContext(Commander)
    const selection = useContext(Selection)

    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = new ParagraphComponent({ slot: nextContent })
      commander.insertAfter(p, this)
      selection.setPosition(nextContent, 0)
    })
  }
}

export function ParagraphComponentView(props: ViewComponentProps<ParagraphComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children => createVNode('p', { ref: props.rootRef }, children))
  }
}
`,
  },
  tabs: [
    { path: 'style.css', label: 'style.css' },
    { path: 'App.tsx', label: 'App.tsx' },
    { path: 'formatters.ts', label: 'formatters.ts' },
    { path: 'ui/format-toolbar.tsx', label: 'format-toolbar.tsx' },
    { path: 'components/root.component.tsx', label: 'root.component.tsx' },
    { path: 'components/paragraph.component.tsx', label: 'paragraph.component.tsx' },
  ],
}
