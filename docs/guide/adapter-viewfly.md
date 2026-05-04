# Viewfly 适配器

**`@textbus/adapter-viewfly`** 把文档模型里的 **`Component`** 树渲染成 **Viewfly** 组件树，并与 **`@textbus/platform-browser`** 的 **`BrowserModule`** 一起在浏览器里完成 **挂载、选区与输入**。

若你尚未跑通最小工程，可先跟 [快速开始](./getting-started) 配好 **依赖、TypeScript / Vite 与 Viewfly JSX**；本篇默认你已能写 **`RootComponent` / `ParagraphComponent`** 等模型与 **`RootComponentView`** 等块视图。

## 依赖

在 **`@textbus/core`**、**`@textbus/platform-browser`** 之外，至少安装 **`@textbus/adapter-viewfly`**、**`@viewfly/core`**、**`@viewfly/platform-browser`** 与 **`reflect-metadata`**（须在所有 **`@textbus/*`** 导入之前执行，见 [快速开始](./getting-started)）。

工程需为 **Viewfly JSX** 配置 **`jsx: "react-jsx"`** 与 **`jsxImportSource: "@viewfly/core"`**，并在 **Vite** 的 **`esbuild`** / **`optimizeDeps.esbuildOptions`** 中保持同一 **`jsxImportSource`**。

## 与 **`BrowserModule`** 组合（浏览器）

**`BrowserModule`** 负责 **编辑区外壳**、把 **`adapter.host`** 放进页面、接上 **`Input` / `SelectionBridge`** 等；**`ViewflyAdapter`** 负责 **把文档块画成 Viewfly 节点**。二者通过 **`Textbus`** 的 **`imports`** 拼在一起。

推荐顺序如下（与 [快速开始](./getting-started) 内嵌 Playground 示例一致）：

1. 在页面上准备一个 **容器 DOM**（例如 **`#editor-host`**），并能在代码里拿到 **`HTMLElement`**（下面用 **`createRef`** 指向它）。
2. **`new ViewflyAdapter(组件表, mount 函数)`**：在 **`mount`** 里用 **`createApp(root, { context })`** 把内核给你的 **根 Viewfly 节点**挂到 **`host`**，并把第三参 **`context`（`Injector`）** 原样传给 Viewfly，这样块视图里 **`useContext(Selection)`** 等才能工作。
3. **`new BrowserModule({ adapter, renderTo })`**：**`renderTo`** 返回 **第 1 步的容器**；**不要**把 **`adapter.host`** 当作 **`renderTo`** 的返回值——内核会把 **`adapter.host`** 插进 **`BrowserModule`** 拼好的布局里，再整体挂进你的容器。
4. **`new Textbus({ components, imports: [browserModule, …] })`**，在 **`onMounted`**（或等价时机）里 **`await editor.render(根组件实例)`**。
5. 页面卸载时 **`editor.destroy()`**，并执行 **`mount`** 返回的清理函数（例如 **`app.destroy()`**）。

下面示例按 **两个模型、两个块视图、一个入口** 共 **5 个文件** 组织（例如 **`src/components/`** 下放四个块文件，**`src/App.tsx`** 为入口）。

::: code-group

```tsx [App.tsx]
import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted, onUnmounted } from '@viewfly/core'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { ParagraphComponent } from './components/paragraph.component'
import { ParagraphComponentView } from './components/paragraph.view'
import { RootComponent } from './components/root.component'
import { RootComponentView } from './components/root.view'

function App() {
  const editorRef = createRef<HTMLDivElement>()
  let editor: Textbus | null = null

  onMounted(() => {
    const adapter = new ViewflyAdapter(
      {
        [RootComponent.componentName]: RootComponentView,
        [ParagraphComponent.componentName]: ParagraphComponentView,
      },
      (mountHost, root, context) => {
        const vf = createApp(root, { context })
        vf.mount(mountHost)
        return () => vf.destroy()
      }
    )

    const browserModule = new BrowserModule({
      adapter,
      renderTo: () => editorRef.current as HTMLElement,
    })

    editor = new Textbus({
      components: [RootComponent, ParagraphComponent],
      imports: [browserModule],
    })

    const docRoot = new RootComponent({
      slot: new Slot([ContentType.BlockComponent]),
    })

    void editor.render(docRoot)
  })

  onUnmounted(() => {
    editor?.destroy()
    editor = null
  })

  return () => (
    <div>
      <div ref={editorRef} id="editor-host" class="tb-editor-host" />
    </div>
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
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
import { createVNode } from '@textbus/core'
import { inject } from '@viewfly/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import type { Adapter } from '@textbus/core'

import type { ParagraphComponent } from './paragraph.component'

export function ParagraphComponentView(props: ViewComponentProps<ParagraphComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children =>
      createVNode('p', { ref: props.rootRef }, children)
    )
  }
}
```

