import type { PlaygroundPreset } from '../preset-types'

/** 《块级样式》：段落 + textAlign Attribute + 对齐工具条（applyAttribute / unApplyAttribute + Query） */
export const blockStylesPreset: PlaygroundPreset = {
  id: 'block-styles',
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

.block-styles-shell {
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

.align-toolbar {
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

.tb-align-btn {
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

.tb-align-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tb-align-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.tb-align-btn[data-active] {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.tb-align-btn[data-variant='clear'] {
  font-weight: 500;
  color: var(--vp-c-text-3);
}

.tb-align-btn[data-variant='clear']:hover {
  color: var(--vp-c-brand-1);
}
`,

    'attributes.ts': `import { Attribute, VElement } from '@textbus/core'

export const textAlignAttribute = new Attribute<string>('textAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('textAlign', formatValue)
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
import { AlignToolbar } from './ui/align-toolbar'
import { textAlignAttribute } from './attributes'

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
    attributes: [textAlignAttribute],
    imports: [browserModule],
  })

  const docRoot = new RootComponent({
    slot: new Slot([ContentType.BlockComponent]),
  })
  const rootSlot = docRoot.state.slot
  const paraSlot = new Slot([ContentType.Text])
  paraSlot.insert('把光标放在本段或选中部分文字，用下方按钮设置水平对齐；「清除」会去掉本段的 textAlign 属性。')
  rootSlot.insert(new ParagraphComponent({ slot: paraSlot }))

  onMounted(() => {
    void editor.render(docRoot)
  })

  return () => (
    <AlignToolbar editor={editor} editorHostRef={editorHostRef} />
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
`,

    'ui/align-toolbar.tsx': `import { createRef, onMounted } from '@viewfly/core'
import {
  Commander,
  Query,
  QueryStateType,
  Selection,
  Textbus,
} from '@textbus/core'
import { textAlignAttribute } from '../attributes'

export interface AlignToolbarProps {
  editor: Textbus
  editorHostRef: { value: HTMLDivElement | null }
}

export function AlignToolbar(props: AlignToolbarProps) {
  const leftRef = createRef<HTMLButtonElement>()
  const centerRef = createRef<HTMLButtonElement>()
  const rightRef = createRef<HTMLButtonElement>()
  const clearRef = createRef<HTMLButtonElement>()

  onMounted(() => {
    const bindToolbar = () => {
      const commander = props.editor.get(Commander)
      const query = props.editor.get(Query)
      const selection = props.editor.get(Selection)

      const syncToolbar = () => {
        const st = query.queryAttribute(textAlignAttribute)
        const v = st.state === QueryStateType.Enabled ? st.value : null
        leftRef.value?.toggleAttribute('data-active', v === 'left')
        centerRef.value?.toggleAttribute('data-active', v === 'center')
        rightRef.value?.toggleAttribute('data-active', v === 'right')
      }

      const apply = (align: string) => () => {
        commander.applyAttribute(textAlignAttribute, align)
        syncToolbar()
      }

      leftRef.value?.addEventListener('click', apply('left'))
      centerRef.value?.addEventListener('click', apply('center'))
      rightRef.value?.addEventListener('click', apply('right'))
      clearRef.value?.addEventListener('click', () => {
        commander.unApplyAttribute(textAlignAttribute)
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
    <div class="block-styles-shell">
      <div class="align-toolbar" role="toolbar" aria-label="段落对齐">
        <button ref={leftRef} type="button" class="tb-align-btn">
          左对齐
        </button>
        <button ref={centerRef} type="button" class="tb-align-btn">
          居中
        </button>
        <button ref={rightRef} type="button" class="tb-align-btn">
          右对齐
        </button>
        <button ref={clearRef} type="button" class="tb-align-btn" data-variant="clear">
          清除
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
    { path: 'attributes.ts', label: 'attributes.ts' },
    { path: 'ui/align-toolbar.tsx', label: 'align-toolbar.tsx' },
    { path: 'components/root.component.tsx', label: 'root.component.tsx' },
    { path: 'components/paragraph.component.tsx', label: 'paragraph.component.tsx' },
  ],
}

/** Same as {@link blockStylesPreset}; English sample paragraph, toolbar labels, and aria for EN docs. */
export const blockStylesPresetEn: PlaygroundPreset = {
  ...blockStylesPreset,
  id: 'block-styles-en',
  files: {
    ...blockStylesPreset.files,
    'App.tsx': `// Must run first: runtime metadata for decorators and dependency injection
import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted } from '@viewfly/core'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { AlignToolbar } from './ui/align-toolbar'
import { textAlignAttribute } from './attributes'

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
    attributes: [textAlignAttribute],
    imports: [browserModule],
  })

  const docRoot = new RootComponent({
    slot: new Slot([ContentType.BlockComponent]),
  })
  const rootSlot = docRoot.state.slot
  const paraSlot = new Slot([ContentType.Text])
  paraSlot.insert(
    'Place the caret in this paragraph or select text, then use the buttons for horizontal alignment; Clear removes textAlign on this block.',
  )
  rootSlot.insert(new ParagraphComponent({ slot: paraSlot }))

  onMounted(() => {
    void editor.render(docRoot)
  })

  return () => (
    <AlignToolbar editor={editor} editorHostRef={editorHostRef} />
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
`,
    'ui/align-toolbar.tsx': `import { createRef, onMounted } from '@viewfly/core'
import {
  Commander,
  Query,
  QueryStateType,
  Selection,
  Textbus,
} from '@textbus/core'
import { textAlignAttribute } from '../attributes'

export interface AlignToolbarProps {
  editor: Textbus
  editorHostRef: { value: HTMLDivElement | null }
}

export function AlignToolbar(props: AlignToolbarProps) {
  const leftRef = createRef<HTMLButtonElement>()
  const centerRef = createRef<HTMLButtonElement>()
  const rightRef = createRef<HTMLButtonElement>()
  const clearRef = createRef<HTMLButtonElement>()

  onMounted(() => {
    const bindToolbar = () => {
      const commander = props.editor.get(Commander)
      const query = props.editor.get(Query)
      const selection = props.editor.get(Selection)

      const syncToolbar = () => {
        const st = query.queryAttribute(textAlignAttribute)
        const v = st.state === QueryStateType.Enabled ? st.value : null
        leftRef.value?.toggleAttribute('data-active', v === 'left')
        centerRef.value?.toggleAttribute('data-active', v === 'center')
        rightRef.value?.toggleAttribute('data-active', v === 'right')
      }

      const apply = (align: string) => () => {
        commander.applyAttribute(textAlignAttribute, align)
        syncToolbar()
      }

      leftRef.value?.addEventListener('click', apply('left'))
      centerRef.value?.addEventListener('click', apply('center'))
      rightRef.value?.addEventListener('click', apply('right'))
      clearRef.value?.addEventListener('click', () => {
        commander.unApplyAttribute(textAlignAttribute)
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
    <div class="block-styles-shell">
      <div class="align-toolbar" role="toolbar" aria-label="Paragraph alignment">
        <button ref={leftRef} type="button" class="tb-align-btn">
          Left
        </button>
        <button ref={centerRef} type="button" class="tb-align-btn">
          Center
        </button>
        <button ref={rightRef} type="button" class="tb-align-btn">
          Right
        </button>
        <button ref={clearRef} type="button" class="tb-align-btn" data-variant="clear">
          Clear
        </button>
      </div>
      <div ref={props.editorHostRef} id="editor-host" class="tb-editor-host" />
    </div>
  )
}
`,
  },
}
