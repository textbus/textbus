# 文字样式

本篇说明如何在 Textbus 里为 **同一插槽中的一段文字** 叠加样式——内核里称为 **格式（Formatter）**。你需要已按 [快速开始](./getting-started) 搭好最小编辑器；若已有 [组件基础](./component-basics) 里的 **Todolist**，格式同样可以作用在其 **正文槽**（与段落类似，schema 为 **`ContentType.Text`** 的槽即可）。

## 格式解决什么问题

富文本里常见需求是：**某几个字加粗**、**某一截字号变大**，而 **不必** 为每一种样式单独做一个组件节点。Textbus 把这类「附着在连续文本区间上的标记」抽象成 **`Formatter`**：

- **`name`**（字符串）在当前编辑器实例内 **唯一**，用来区分「这是哪一种格式」。**保存后再打开**、**粘贴** 等场景都依赖这个名称与你在 **`Textbus`** 里注册的 **`Formatter`** 一一对应。
- **`render`** 决定 **这一段字在界面上怎么呈现**：例如包一层 **`strong`**，或通过 **`FormatHostBindingRender`** 把样式挂到外层、**少生成一层嵌套标签**。
- 运行时用 **`Commander.applyFormat(formatter, value)`** 按 **当前选区** 加上或改掉格式；用 **`unApplyFormat`** 去掉某种格式。

这与作用在 **整段插槽** 上的 **属性（Attribute）** 不同——对齐、段前缩进等「整块外观」见 [块级样式](./block-styles)。

## `Formatter` 配置：`render` 与其它选项

构造 **`new Formatter<T>(name, config)`** 时，第二个参数的类型是 **`FormatterConfig<T>`**，**`T`** 为格式值的类型（加粗用 **`boolean`**，字号用 **`string`** 等）。下面先给出 **`@textbus/core`** 里的整体形状（升级依赖后以编辑器中的类型为准），再分字段说明。

```ts
import type { Component, Slot, VElement, VTextNode } from '@textbus/core'

/** render 除包一层标签外，还可返回这种「挂到宿主节点」的形态 */
interface FormatHostBindingRender {
  fallbackTagName: string
  attach(host: VElement): void
}

/** Formatter 构造函数的第二参数 */
interface FormatterConfig<T> {
  priority?: number
  inheritable?: boolean
  columned?: boolean
  checkHost?(host: Slot, value: T): boolean
  render(
    children: Array<VElement | VTextNode | Component>,
    formatValue: T,
    renderEnv: unknown,
  ): VElement | FormatHostBindingRender
}
```

### `render` 的两种返回

**`render(children, formatValue, renderEnv)`** 的返回值可以是：

1. **`VElement`**：最常见的「包一层标签」，例如加粗返回 **`createVNode('strong', null, children)`**。
2. **`FormatHostBindingRender`**：包含 **`fallbackTagName`** 与 **`attach(host)`**。优先通过 **`attach`** 把样式加到 **外层已有节点** 上，减少 **`span` 层层包裹**；做不到时再退回用 **`fallbackTagName`** 包一层。字号示例即用 **`attach` + `host.styles.set('fontSize', …)`**。

第三个参数 **`renderEnv`** 携带当前渲染上下文，需要时再分支；多数自定义格式可以忽略。

### 常用可选字段（`FormatterConfig`）

| 字段 | 含义 |
|------|------|
| **`priority`** | 重叠格式并存时的渲染顺序，**数值越小越先渲染**。 |
| **`inheritable`** | 光标停在格式末尾继续输入时，是否 **继承** 该格式（默认 **`true`**）。 |
| **`columned`** | 为 **`true`** 时在格式变化处 **强制拆开呈现结构**，适合格式边界必须对应节点边界的场景。 |
| **`checkHost`** | 返回 **`false`** 时 **不应用** 该格式；可做槽类型、业务规则校验。 |

更细的语义以 **`@textbus/core`** 中 **`FormatterConfig`** 的类型注释为准。

## 示例：`formatters.ts`（加粗 + 字号）

下面假定单独维护 **`src/formatters.ts`**（路径可自定），在入口里 **`import`** 后注册。

### 加粗（`strong`）

值类型用 **`boolean`**，**`true`** 表示启用；本例 **`render`** 不把 **`formatValue`** 写进 DOM，只包一层 **`strong`**。

```ts
import { Component, createVNode, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'

// 名称须与注册到 Textbus 时一致，载入/粘贴才能对上；true 表示启用加粗
export const boldFormatter = new Formatter<boolean>('bold', {
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('strong', null, children)
  }
})
```

### 字号（合并到宿主）

字号需要具体 CSS 值，故 **`Formatter<string>`**。下面把 **`font-size`** 写到 **`attach` 给出的宿主节点样式上**，便于和邻近格式（如加粗） **叠在同一外层**，少一层标签。

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

每种格式都要放进 **`new Textbus({ formatters: [...] })`**（或通过 **`Module`** 合并进来的 **`formatters`**），编辑器才能在 **载入已保存内容**、**粘贴** 等场景里按 **`name`** 认出 **`bold`**、**`fontSize`** 并恢复成你定义的样式。

```ts
// 未出现在 formatters 里的名称，载入或粘贴时无法对应到 Formatter
const editor = new Textbus({
  components: [/* ... */],
  formatters: [boldFormatter, fontSizeFormatter],
  imports: [browserModule]
})
```

