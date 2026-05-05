import type { PlaygroundPreset } from '../preset-types'

/** 快速开始多文件示例 */
export const gettingStartedPreset: PlaygroundPreset = {
  id: 'getting-started',
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
body {
  padding: 12px 16px;
  background: #fff;
  color: rgba(60, 60, 60, 0.92);
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

function App() {
  const editorRef = createRef<HTMLDivElement>()

  const adapter = new ViewflyAdapter(
    {
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView
    },
    (mountHost, root, context) => {
      const vf = createApp(root, { context })
      vf.mount(mountHost)
      return () => vf.destroy()
    }
  )

  const browserModule = new BrowserModule({
    adapter,
    renderTo: () => editorRef.value as HTMLElement
  })

  const editor = new Textbus({
    components: [RootComponent, ParagraphComponent],
    imports: [browserModule]
  })

  const docRoot = new RootComponent({
    slot: new Slot([ContentType.BlockComponent])
  })

  onMounted(() => {
    void editor.render(docRoot)
  })

  return () => (
    <div>
      <div ref={editorRef} id="editor-host" class="tb-editor-host" />
    </div>
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
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
    { path: 'components/root.component.tsx', label: 'root.component.tsx' },
    { path: 'components/paragraph.component.tsx', label: 'paragraph.component.tsx' },
  ],
}

/** Same sample as {@link gettingStartedPreset}; English comments in `App.tsx` for EN docs. */
export const gettingStartedPresetEn: PlaygroundPreset = {
  ...gettingStartedPreset,
  id: 'getting-started-en',
  files: {
    ...gettingStartedPreset.files,
    'App.tsx': `// Must run first: runtime metadata for decorators and dependency injection
import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted } from '@viewfly/core'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'

function App() {
  const editorRef = createRef<HTMLDivElement>()

  const adapter = new ViewflyAdapter(
    {
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView
    },
    (mountHost, root, context) => {
      const vf = createApp(root, { context })
      vf.mount(mountHost)
      return () => vf.destroy()
    }
  )

  const browserModule = new BrowserModule({
    adapter,
    renderTo: () => editorRef.value as HTMLElement
  })

  const editor = new Textbus({
    components: [RootComponent, ParagraphComponent],
    imports: [browserModule]
  })

  const docRoot = new RootComponent({
    slot: new Slot([ContentType.BlockComponent])
  })

  onMounted(() => {
    void editor.render(docRoot)
  })

  return () => (
    <div>
      <div ref={editorRef} id="editor-host" class="tb-editor-host" />
    </div>
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
`,
  },
}
