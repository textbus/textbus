# 快速开始

若尚未阅读产品定位与模块划分，建议先看 [简介](./introduction)。

本篇用 **Vite + TypeScript + Viewfly** 搭一个可输入、可换行的最小编辑器：**`@textbus/core`** 提供模型与内核，**`@textbus/platform-browser`** 负责浏览器侧挂载与输入，**`@textbus/adapter-viewfly`** 把文档渲染成 Viewfly 视图。使用 **Vue** 或 **React** 时无需 Viewfly 依赖，接入方式见 [Vue 适配器](/integrate/adapter-vue)、[React 适配器](/integrate/adapter-react)。

## 你会学到什么

- 安装最小 npm 依赖组合  
- 满足装饰器与 JSX 的工程配置  
- 依次装配 **`ViewflyAdapter`**、**`BrowserModule`**，用 **`new Textbus`** 创建实例并 **`render`**

## 1. 创建工程并安装依赖

在本地新建 Vite 项目（示例为 **Vanilla + TypeScript**，后续改为 TSX 入口即可）：

```bash
npm create vite@latest my-textbus-editor -- --template vanilla-ts
cd my-textbus-editor
npm install
```

安装 Textbus 与 Viewfly 相关包（版本号请与当前 npm 上的 **5.x** 主线对齐，下列为示例区间）：

```bash
npm install reflect-metadata @textbus/core @textbus/platform-browser @textbus/adapter-viewfly @viewfly/core @viewfly/platform-browser
npm install -D vite typescript @types/node
```

将入口文件改为 **`src/App.tsx`**（若仍是 `main.ts`，请改名并在 `index.html` 里把脚本指向 `/src/App.tsx`）。

## 2. 配置 TypeScript 与 Vite

内核依赖 **装饰器元数据**，且示例使用 **Viewfly JSX**。请将 `tsconfig.json` 调整为至少包含：

::: code-group

```json [tsconfig.json]
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

```ts [vite.config.ts]
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@viewfly/core'
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: 'automatic',
      jsxImportSource: '@viewfly/core'
    }
  }
})
```

:::

`useDefineForClassFields` 设为 **`false`** 可避免部分装饰器与类字段组合下的反常行为（与当前仓库示例一致）。

## 3. 页面 HTML

根目录 **`index.html`** 保留挂载点即可：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Textbus 最小示例</title>
  </head>
  <body>
    <div id="editor-host" class="tb-editor-host"></div>
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>
```

## 4. 组件、适配器与入口

工程约定下列文件（均可放在 `src/` 下；以下为完整示例，可按项目习惯微调目录）。

::: code-group

```tsx [src/App.tsx]
// 必须在最先执行：为装饰器与依赖注入提供运行时元数据
import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'

import './style.css'

// 与 index.html 中编辑区节点对应，Textbus 会把视图挂在这里
const host = document.getElementById('editor-host') as HTMLElement

// 把「组件类名 → Viewfly 视图函数」交给适配器，并由内核在合适时机创建 / 销毁内层 Viewfly 应用
const adapter = new ViewflyAdapter(
  {
    [RootComponent.componentName]: RootComponentView,
    [ParagraphComponent.componentName]: ParagraphComponentView
  },
  (mountHost, root, context) => {
    const app = createApp(root, { context })
    app.mount(mountHost)
    return () => app.destroy()
  }
)

// 浏览器环境：处理输入、选区等与 DOM 相关的逻辑；renderTo 返回编辑容器
const browserModule = new BrowserModule({
  adapter,
  renderTo: () => host
})

// 注册文档里用到的块级组件，并挂上平台模块
const editor = new Textbus({
  components: [RootComponent, ParagraphComponent],
  imports: [browserModule]
})

// 空文档：根插槽只接受块级子节点，具体内容在用户输入后由根组件插入段落
const docRoot = new RootComponent({
  slot: new Slot([ContentType.BlockComponent])
})

// 启动内核并把根组件渲染到 host
void editor.render(docRoot)
```

```tsx [src/components/root.component.tsx]
import {
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

/** 根组件状态：仅一块容纳块级子节点的根插槽 */
export interface RootComponentState {
  slot: Slot
}

/** 文档根：类型为块级组件，子节点应为段落等块 */
export class RootComponent extends Component<RootComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  /** 从序列化数据恢复：把字面量插槽交给 Registry 还原成运行时 Slot */
  static fromJSON(textbus: Textbus, data: ComponentStateLiteral<RootComponentState>) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new RootComponent({ slot })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const selection = useContext(Selection)
    // 用户向根插槽输入文本类内容时：包一层段落再插入，便于统一用 Paragraph 承载正文与换行
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

/** 根节点对应的 DOM：用 div 包住根插槽渲染结果；rootRef 供内核绑定选区与光标 */
export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children =>
      createVNode('div', { ref: props.rootRef }, children)
    )
  }
}
```

```tsx [src/components/paragraph.component.tsx]
import {
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
  useSelf
} from '@textbus/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'

/** 段落状态：正文写在唯一一块文本插槽里 */
export interface ParagraphComponentState {
  slot: Slot
}

/** 块级段落：内部承载文本，负责「换行拆段」行为 */
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
    const self = useSelf()

    // 回车：从当前段落截断后半段，插入新段落并把光标移到新段开头
    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = new ParagraphComponent({ slot: nextContent })
      commander.insertAfter(p, self)
      selection.setPosition(nextContent, 0)
    })
  }
}

/** 段落视图：用原生 p 包住插槽内容 */
export function ParagraphComponentView(props: ViewComponentProps<ParagraphComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children => createVNode('p', { ref: props.rootRef }, children))
  }
}
```

:::

新增 **`src/style.css`**，保证编辑区有足够高度可聚焦：

```css
body {
  margin: 0;
  padding: 1rem;
}
.tb-editor-host {
  min-height: 240px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
```

## 5. 运行与验证

```bash
npm run dev
```

在浏览器中打开本地地址，点击编辑区域应可输入文字；**Enter** 换行会插入新段落（由 `ParagraphComponent` 中 **`onBreak`** 处理）。

## 常见问题

- **`reflect-metadata` 必须在入口最先加载**：否则装饰器元数据不完整，可能导致运行时依赖注入异常。请保持 **`import 'reflect-metadata'`** 为 **`App.tsx` 的第一条语句**（先于其它 `@textbus/*` 模块）。
- **JSX 与 `jsxImportSource`**：`tsconfig.json` 与 **`vite.config.ts`** 中的 **`jsxImportSource`** 均应对准 **`@viewfly/core`**，否则视图组件无法正确编译。
- **销毁实例**：页面卸载时若需释放编辑器，应对 **`Textbus`** 实例调用 **`destroy()`**（本示例未演示路由场景，集成到 SPA 时请注意）。

## 接下来

- 数据模型与名词：[核心概念](./concepts)  
- 模块与插件：[编辑器与模块](./editor-and-modules)  
- 协作：[协作编辑](/integrate/collaborate)  
- 包级 API 索引：[API 概览](/api/)
