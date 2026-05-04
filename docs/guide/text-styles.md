# 文字样式

本篇说明如何在 Textbus 里为 **同一插槽中的一段文字** 叠加样式——内核里称为 **格式（Formatter）**。你需要已按 [快速开始](./getting-started) 搭好最小编辑器；若已有 [组件基础](./component-basics) 里的 **Todolist**，格式同样可以作用在其 **正文插槽**（与段落类似，schema 为 **`ContentType.Text`** 的插槽即可）。

## 格式解决什么问题

富文本里常见需求是：**某几个字加粗**、**某一截字号变大**，而 **不必** 为每一种样式单独做一个组件节点。Textbus 把这类「附着在连续文本区间上的标记」抽象成 **`Formatter`**：

- **`name`**（字符串）在当前编辑器实例内 **唯一**，用来区分「这是哪一种格式」。**保存后再打开**、**粘贴** 等场景都依赖这个名称与你在 **`Textbus`** 里注册的 **`Formatter`** 一一对应。
- **`render`** 决定 **这一段字在界面上怎么呈现**：例如包一层 **`strong`**，或通过 **`FormatHostBindingRender`** 把样式挂到外层、**少生成一层嵌套标签**。
- 运行时用 **`Commander.applyFormat(formatter, value)`** 按 **当前选区** 加上或改掉格式；用 **`unApplyFormat`** 去掉某种格式。

这与作用在 **整段插槽** 上的 **属性（Attribute）** 不同——对齐、段前缩进等「整块外观」见 [块级样式](./block-styles)。

## `Formatter` 配置：`render`