```tsx [components/root.view.tsx]
import { createVNode } from '@textbus/core'
import { inject } from '@viewfly/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import type { Adapter } from '@textbus/core'

import type { RootComponent } from './root.component'

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children =>
      createVNode('div', { 'textbus-document': 'true', ref: props.rootRef }, children)
    )
  }
}
```

:::

**`ViewflyAdapter`** 继承 **`DomAdapter`**，还负责 **`slotRender`**、合成输入下划线等；**不要**把它当成普通 UI 框架里的「小组件」，它就是 **`BrowserModule`** 所要求的 **`adapter`** 类型。

## **`ViewflyAdapter` 的两个参数**

**第一个参数**：**`ViewflyAdapterComponents`**，即 **`Record<string, ComponentSetup<ViewComponentProps<any>>>`**。键为 **`Component.componentName`**；值为该块的 **Viewfly 视图**。内核按当前文档节点的 **`name`** 查表；找不到且没有 **`'*'`** 时会抛错，完整英文消息形如 <code>cannot found view component `…`!</code>（省略号处为 **`component.name`**）。

**第二个参数**：**`ViewMount`**。内核把 **`adapter.host`** 作为 **`host`**，把根块对应的 **Viewfly 根节点**作为 **`root`** 传入；第三参 **`context`** 为 **`Textbus`** 的 **`Injector`**，**必须**传给 **`createApp(root, { context })`**，否则块视图里 **`useContext`** 取不到 **`Selection`**、**`Commander`** 等。

## 块视图：**`ViewComponentProps`**

每个块级视图是一个 **Viewfly 组件 setup**，入参类型为 **`ViewComponentProps<T>`**（**`T`** 为你的 **`Component`** 子类）：

- **`props.component`**：当前文档节点实例，可读 **`state`**；在模型侧写的 **`setup()`** 里仍通过 **`useContext`** 访问内核服务。
- **`props.rootRef`**：**`DynamicRef<Element>`**，**必须**绑到你渲染的 **根 DOM 元素**上（例如 **`<div ref={props.rootRef}>`**）。内核用它在 **`DomAdapter`** 里缓存「模型组件 ↔ 根 DOM」，用于选区、合成输入与 **`slotRender`** 的宿主定位。未绑定会在更新阶段抛出错误：<code>Component `…` is not bound to rootRef</code>（省略号处为 **`component.name`**）。

## 渲染插槽：**`adapter.slotRender`**

正文与子结构在模型里是 **`Slot`**，在视图里通过 **`Adapter.slotRender`** 接到 **虚拟 DOM**。在 Viewfly 里，**`slotRender` 的工厂参数**返回的子树是 **`VElement` / `VTextNode` / 子 `Component`**，需要包成 **Viewfly 可渲染节点**时，用 **`createVNode`**（从 **`@textbus/core`** 导入）包一层宿主元素。

单插槽段落常见写法见 **`components/paragraph.view.tsx`** 示例。多插槽或自定义外壳时，仍保证 **`ref={props.rootRef}`** 落在 **该块对应的单一根元素**上；插槽区域可用独立子组件（例如订阅 **`slot.__changeMarker__`** 并在变更时 **`markAsDirtied`**，见 [快速开始](./getting-started) 中的 **`SlotRender`** 思路与 [插槽](./slot)）。

## **`ViewflyVDomAdapter`**

包内另导出 **`ViewflyVDomAdapter`**（继承 **`@textbus/platform-node`** 的 **`NodeViewAdapter`**），面向 **非浏览器 / 字符串化视图** 等场景，与桌面浏览器内 **`ViewflyAdapter` + `BrowserModule`** 的主路径不同。一般集成只需 **`ViewflyAdapter`**。

## 常见问题

- **装饰器元数据**：**`emitDecoratorMetadata`**、**`reflect-metadata`** 缺任一项可能导致 **`Textbus`** 启动期注入失败。
- **根 DOM 上的 `ref`（`rootRef`）**：块视图最外层必须是 **真实 DOM**，且 **`rootRef`** 绑在该层；插在中间的 **`Fragment`** 或未挂 **`ref`** 的包装会导致 **`rootRef`** 报错。
- **销毁**：路由或弹层卸载时，对 **`Textbus`** 调用 **`destroy()`**，并确保 **`mount`** 返回的 teardown 会执行（**`app.destroy()`**）。

## 接下来

- [Vue 适配器](./adapter-vue)、[React 适配器](./adapter-react)  
- [浏览器模块](./platform-browser)  
- [组件基础](./component-basics)、[插槽](./slot)  
- 类型与导出索引：[@textbus/adapter-viewfly](./package-adapter-viewfly)
