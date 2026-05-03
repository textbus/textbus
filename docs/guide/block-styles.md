# 块级样式

**块级样式**在 Textbus 里多数通过 **属性（Attribute）** 作用在 **整个插槽** 上：例如 **水平对齐**、（配合自定义 **`Attribute`** 的）段前缩进、段间距等。本篇以 **对齐** 为主例；前置知识与 [文字样式](./text-styles) 互补——那里是 **文字区间上的格式（Formatter）**，这里是 **插槽级别**。

假定你已具备 [快速开始](./getting-started) 的工程；若已有 [组件基础](./component-basics)，对齐同样可以作用在 **段落插槽** 或 **待办正文插槽** 上。

## 属性与格式的分界

- **格式（Formatter）**：附着在 **连续文本区间**，例如加粗、字号、链接；渲染结果通常体现在 **行内** 或合并后的 **文本宿主** 上。
- **属性（Attribute）**：挂在 **插槽整体**，通过 **`Attribute.render(node, value)`** 修改 **承载该插槽内容的虚拟节点**（例如给外包的 **`p`**、**`span`** 容器设 **`text-align`**）。

对齐是典型的 **块级外观**：用 **属性** 一次设定 **当前插槽** 的对齐，符合大多数段落编辑器的产品模型。

## 定义 `textAlign` 属性

下面示例把 CSS **`text-align`** 写到 **`VElement.styles`**，值使用浏览器接受的字符串（**`'left'`**、**`'center'`**、**`'right'`** 等）。

```ts
import { Attribute, VElement } from '@textbus/core'

// 作用在整段插槽：渲染时写到承载该槽内容的虚拟节点 styles
export const textAlignAttribute = new Attribute<string>('textAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('textAlign', formatValue)
  }
})
```

**`name`** 在实例内须唯一，并参与序列化对象 **`slotLiteral.attributes`** 的键名；还原时由 **`Registry.getAttribute`** 找到对应 **`Attribute`** 实例。

## `onlySelf` 与子插槽继承

**`AttributeConfig`** 里可选 **`onlySelf?: boolean`**：

- **默认 `false`**（本例未写）：给 **某一插槽** 设置属性时，内核会把同一属性 **级联** 到该插槽内 **嵌套组件** 的各个子插槽，使整块文档在视觉上 **统一对齐**。
- **`onlySelf: true`**：只作用于 **当前插槽**，子组件插槽不再自动复制该属性。

## 注册到 `Textbus`

与 **`formatters`** 并列，使用 **`attributes`** 数组：

```ts
// attributes：与 formatters 并列注册，便于序列化还原 slotLiteral.attributes
const editor = new Textbus({
  components: [/* ... */],
  formatters: [/* 若已有加粗、字号 */],
  attributes: [textAlignAttribute],
  imports: [browserModule]
})
```

## 用 `Commander.applyAttribute` 应用

**`applyAttribute(attribute, value)`** 会根据 **选区** 决定作用范围：

- **折叠选区**：对 **当前锚点所在的插槽** 调用 **`slot.setAttribute`**（内部仍会触发 **`onSlotSetAttribute`** 等钩子）。
- **跨选区**：若选区内 **只有行内内容**，则对 **所在插槽** 设属性；若选区覆盖 **多个整块子组件**，可能对 **各块的插槽** 分别设置。

按钮绑定示例（可与 [文字样式](./text-styles) 中的工具条合并到同一 **`render().then`**）：

::: code-group

```html [index.html 工具条示例]
<!-- 按钮 id 与 App.tsx 中 getElementById 对应 -->
<div id="toolbar" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
  <button type="button" id="tb-left">左对齐</button>
  <button type="button" id="tb-center">居中</button>
  <button type="button" id="tb-right">右对齐</button>
</div>
```

```tsx [src/App.tsx 片段]
import { Commander } from '@textbus/core'
import { textAlignAttribute } from './attributes'

void editor.render(docRoot).then(() => {
  const commander = editor.get(Commander)
  // applyAttribute 根据选区落在哪个插槽（及跨块规则）写入块级样式
  document.getElementById('tb-left')?.addEventListener('click', () => {
    commander.applyAttribute(textAlignAttribute, 'left')
  })
  document.getElementById('tb-center')?.addEventListener('click', () => {
    commander.applyAttribute(textAlignAttribute, 'center')
  })
  document.getElementById('tb-right')?.addEventListener('click', () => {
    commander.applyAttribute(textAlignAttribute, 'right')
  })
})
```

:::

## 与格式同时存在时

**同一插槽** 可以同时带有 **多个格式区间**（加粗、字号）和 **插槽级属性**（对齐）。渲染阶段先按 **`slot.toTree`** 的规则合并 **格式树**，再在 **承载插槽的宿主节点** 上应用 **属性**。

若视觉上「对齐没有生效」，优先检查：**`rootRef` 绑定的视图节点** 是否是 **`display:block` 宽度撑满** 的容器；**`text-align`** 作用在 **行盒** 上，窄 **`span`** 可能看不出差异。

## 常见问题

- **只对父块生效、子块不动**：可能使用了 **`onlySelf`**，或子块用了 **独立包裹层** 未继承父 **`textAlign`**。
- **清除对齐**：需走 **`Commander`** / **`Slot`** 上对应的清除 API（与 **`cleanAttributes`** 等相关）。

## 接下来

- **文字样式**：[文字样式](./text-styles)  
- **组件示例**：[组件基础](./component-basics)  
- **模块与扩展**：[模块与扩展（进阶）](./editor-and-modules)  
- **术语对照**：[核心概念](./concepts)
