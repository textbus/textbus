# 文字样式

本篇说明如何在 Textbus 里为 **同一插槽中的一段文字** 叠加样式——内核里称为 **格式（Formatter）**。正文约定你已具备 [快速开始](./getting-started) 的工程；若文档里已有 [组件基础](./component-basics) 中的 **`TodoRow`** 正文槽，格式同样可以作用在上面；仅有 **段落** 时亦可完全照搬。

## 格式解决什么问题

富文本里常见需求是：**某几个字加粗**、**某一截字号变大**，而 **不必** 为每一种样式单独做一个组件节点。Textbus 把这类「附着在连续文本区间上的标记」抽象成 **`Formatter`**：

- 由 **`name`**（字符串）在编辑器实例内唯一标识，并出现在 **`Slot`** 序列化结果的 **`formats`** 字段中。
- **`render`** 决定 **该区间的虚拟 DOM** 如何包裹子内容（或如何把样式 **合并** 到外层节点上以减少标签嵌套）。
- 运行时通过 **`Commander.applyFormat(formatter, value)`** 按 **当前选区** 写入或调整格式；通过 **`unApplyFormat`** 清除。

这与作用在 **整段插槽** 上的 **属性（Attribute）** 不同；对齐、段前缩进等「整块外观」见 [块级样式](./block-styles)。

## `Formatter` 的配置项：`render` 与返回值

**`Formatter`** 构造函数的第二个参数是 **`FormatterConfig<T>`**，其中 **`T`** 为格式值的类型（加粗示例用 **`boolean`**，字号用 **`string`** 如 **`'18px'`**）。

**`render(children, formatValue, renderEnv)`** 的返回值可以是：

1. **`VElement`**：最常见的「包一层标签」写法，例如加粗返回 **`createVNode('strong', null, children)`**。
2. **`FormatHostBindingRender`**：包含 **`fallbackTagName`** 与 **`attach(host)`**。内核会优先尝试把样式 **`attach`** 到 **合并后的宿主节点** 上，减少 **`span` 套 `span`**；无法满足时再退回到 **`fallbackTagName`** 对应的标签。字号示例即用 **`attach` + `host.styles.set('fontSize', …)`**。

可选配置还包括 **`priority`**（重叠格式时的渲染次序）、**`inheritable`**（光标在格式末尾继续输入是否继承）、**`columned`**（是否强制断行分页式渲染）等；需要时再查 **`FormatterConfig`** 类型注释。

## 示例一：加粗（`strong`）

加粗的值类型可以用 **`boolean`**，此处 **`true`** 表示启用；**`render`** 不把 **`formatValue`** 写入 DOM，仅产出 **`strong`**。

```ts
import { Component, createVNode, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'

// name 'bold' 会出现在序列化 formats 中；true 表示启用加粗
export const boldFormatter = new Formatter<boolean>('bold', {
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('strong', null, children)
  }
})
```

## 示例二：字号（样式合并）

字号需要 **具体的 CSS 值**，故 **`Formatter<string>`**。下面写法把 **`font-size`** 写到宿主 **`VElement.styles`**，便于与邻近格式（如加粗）合并到同一外层节点。

```ts
// attach：尽量合并到宿主节点，减少 span 嵌套；无法满足时用 fallbackTagName
export const fontSizeFormatter = new Formatter<string>('fontSize', {
  render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
    return {
      fallbackTagName: 'span',
      attach(host: VElement) {
        host.styles.set('fontSize', formatValue)
      }
    }
  }
})
```

## 注册到 `Textbus`

格式必须出现在 **`new Textbus({ formatters: [...] })`**（或合并进来的 **`Module.formatters`**）中，**`Registry`** 才能在 **`fromJSON` / 粘贴还原** 等路径里根据名称 **`bold`**、**`fontSize`** 还原区间。

```ts
// formatters：Registry 才能按名称还原粘贴 / fromJSON 中的区间格式
const editor = new Textbus({
  components: [/* ... */],
  formatters: [boldFormatter, fontSizeFormatter],
  imports: [browserModule]
})
```

## 用 `Commander.applyFormat` 应用到选区

**`applyFormat(formatter, value)`** 的行为要点：

- **选区非折叠**：对每个受影响的 **文本区间** 调用插槽上的 **`retain` + 格式应用**（内部会触发 **`onSlotApplyFormat`** 等钩子），跨多个插槽时会分段处理。
- **选区折叠**：若插槽为空或需在光标处「承接后续输入」，内核会写入 **占位策略**（例如插入 **`Slot.placeholder`** 并附着格式），使 **接下来键入的字符** 自动带上该格式。更细的边界见 [选区](./selection)。

清除格式使用 **`commander.unApplyFormat(boldFormatter)`**（或对应 **`Formatter` 实例**）。

## 工具条：在 `render` 之后取 `Commander`

浏览器里通常在 **`void editor.render(docRoot).then(...)`** 里绑定按钮，通过 **`editor.get(Commander)`** 取得 **`Commander`**（**`Textbus`** 实例即容器）。

::: code-group

```html [index.html]
<body>
  <!-- 工具条：id 与下方脚本查询一致 -->
  <div id="toolbar" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
    <button type="button" id="tb-bold">加粗</button>
    <button type="button" id="tb-size">大字</button>
  </div>
  <!-- BrowserModule.renderTo 通常指向此节点 -->
  <div id="editor-host" class="tb-editor-host"></div>
  <script type="module" src="/src/App.tsx"></script>
</body>
```

```tsx [src/App.tsx 片段]
import { Commander } from '@textbus/core'
import { boldFormatter, fontSizeFormatter } from './formatters'

void editor.render(docRoot).then(() => {
  const commander = editor.get(Commander)
  // applyFormat 依赖当前选区：折叠时在光标处承接后续输入格式
  document.getElementById('tb-bold')?.addEventListener('click', () => {
    commander.applyFormat(boldFormatter, true)
  })
  document.getElementById('tb-size')?.addEventListener('click', () => {
    commander.applyFormat(fontSizeFormatter, '22px')
  })
})
```

:::

## 与组件结构配合时要注意什么

- **格式只能加在「有文本流的插槽」里**：**`TodoRow`** 的正文槽若为 **`[ContentType.Text]`**，则与段落一样支持 **`applyFormat`**。
- **块级组件节点本身**不能用 **`Formatter`**「包一层」——那是 **组件** 的职责；格式作用于 **组件内部插槽里的字符串区间**。

## 常见问题

- **点了按钮没反应**：确认 **`formatters`** 已注册、**`Formatter.name`** 与序列化一致；再看选区是否落在 **可编辑文本插槽**（而不是整块组件选区）。
- **粘贴丢样式**：粘贴管线是否把外部样式映射到你注册的 **`Formatter`** 名称上，取决于 **`platform-browser`** 与 **`Parser`** 配置；未配置的格式会被丢弃。详见 [文档解析与兼容处理](./document-parse-compat)。
- **重叠格式顺序异常**：调整 **`Formatter`** 的 **`priority`**，或拆成 **`columned`** 策略（见类型定义）。

## 接下来

- **块级样式（对齐等）**：[块级样式](./block-styles)  
- **组件示例**：[组件基础](./component-basics)  
- **选区**：[选区](./selection)  
- **名词对照**：[核心概念](./concepts)