若 **`name`** 与内容里保存时用的标识不一致，可能出现样式丢失或无法恢复，应与产品约定对齐。

## `Commander.applyFormat` 与 `unApplyFormat`

**`applyFormat(formatter, value)`** 的行为要点：

- **选区非折叠**：对每个受影响的 **文本区间** 在插槽内分段应用格式；跨多个插槽时会分别处理。
- **选区折叠**：光标未选中一段字时，仍可在光标处 **让接下来输入的字** 自动带上该格式；具体规则见 [选区](./selection)。

**`value`** 的类型须与 **`Formatter<T>`** 的 **`T`** 一致（例如加粗为 **`boolean`**，字号为 **`string`**）。

```ts
import { Commander } from '@textbus/core'
import { boldFormatter, fontSizeFormatter } from './formatters'

const commander = editor.get(Commander)

commander.applyFormat(boldFormatter, true)
commander.applyFormat(fontSizeFormatter, '18px')
```

清除格式：

```ts
commander.unApplyFormat(boldFormatter)
```

**`unApplyFormat`** 同样依赖当前选区；仅清除 **这一种** 格式，其它重叠格式保留。

## 工具条：应用格式并同步 `Query`

浏览器里通常在 **`void editor.render(docRoot).then(...)`** 里绑定 DOM，通过 **`editor.get(Commander)`** 写入格式、**`editor.get(Query)`** 读出当前选区下格式是否生效（**`QueryStateType.Enabled`** 等）。选区变化后需再次查询，常用 **`editor.get(Selection).onChange`** 订阅刷新。

::: code-group

```html [index.html]
<body>
  <!-- 工具条：id 与下方脚本查询一致 -->
  <div id="toolbar" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
    <button type="button" id="tb-bold">加粗</button>
    <button type="button" id="tb-size">大字</button>
  </div>
  <!-- 编辑区域容器：须与创建 Textbus 时配置的挂载目标一致 -->
  <div id="editor-host" class="tb-editor-host"></div>
  <script type="module" src="/src/App.tsx"></script>
</body>
```

```tsx [App.tsx 片段]
import { Commander, Query, QueryStateType, Selection } from '@textbus/core'
import { boldFormatter, fontSizeFormatter } from './formatters'

void editor.render(docRoot).then(() => {
  const commander = editor.get(Commander)
  const query = editor.get(Query)
  const selection = editor.get(Selection)

  const syncToolbar = () => {
    const boldState = query.queryFormat(boldFormatter)
    document.getElementById('tb-bold')?.toggleAttribute(
      'data-active',
      boldState.state === QueryStateType.Enabled,
    )
    const sizeState = query.queryFormat(fontSizeFormatter)
    document.getElementById('tb-size')?.toggleAttribute(
      'data-active',
      sizeState.state === QueryStateType.Enabled,
    )
  }

  // applyFormat 依赖当前选区：折叠时在光标处承接后续输入格式
  document.getElementById('tb-bold')?.addEventListener('click', () => {
    commander.applyFormat(boldFormatter, true)
    syncToolbar()
  })
  document.getElementById('tb-size')?.addEventListener('click', () => {
    commander.applyFormat(fontSizeFormatter, '22px')
    syncToolbar()
  })

  selection.onChange.subscribe(() => {
    syncToolbar()
  })
  syncToolbar()
})
```

:::

**`data-active`** 仅作示意，样式需在 CSS 里定义（例如 **`button[data-active]`**）。加粗若要做 **切换**（再点取消），可结合 **`queryFormat`** 判断 **`Enabled`** 时改调 **`unApplyFormat`**，逻辑见 [基础操作与状态查询](./operations-and-query)。

## 与组件结构配合时要注意什么

- **格式只能加在「有文本流的插槽」里**：**Todolist** 的正文槽若为 **`[ContentType.Text]`**，与段落一样支持 **`applyFormat`**。
- **块级组件节点本身**不能用 **`Formatter`**「包一层」——那是 **组件** 的职责；格式作用于 **组件内部插槽里的字符串区间**。

## 常见问题

- **点了按钮没反应**：确认 **`formatters`** 已注册、**`name`** 与保存/粘贴场景下的标识一致；再看选区是否落在 **可编辑文本插槽**（而不是整块组件选区）。
- **粘贴丢样式**：粘贴管线是否把外部样式映射到你注册的 **`Formatter`** 名称上，取决于 **`platform-browser`** 与 **`Parser`** 配置；未配置的格式会被丢弃。详见 [文档解析与兼容处理](./document-parse-compat)。
- **重叠格式顺序异常**：调整 **`Formatter`** 的 **`priority`**，或酌情启用 **`columned`**（见类型注释）。
- **光标后的字没有继承加粗**：检查 **`inheritable`** 是否为 **`false`**；或折叠光标下的输入继承规则是否符合预期（见 [选区](./selection)）。

## 接下来

- **块级样式（对齐等）**：[块级样式](./block-styles)  
- **组件示例**：[组件基础](./component-basics)  
- **`Commander` / `Query` 总览**：[基础操作与状态查询](./operations-and-query)  
- **选区**：[选区](./selection)  
- **名词对照**：[核心概念](./concepts)
