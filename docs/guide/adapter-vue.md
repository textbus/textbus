# Vue 适配器

**`@textbus/adapter-vue`** 用 **Vue 3** 的 **`defineComponent` + `setup`**（或等价写法）渲染 **`Component`** 块视图，并与 **`BrowserModule`** 一起接入浏览器。下列示例与 [快速开始](./getting-started) 中 **`VueAdapter` + `BrowserModule` + `Textbus`** 的接线顺序一致，并按 **当前 5.x** 写法编写（例如 **`new RootComponent({ slot })`** 仅传入初始化数据、**`fromJSON`** 使用 **`Registry.createSlot`**）。

完整工程示例见 [textbus/vue-demo](https://github.com/textbus/vue-demo)，便于对照目录与构建配置。

## 依赖

```bash
npm install @textbus/adapter-vue
```

另需 **`vue@3`**、**`@textbus/core`**、**`@textbus/platform-browser`**、**`reflect-metadata`**，并保证 bundler 能解析 **`@viewfly/core`**（适配器内部用于 **`ReflectiveInjector`**）。

## 视图约定

- 块视图为 **`.vue` 单文件组件**：外层真实 DOM 上绑定 **`rootRef`**（**`:ref="rootRef"`**），插槽子树用 **`<component :is="slotRender()" />`**；**`slotRender`** 内 **`inject(AdapterInjectToken)`** 后调用 **`adapter.slotRender`**，工厂函数里用 **`@textbus/core`** 的 **`createVNode`** 包 **`children`**（与 [Viewfly 适配器](./adapter-viewfly) 一致）。不要用 **`h`** 去包 **`children`**。
- 下方各文件中 **`import`** 使用相对路径（工程里若配置了 **`@/`** 别名，可自行替换）。

## **`VueAdapter` + `BrowserModule` + `Textbus`**

**`new VueAdapter`** 时传入的 **`mount`** 在 **`editor.render(...)`** 时才执行，因此可以在 **`mount`** 里 **`provide`** **`Textbus`** 与 **`VueAdapter`**，此时 **`editor`** 已赋值（见下方 **`let editor`**）。**`mount`** 闭包内引用的 **`adapter`** 在首次执行 **`render`** 时已构造完成。

推荐顺序：**`tokens.ts`（`InjectionKey`）→ 块视图里 `inject(AdapterInjectToken)` → `let editor` → `const adapter = new VueAdapter(...)`，在 `mount` 里 `createApp(root).provide(..., editor).provide(..., adapter)` → `new BrowserModule` → `editor = new Textbus(...)` → `void editor.render(根模型)`**。

下列示例拆成 **两个模型、两个 `.vue` 块视图、注入 token、主入口**；放在同一目录即可，用 Tab 切换查看。

::: code-group

```ts [main.ts]
import 'reflect-metadata'
import { createApp } from 'vue'
import { BrowserModule } from '@textbus/platform-browser'
import { VueAdapter } from '@textbus/adapter-vue'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { AdapterInjectToken, TextbusInjectToken } from './tokens'
import { ParagraphComponent } from './components/paragraph.component'
import ParagraphView from './components/paragraph.view.vue'
import { RootComponent } from './components/root.component'
import RootView from './components/root.view.vue'

let editor!: Textbus

const adapter = new VueAdapter(
  {
    [RootComponent.componentName]: RootView as any,
    [ParagraphComponent.componentName]: ParagraphView as any,
  },
  (host, root) => {
    const app = createApp(root)
      .provide(TextbusInjectToken, editor)
      .provide(AdapterInjectToken, adapter)
    app.mount(host)
    return () => app.unmount()
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

```ts [tokens.ts]
import { InjectionKey } from 'vue'
import { Textbus } from '@textbus/core'
import { VueAdapter } from '@textbus/adapter-vue'

export const TextbusInjectToken: InjectionKey<Textbus> = Symbol('Textbus')
export const AdapterInjectToken: InjectionKey<VueAdapter> = Symbol('Adapter')
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

```vue [components/paragraph.view.vue]
<template>
  <div :ref="rootRef" data-component="paragraph">
    <component :is="slotRender()" />
  </div>
</template>
<script lang="ts" setup>
import { inject, defineProps } from 'vue'
import { ViewComponentProps } from '@textbus/adapter-vue'
import { createVNode } from '@textbus/core'
import { AdapterInjectToken } from '../tokens'
import { ParagraphComponent } from './paragraph.component'

const props = defineProps<ViewComponentProps<ParagraphComponent>>()
const adapter = inject(AdapterInjectToken)!

function slotRender() {
  const slot = props.component.state.slot
  return adapter.slotRender(slot, children => {
    return createVNode('p', null, children)
  })
}
</script>
```

```vue [components/root.view.vue]
<template>
  <div data-component="root" :ref="rootRef">
    <component :is="slotRender()" />
  </div>
</template>
<script lang="ts">
import { defineComponent, inject } from 'vue'
import { ViewComponentProps } from '@textbus/adapter-vue'
import { createVNode } from '@textbus/core'
import { AdapterInjectToken } from '../tokens'
import { RootComponent } from './root.component'

export default defineComponent({
  props: ['component', 'rootRef'],
  setup(props: ViewComponentProps<RootComponent>) {
    const adapter = inject(AdapterInjectToken)!
    return {
      slotRender() {
        const slot = props.component.state.slot
        return adapter.slotRender(slot, children => {
          return createVNode('div', null, children)
        })
      },
    }
  },
})
</script>
```

:::

**`renderTo`** 返回页面上的 **外层容器**（例如 **`#editor`**）；**不要**返回 **`adapter.host`**。卸载页面时调用 **`editor.destroy()`**，以触发 **`mount`** 返回的 **`app.unmount()`**。

## **`slotRender` 与 `provide` / `inject`**

- **`AdapterInjectToken`**：在 **`mount`** 里 **`provide(AdapterInjectToken, adapter)`**，块视图 **`setup`** 内 **`inject(AdapterInjectToken)!`** 再调 **`slotRender`**，无需模块级 **`ref`** 或提前声明的 **`let adapter`**。
- **`TextbusInjectToken`**：便于你在 **Vue** 子树里 **`inject(TextbusInjectToken)`** 做工具栏、状态面板等 UI 联动；**`Selection` / `Commander`** 等内核服务仍在模型侧 **`Component.setup()`** 里通过 **`useContext`**（**`@textbus/core`**）访问。

## **`ViewMount` 第三参**

当前 **`ViewMount`** 签名为 **`(host, root, context)`**，**`context`** 为 **`Injector`**。上例不读取第三参；若要把内核 **`Injector`** 或其中的服务挂进 **Vue** 子树，可在 **`mount`** 里 **`provide`** 自定义 **`InjectionKey`**，值来自 **`context.get(...)`** 等（类型以 **`@textbus/adapter-vue`** 与 **`@textbus/core`** 导出为准）。

## 接下来

- [Viewfly 适配器](./adapter-viewfly)、[React 适配器](./adapter-react)  
- [浏览器平台层](./platform-browser)  
- 导出与类型：[API · adapter-vue](/api/adapter-vue)
