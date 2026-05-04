# 适配器

在浏览器里，**视图适配器**（**`ViewflyAdapter` / `VueAdapter` / `ReactAdapter`**）继承自 **`DomAdapter`**，再继承 **`@textbus/core`** 的 **`Adapter`**。渲染时，它会在内存里维护两套东西的对照：**文档里的 `Component` / `Slot`**，以及 **页面上已经挂好的真实 DOM**。有了这份对照，你才能在做 **气泡菜单、浮动工具条、协同光标** 之类功能时，在「模型」和「像素」之间来回跳转。

本篇只讲 **`Adapter`** 上这几类 **查询**：从组件或插槽找到 DOM，或从 DOM 反查组件、插槽、在文档里的位置。**怎么写 `mount`、`slotRender`、`BrowserModule`** 仍请看：

- [Viewfly 适配器](./adapter-viewfly)
- [Vue 适配器](./adapter-vue)
- [React 适配器](./adapter-react)
- [浏览器模块](./platform-browser)


## 适配器记住了什么

你可以把它理解成两本「花名册」。

**第一本**记的是每个 **文档块（`Component`）**：块视图最外面那一层真实 DOM，必须通过块视图参数里的 **`rootRef`** 报到适配器上，这一页才算「登记在册」。**第二本**记的是每个 **`Slot`**：你在视图里用 **`slotRender`** 包出来的那一层根容器，对应到页面上的那个 DOM，就是这根插槽在 DOM 侧的「大门」。

只有登记过的根，下面的查询才能对上号；没渲染、没绑 **`rootRef`**、或传进来的不是「根」而是内部子节点，查询就会得到 **`null`** 或空数组。


## 在块视图里拿到适配器

查询方法都挂在 **`Adapter`** 实例上。你在 **块视图**（或 **`mount`** 里挂进去的子树）里要先拿到这个实例。

**Viewfly** 里一般用依赖注入：

```tsx
import { Adapter } from '@textbus/core'
import { inject } from '@viewfly/core'

// 在块视图的 setup 中
const adapter = inject(Adapter)
```

**Vue / React** 没有全局的 `inject(Adapter)` 约定，常见做法是在 **`mount`** 里用 **`provide` / `Context.Provider`** 把 **`Adapter`（或 `VueAdapter` / `ReactAdapter`）** 往下传，块视图里再 **`inject` / `useContext`** 取出。具体写法见各自适配器文档里的 **`AdapterContext`** 一类示例。

下面各节的 **`adapter`** 均指上面拿到的实例。


## 由组件找到根 DOM 元素

有时你已经握住了 **`Component` 实例**（例如块视图里的 **`props.component`**），想知道它现在在页面上占的是哪一块——例如要 **滚动到该块**、或 **在它附近弹层**。这时用 **`getNativeNodeByComponent`**：返回的是 **该块视图最外层**、也就是 **`rootRef`** 绑上去的那个 **`Element`**；若还没挂上或没绑好 **`rootRef`**，会得到 **`null`**。

```tsx
import type { Adapter, Component } from '@textbus/core'

function scrollBlockIntoView(adapter: Adapter, block: Component) {
  const root = adapter.getNativeNodeByComponent(block)
  if (root) {
    root.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}
```


## 由根 DOM 找到文档组件

反过来，事件里常见的是 **`event.target` 是一个 `Element`**，你想判断它是不是 **某个文档块的根**，若是则读出 **`Component`** 做业务逻辑。这时用 **`getComponentByNativeNode`**。

要注意：**只有当你传入的节点恰好是「已登记的组件根」时才会返回组件**；点在块内部的 **`span`、`p` 子节点上，一律是 `null`**，不会自动往上帮你猜是哪个块。

```tsx
import type { Adapter, Component } from '@textbus/core'

function findBlockIfClickedRoot(adapter: Adapter, target: Element | null): Component | null {
  if (!target) {
    return null
  }
  return adapter.getComponentByNativeNode(target)
}
```


## 由插槽找到根 DOM 元素

插槽 **`Slot`** 是嵌在块里的内容容器。你已经有了 **`Slot` 引用**（例如 **`component.slot`**），想知道它在 DOM 里从哪一层开始包着子内容，用 **`getNativeNodeBySlot`**。返回的是 **`slotRender`** 里 **`slotHostRender`** 返回的那层根容器对应的 **元素**；若这根插槽还没被 **`slotRender`** 画进页面，会得到 **`null`**。

```tsx
import type { Adapter } from '@textbus/core'
import type { Slot } from '@textbus/core'

function measureSlotWidth(adapter: Adapter, slot: Slot): number | null {
  const root = adapter.getNativeNodeBySlot(slot)
  if (!root) {
    return null
  }
  return root.getBoundingClientRect().width
}
```


## 由根 DOM 找到插槽

和组件类似：如果你手里有一个 **`Element`**，想确认它是不是 **某段插槽内容的根容器**（也就是 **`slotRender` 那一层的根**），用 **`getSlotByNativeNode`**。是则返回对应的 **`Slot`**，否则 **`null`**。

```tsx
import type { Adapter } from '@textbus/core'
import type { Slot } from '@textbus/core'

function slotFromSlotRootElement(adapter: Adapter, el: Element): Slot | null {
  return adapter.getSlotByNativeNode(el)
}
```


## 列出插槽里的原生节点

**`getNodesBySlot`** 会在 **已经能定位到插槽根 DOM** 的前提下，按 **与文档里子节点顺序一致** 的方式，列出 **这一层内容里** 对应的 **`Element` 和 `Text` 节点**（文本节点也会单独出现）。适合做 **与浏览器选区、Range 对齐** 的遍历，而不是自己去 **`querySelectorAll`** 猜顺序。

若插槽还没有根 DOM，返回的是 **空数组 `[]`**。

```tsx
import type { Adapter } from '@textbus/core'
import type { Slot } from '@textbus/core'

function logSlotNativeOrder(adapter: Adapter, slot: Slot): void {
  const nodes = adapter.getNodesBySlot(slot)
  for (const node of nodes) {
    const kind = node instanceof Element ? node.tagName : '#text'
    console.log(kind, node)
  }
}
```


## 由任意节点反查文档位置

**`getLocationByNativeNode`** 是最「长臂」的一个：你手里可以是 **插槽根内部的任意深层** 的 **`Element` 或 `Text`**，它会 **向上找到所属的插槽根**，再算出 **`NodeLocation`**（里面带有 **`slot`** 以及在文档里的 **索引区间** 等信息，类型见 **`@textbus/core`** 的导出）。这样可以把 **浏览器里的一次命中**，还原成 **模型里的一段位置**。

若节点不在任何已登记的插槽子树里，返回 **`null`**。

```tsx
import type { Adapter } from '@textbus/core'

function hitToModel(adapter: Adapter, node: Element | Text) {
  const loc = adapter.getLocationByNativeNode(node)
  if (!loc) {
    return
  }
  // loc.slot 为所属 Slot；具体字段以 NodeLocation 类型为准
  console.log('落在文档中的位置', loc)
}
```


## 延伸阅读

接线、**`rootRef`、 `slotRender`、`BrowserModule`** 请继续看 **[Viewfly](./adapter-viewfly) / [Vue](./adapter-vue) / [React](./adapter-react)**；与 **输入、选区桥** 相关的行为见 [**浏览器模块**](./platform-browser)。