构造 **`new Formatter<T>(name, config)`** 时，第二个参数的类型是 **`FormatterConfig<T>`**，**`T`** 为格式值的类型（加粗用 **`boolean`**，字号用 **`string`** 等）。下面先给出类型整体形状（升级依赖后以编辑器中的类型为准），并说明必填的 **`render`**；**`priority`、`inheritable`、`columned`、`checkHost`** 四项可选含义见后文 **[可选字段详解](#optional-formatter-fields)**。

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

一般在 **`editor.render(docRoot)` 完成以后** 再绑定工具条：**`editor.get(Commander)`** 负责 **`applyFormat` / `unApplyFormat`**，**`editor.get(Query)`** 配合 **`queryFormat`** 判断当前选区是否已带上某种格式；选区一变就 **`editor.get(Selection).onChange`** 里再跑一遍查询，刷新按钮上的 **`data-active`**（样式放在 **`style.css`** 即可）。

下面沙箱可改源码并切到「预览」试 **加粗**、**大字**；同一按钮再点一次会关掉对应样式。

<TextbusPlayground preset="text-styles" />

独立工程里若把工具条写在 **`index.html`**、只在 **`App.tsx`** 里绑定事件，写法等价，区别仅是 DOM 归属文件不同。更多 **`Commander` / `Query`** 组合见 [状态查询与基础操作](./operations-and-query)。

## 与组件结构配合时要注意什么

- **格式只能加在「有文本流的插槽」里**：**Todolist** 的正文插槽若为 **`[ContentType.Text]`**，与段落一样支持 **`applyFormat`**。
- **块级组件节点本身**不能用 **`Formatter`**「包一层」——那是 **组件** 的职责；格式作用于 **组件内部插槽里的字符串区间**。

## 可选字段详解 {#optional-formatter-fields}

下列四项可按需在 **`Formatter`** 配置对象里补充；细则见本章 **[可选字段详解](#optional-formatter-fields)**。

### `priority`

**默认 `0`。数字越小越靠前。** 当 **同一段文字上叠了多种格式**、需要决定这几个格式的 **`render` 谁先包谁后包时，会按 **`priority`** 排序后再生成最终的包裹顺序，从而影响页面上的标签嵌套（例如外层是链接还是外层是加粗）。大家都用默认值 **`0`** 时排序仍稳定；若与其它格式的相对次序不符合产品预期，就给其中一方单独调 **`priority`**（常见做法是只差 **`1`**，便于微调）。

### `inheritable`

**默认 `true`。** 表示光标 **贴在某一格式的边缘继续输入** 时，这一段格式是否 **倾向于延伸到新输入的字上**。若为 **`false`**，这类格式一般不会跟着光标「往外长」，更适合只做一次性标记、不希望后续键入自动带上同一格式的场景。是否与 **`applyFormat`**、折叠光标的组合行为有关，边界见 [选区](./selection)。

### `columned`

**默认 `false`，即不启用「列对齐」渲染。** Textbus 在渲染格式时默认按 **最少结构** 原则合并 DOM：例如同一段里既有 **加粗** 又有 **更大的字号**，往往会收成较少的标签层次（外层 **`strong`**、内层一个大字号 **`span`** 等），而不是为每种格式的边界都单独包一层。

**最少结构**（加粗 + 较大字号）——源码与页面效果：

```html
<p>我是 <strong>Textbus <span style="font-size: 30px">富文本编辑器</span></strong></p>
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">效果预览</div>
<p>我是 <strong>Textbus <span style="font-size: 30px">富文本编辑器</span></strong></p>
</div>

当某种样式需要和 **每一段文字** 在视觉上 **严格对齐** 时，最少结构可能显得「贴不齐」。文档里常用的例子是 **文字背景色**：若与其它格式挤在同一套合并标签里，容易出现背景区域与逐字范围不完全一致。

下面的 **代码块与预览中的 DOM** 一致，均为 **`background-color` 等内联样式**（与 Formatter 常见输出形式一致）。效果预览放在 **固定的浅色画布** 里展示，对应常见亮色编辑区；站点切换为深色主题时画布仍为浅色，便于看清高亮与字号的对比。

**同一内容再给外层加背景色**（仍是最少结构合并，等价于 **`columned: false`**）——源码与页面效果：

```html
<p>我是 <strong style="background-color: #8ad9f5">Textbus <span style="font-size: 30px">富文本编辑器</span></strong></p>
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">效果预览（合并背景）</div>
<p>我是 <strong style="background-color: #8ad9f5">Textbus <span style="font-size: 30px">富文本编辑器</span></strong></p>
</div>

这时可把对应 **`Formatter`**（例如背景色）的 **`columned`** 设为 **`true`**：渲染时会 **按内容把该格式拆成多段，并为各段生成单独的标签**，让背景等与文字一一贴合。拆分后源码与页面效果大致如下：

```html
<p>我是 <strong><span style="background-color: #8ad9f5">Textbus </span><span style="font-size: 30px; background-color: #8ad9f5">富文本编辑器</span></strong></p>
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">效果预览（分段背景，columned）</div>
<p>我是 <strong><span style="background-color: #8ad9f5">Textbus </span><span style="font-size: 30px; background-color: #8ad9f5">富文本编辑器</span></strong></p>
</div>

日常 **加粗、字号** 等一般仍可保持 **`columned: false`**，只在需要「按列贴齐」的样式（常见是背景、下划线等）上开启。

### `checkHost`

可选；**不写则不做额外校验**，等价于允许应用。若提供 **`checkHost(host, value)`**，会在 **真正把格式写到插槽里之前** 调用：**`host`** 为当前 **`Slot`**，**`value`** 为本次格式值；返回 **`false`** 则 **本次不应用**（命令侧相当于静默不收）。用来约束 **某种格式只允许出现在满足条件的插槽里**，或对 **`value`** 做合法性校验。

```ts
import { ContentType } from '@textbus/core'

// 示例：仅允许在含文本内容的 schema 插槽里应用（按业务改写条件）
checkHost(host, value) {
  return host.schema.includes(ContentType.Text)
}
```

若 **`checkHost`** 写在 **`Formatter` 配置对象内部**，**`ContentType`** 与 **`Formatter`** 可从同一 **`@textbus/core`** 导入。

## 常见问题

- **点了按钮没反应**：确认 **`formatters`** 已注册、**`name`** 与保存/粘贴场景下的标识一致；再看选区是否落在 **可编辑文本插槽**（而不是整块组件选区）。
- **粘贴丢样式**：粘贴管线是否把外部样式映射到你注册的 **`Formatter`** 名称上，取决于 **`platform-browser`** 与 **`Parser`** 配置；未配置的格式会被丢弃。详见 [文档解析与兼容处理](./document-parse-compat)。
- **重叠格式顺序异常**：调整 **`Formatter`** 的 **`priority`**（数字 **越小越先包外层**）；需要「按字对齐」的背景等再考虑 **`columned: true`**。
- **光标后的字没有继承加粗**：检查 **`inheritable`** 是否为 **`false`**；或折叠光标下的输入继承规则是否符合预期（见 [选区](./selection)）。

## 接下来

- **块级样式（对齐等）**：[块级样式](./block-styles)  
- **选区**：[选区](./selection)  
- [状态查询与基础操作](./operations-and-query)  
- **组件示例**：[组件基础](./component-basics)  
- **名词对照**：[核心概念](./concepts)
