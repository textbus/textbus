import type { PlaygroundPreset } from '../preset-types'

/**
 * 《快捷键和语法糖》静态 zenCoding：段落内输入 `-` 再按空格 → Todolist（与组件基础共用 Todolist 形态）。
 */
export const zenCodingTodolistPreset: PlaygroundPreset = {
  id: 'zen-coding-todolist',
  defaultOpenPath: 'components/todolist.component.tsx',
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
import { TodolistComponent, TodolistView } from './components/todolist.component'

function App() {
  const editorRef = createRef<HTMLDivElement>()

  const adapter = new ViewflyAdapter(
    {
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [TodolistComponent.componentName]: TodolistView,
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
    zenCoding: true,
    components: [RootComponent, ParagraphComponent, TodolistComponent],
    imports: [browserModule],
  })

  const docRoot = new RootComponent({
    slot: new Slot([ContentType.BlockComponent]),
  })

  const rootSlot = docRoot.state.slot
  const paraSlot = new Slot([ContentType.Text])
  rootSlot.insert(new ParagraphComponent({ slot: paraSlot }))

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

    'components/todolist.component.tsx': `import {
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
import { ParagraphComponent } from './paragraph.component'

/** 内核中的文档状态：勾选结果 + 正文插槽（schema 仅文本，与段落一致） */
export interface TodolistState {
  checked: boolean
  slot: Slot
}

export class TodolistComponent extends Component<TodolistState> {
  // 在编辑器内唯一，用于 JSON、适配器组件表、调试信息
  static componentName = 'Todolist'
  // 块级：在父插槽里作为一整块与段落并列
  static type = ContentType.BlockComponent

  // Zen Coding：在段落正文只有「-」时按空格，整段替换为空白待办（见键盘语法糖文档）
  static zenCoding = {
    match: /^-$/,
    key: ' ',
    createState(_content: string, _textbus: Textbus): TodolistState {
      const slot = new Slot([ContentType.Text])
      return { checked: false, slot }
    },
  }

  // 反序列化：把字面量 slot / checked 还原为运行时 Slot 与组件实例
  static fromJSON(textbus: Textbus, data: ComponentStateLiteral<TodolistState>) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new TodolistComponent({
      checked: !!data.checked,
      slot,
    })
  }

  // 声明子插槽；须按文档中的渲染顺序列出，供选区与沿块的树遍历等使用
  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const commander = useContext(Commander)
    const selection = useContext(Selection)

    onBreak(ev => {
      ev.preventDefault()
      const slot = ev.target

      // 正文为空时回车：用段落替换当前待办，避免光标困在待办壳内无法回到普通段落
      if (slot.isEmpty) {
        const body = new Slot([ContentType.Text])
        const p = new ParagraphComponent({ slot: body })
        commander.replaceComponent(this, p)
        selection.setPosition(body, 0)
        return
      }

      // 非空：从光标位置截断后半段，插入新的 Todolist（勾选状态与当前条一致）
      const nextSlot = slot.cut(ev.data.index)
      const next = new TodolistComponent({
        checked: this.state.checked,
        slot: nextSlot,
      })
      commander.insertAfter(next, this)
      selection.setPosition(nextSlot, 0)
    })
  }
}

export function TodolistView(props: ViewComponentProps<TodolistComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const c = props.component
    const slot = c.state.slot
    return (
      <div
        ref={props.rootRef}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '0.35em 0' }}
      >
        {/* checked 来自组件 state，视图负责同步到原生 checkbox */}
        <input
          type="checkbox"
          checked={c.state.checked}
          onChange={(e: Event) => {
            c.state.checked = (e.target as HTMLInputElement).checked
          }}
          style={{ marginTop: '2px' }}
        />
        {/* 插槽内文档内容由 slotRender + createVNode 渲染；外壳用 Viewfly JSX */}
        {adapter.slotRender(slot, children =>
          createVNode('div', { style: { flex: '1', minWidth: 0 } }, children),
        )}
      </div>
    )
  }
}
`,
  },
  tabs: [
    { path: 'style.css', label: 'style.css' },
    { path: 'App.tsx', label: 'App.tsx' },
    { path: 'components/todolist.component.tsx', label: 'todolist.component.tsx' },
    { path: 'components/root.component.tsx', label: 'root.component.tsx' },
    { path: 'components/paragraph.component.tsx', label: 'paragraph.component.tsx' },
  ],
}
