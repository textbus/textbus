# React 适配器

**`@textbus/adapter-react`** 用 **React** 编写块视图，并与 **`BrowserModule`** 一起接入浏览器。下列示例与 [快速开始](./getting-started) 中 **`ReactAdapter` + `BrowserModule` + `Textbus`** 的接线顺序一致，并按 **5.x** 编写（**`ReactAdapter`**、**`new RootComponent({ slot })`** 等）。

完整工程示例见 [textbus/react-demo](https://github.com/textbus/react-demo)，便于对照目录与构建配置。

::: warning React 与性能

受 **React** 更新模型影响，超大文档下帧率通常不如 **Viewfly** 路径；这与 **Textbus** 用法或适配层简单与否并不完全等价。若单文档块数量极大且以键入流畅为首要目标，可优先评估 [Viewfly 适配器](./adapter-viewfly)。

:::

## 依赖

```bash
npm install @textbus/adapter-react
```

另需 **`react`**、**`react-dom`**（**18+** 使用 **`createRoot`**）、**`@textbus/core`**、**`@textbus/platform-browser`**、**`reflect-metadata`**。

## 视图约定

- 块视图为 **函数组件**，入参 **`ViewComponentProps<YourModel>`**；在组件内 **`useContext(AdapterContext)`** 取得 **`ReactAdapter`**，再调 **`slotRender`**。
- **`slotRender`** 工厂内请使用 **`@textbus/core`** 的 **`createVNode`**（与 [Vue 适配器](./adapter-vue) 文档一致），不要用 **`React.createElement`** 直接包 **`children`**。
- **根块视图**：外层真实 DOM（**`<div ref={props.rootRef} …>`**）包一层，**`slotRender`** 的工厂里 **`createVNode('div', null, children)`** 承载插槽子树。
- **段落块视图**：可直接 **`return adapter.slotRender(slot, children => createVNode('p', { ref: props.rootRef, … }, children))`**，**`rootRef`** 落在 **`p`** 上。

## **`ReactAdapter` + `BrowserModule` + `Textbus`**

**`mount`** 里用 **`createRoot(host)`** 渲染 **`<AdapterContext.Provider value={adapter}>{root}</AdapterContext.Provider>`**，块视图 **`useContext(AdapterContext)`** 读取适配器；不必使用模块级 **`ref`**。

下列示例拆成 **两个模型、两个块视图、`adapter-context`、主入口**；模型侧为 **5.x**。放在同一目录即可，用 Tab 切换查看。

::: code-group

```tsx [main.tsx]
import 'reflect-metadata'
import { createRoot } from 'react-dom/client'
import { BrowserModule } from '@textbus/platform-browser'
import { ReactAdapter } from '@textbus/adapter-react'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { AdapterContext } from './adapter-context'
import { ParagraphComponent } from './components/paragraph.component'
import { ParagraphView } from './components/paragraph.view'
import { RootComponent } from './components/root.component'
import { RootComponentView } from './components/root.view'

let editor!: Textbus

const adapter = new ReactAdapter(
  {
    [RootComponent.componentName]: RootComponentView,
    [ParagraphComponent.componentName]: ParagraphView,
  },
  (host, root) => {
    const app = createRoot(host)
    app.render(
      <AdapterContext.Provider value={adapter}>{root}</AdapterContext.Provider>
    )
    return () => {
      app.unmount()
    }
  }
)

const browserModule = new BrowserModule({
  adapter,
  renderTo() {
    return document.getElementById('editor') as HTMLElement
  },
})

editor = new Textbus({
  imports: [browserModule],
  components: [RootComponent, ParagraphComponent],
})

const rootModel = new RootComponent({
  slot: new Slot([ContentType.BlockComponent]),
})

void editor.render(rootModel)
```

```ts [adapter-context.ts]
import { createContext } from 'react'
import type { ReactAdapter } from '@textbus/adapter-react'

export const AdapterContext = createContext<ReactAdapter>(null as any)
```

```ts [components/paragraph.component.ts]
import {
  Commander,
  Component,
  type ComponentStateLiteral,
  ContentType,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf,
} from '@textbus/core'

export interface ParagraphComponentState {
  slot: Slot
}

export class ParagraphComponent extends Component<ParagraphComponentState> {
  static componentName = 'ParagraphComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: ComponentStateLiteral<ParagraphComponentState>) {
    const slot = textbus.get(Registry).createSlot(state.slot)
    return new ParagraphComponent({ slot })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    const self = useSelf()

    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = new ParagraphComponent({ slot: nextContent })
      commander.insertAfter(p, self)
      selection.setPosition(nextContent, 0)
    })
  }
}
```

```ts [components/root.component.ts]
import {
  Component,
  type ComponentStateLiteral,
  ContentType,
  onContentInsert,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
} from '@textbus/core'

import { ParagraphComponent } from './paragraph.component'

export interface RootComponentState {
  slot: Slot
}

export class RootComponent extends Component<RootComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: ComponentStateLiteral<RootComponentState>) {
    const slot = textbus.get(Registry).createSlot(state.slot)
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
```

```tsx [components/paragraph.view.tsx]
import type { ViewComponentProps } from '@textbus/adapter-react'
import { createVNode } from '@textbus/core'
import { useContext } from 'react'

import { AdapterContext } from '../adapter-context'
import { ParagraphComponent } from './paragraph.component'

export function ParagraphView(props: ViewComponentProps<ParagraphComponent>) {
  const slot = props.component.state.slot
  const adapter = useContext(AdapterContext)
  return adapter.slotRender(slot, children =>
    createVNode('p', {
      ref: props.rootRef,
      'data-component': ParagraphComponent.componentName,
    }, children)
  )
}
```

```tsx [components/root.view.tsx]
import type { ViewComponentProps } from '@textbus/adapter-react'
import { createVNode } from '@textbus/core'
import { useContext } from 'react'

import { AdapterContext } from '../adapter-context'
import { RootComponent } from './root.component'

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const slot = props.component.state.slot
  const adapter = useContext(AdapterContext)
  return (
    <div ref={props.rootRef as any} data-component={RootComponent.componentName}>
      {adapter.slotRender(slot, children => createVNode('div', null, children))}
    </div>
  )
}
```

:::

**`renderTo`** 返回 **`#editor`** 一类外层容器；**不要**返回 **`adapter.host`**。页面卸载时 **`editor.destroy()`**，以执行 **`mount`** 返回的 **`unmount`**。

## **`slotRender` 与 `AdapterContext`**

上例在 **`mount`** 里用 **`AdapterContext.Provider`** 包住内核传入的 **`root`**，**`RootComponentView` / `ParagraphView`** 内 **`useContext(AdapterContext)`** 即可调用 **`slotRender`**。若还要在 **React** 子树里读取 **`Textbus`**，可再建 **`createContext<Textbus | null>(null)`** 并在同一 **`mount`** 里嵌套 **`Provider`**。

## 接下来

- [Viewfly 适配器](./adapter-viewfly)、[Vue 适配器](./adapter-vue)  
- [浏览器模块](./platform-browser)
