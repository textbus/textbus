# 块级样式

本篇说明如何用 **属性（Attribute）** 给 **整个插槽** 设定外观——内核把这类「包住整块内容」的元数据挂在 **`Slot`** 上，渲染时通过 **`Attribute.render`** 写到 **承载该插槽内容的虚拟节点**（例如段落外包的 **`p`**）。你需要已按 [快速开始](./getting-started) 搭好最小编辑器；若已有 [组件基础](./component-basics) 里的 **段落** 或 **Todolist**，属性同样可以作用在其 **正文槽**（任意承载文档流的 **`Slot`** 均可参与 **`applyAttribute`**）。

与 [文字样式](./text-styles) 的分工：**格式（Formatter）** 标在 **连续文本区间**（某几个字加粗）；**属性** 作用在 **插槽整体**（整段对齐、整槽业务标记等）。概念对照见 [核心概念](./concepts)。

## 属性解决什么问题

若每种块级外观都做成单独组件类型，树会变碎、协作合并也更繁。Textbus 用 **`Attribute`** 表达「**这一槽** 上的整块设定」：

- **`name`**（字符串）在当前编辑器实例内 **唯一**，与 **`slotLiteral.attributes`** 里保存的键对应；**载入与粘贴** 时要能在 **`new Textbus({ attributes: [...] })`** 里找到同名 **`Attribute`**。
- **`render(node, formatValue, renderEnv)`** 在虚拟树上 **改写承载节点**：常见写法是给 **`node.styles`** 设 **`text-align`**、**`paddingLeft`** 等；**不写子节点**，子内容仍由 **`slot.toTree`** 与格式树生成。
- 运行时用 **`Commander.applyAttribute(attribute, value)`** 按 **当前选区** 写入；用 **`unApplyAttribute(attribute)`** 去掉某一种属性；需要一次清掉多种属性时可用 **`Commander.cleanAttributes`**：第一个参数可传 **要保留的属性实例数组**，或 **`(attribute) => boolean`**，返回 **`true`** 表示 **保留** 该属性，其余会被清掉。

## 与格式的分界（简表）

| | **格式（Formatter）** | **属性（Attribute）** |
| --- | --- | --- |
| 作用范围 | 插槽内 **一段文本** | **整个插槽** |
| 典型用途 | 加粗、字号、链接 | 对齐、缩进、整槽标记 |
| 写入 API | **`applyFormat` / `unApplyFormat`** | **`applyAttribute` / `unApplyAttribute`** |
| 查询 API | **`Query.queryFormat`** | **`Query.queryAttribute`** |

## `Attribute` 配置：`render`

构造 **`new Attribute<T>(name, config)`** 时，**`T`** 为属性值的类型（对齐用 **`string`**，开关类可用 **`boolean`** 等）。**`AttributeConfig<T>`** 的形状如下（升级依赖后以编辑器中的类型为准）；**`onlySelf`、`checkHost`** 含义见后文 **[可选字段详解](#optional-attribute-fields)**。

```ts
import type { Slot, VElement } from '@textbus/core'

interface AttributeConfig<T> {
  onlySelf?: boolean
  checkHost?(host: Slot, value: T): boolean
  render(node: VElement, formatValue: T, renderEnv: unknown): void
}
```

**`render`** 接收 **尚未附带本属性效果的** 宿主 **`VElement`**，你在其中写入样式或其它虚拟节点字段即可。第三个参数 **`renderEnv`** 与格式的 **`render`** 类似，来自 **`slot.toTree`** 的渲染上下文，多数自定义属性可以忽略。

## 示例：`attributes.ts`（`textAlign`）

下面把 CSS **`text-align`** 写到宿主节点样式上，值使用浏览器接受的字符串（**`'left'`**、**`'center'`**、**`'right'`** 等）。

```ts
import { Attribute, VElement } from '@textbus/core'

export const textAlignAttribute = new Attribute<string>('textAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('textAlign', formatValue)
  },
})
```

## 注册到 `Textbus`

每种属性都要放进 **`new Textbus({ attributes: [...] })`**（或由 **`Module`** 合并），编辑器才能在 **反序列化**、**粘贴** 等场景按 **`name`** 还原 **`textAlign`** 等键。

```ts
const editor = new Textbus({
  components: [/* ... */],
  attributes: [textAlignAttribute],
  imports: [browserModule],
})
```

若 **`name`** 与内容里保存的标识不一致，可能出现属性丢失或无法恢复。

## `Commander.applyAttribute` 与 `unApplyAttribute`

**`applyAttribute(attribute, value)`** 会根据 **选区** 决定写入哪些 **`Slot`**：

- **选区折叠**：对 **`selection.commonAncestorSlot`** 调用 **`slot.setAttribute`**（内部会触发 **`onSlotSetAttribute`** 等钩子，可被阻止；见 [组件事件与生命周期](./component-events-and-lifecycle)）。
- **选区展开**：对每个 **选中范围**（**`getSelectedScopes()`**）切出内容——若范围内 **含有文本或行内组件**，则把属性设在 **该范围的宿主插槽** 上；若范围内 **只有块级子组件**，则对 **每个子组件身上的各个插槽** 分别 **`setAttribute`**。

**`value`** 的类型须与 **`Attribute<T>`** 的 **`T`** 一致。

```ts
import { Commander } from '@textbus/core'
import { textAlignAttribute } from './attributes'

const commander = editor.get(Commander)

commander.applyAttribute(textAlignAttribute, 'center')
```

清除 **某一种** 属性：

```ts
commander.unApplyAttribute(textAlignAttribute)
```

**`unApplyAttribute`** 与 **`applyAttribute`** 使用相同的选区分支规则，只是改为 **`removeAttribute`**。若要 **一次性去掉当前选区内插槽上的多种属性**，可使用 **`Commander.cleanAttributes`**：第一个参数写 **要保留的属性实例数组**，或 **`(attribute) => boolean`**（返回 **`true`** 表示 **保留**）；**不写该参数** 时等价于传入 **空数组**，**当前选区内所有属性都会被清掉**。

## 工具条：`Query.queryAttribute`

与 [文字样式](./text-styles) 里 **`queryFormat`** 类似，工具条一般在 **`editor.render` 完成以后** 绑定：**`editor.get(Commander)`** 写入，**`editor.get(Query)`** 的 **`queryAttribute(attribute)`** 读取当前选区下该属性是否生效及 **`value`**。选区变化时在 **`editor.get(Selection).onChange`** 里再同步一次按钮状态即可。

**`QueryStateType.Enabled`** 且 **`value`** 为当前对齐字符串时，可给对应按钮打上 **`data-active`**（样式放在 **`style.css`**）。下面沙箱可改源码并切到「预览」试 **左 / 中 / 右对齐** 与 **清除**。

<TextbusPlayground preset="block-styles" />

独立工程里若把工具条写在 **`index.html`**、在 **`App.tsx`** 里 **`render().then`** 再 **`addEventListener`**，写法等价。更多 **`Commander` / `Query`** 组合见 [状态查询与基础操作](./operations-and-query)。

## 与组件结构配合时要注意什么

- **属性写在承载插槽的外壳上**：段落视图里常见是 **`adapter.slotRender(slot, children => createVNode('p', …))`** 上的那个 **`p`**；**`text-align`** 需要 **`p` 在常规文档流下占据一行宽度**，否则窄 **`span`** 上看不出对齐变化。
- **同一插槽** 可以同时带有 **多个格式区间**（加粗、字号等）和 **多种属性**（若业务允许）；渲染时格式树与属性各自生效。
- **列表、表格单元格** 等组件若在各自插槽上设置对齐，行为与段落一致；跨多块 **批量选中** 时 **`applyAttribute`** 会按上文规则写入多块——工具条上用 **`queryAttribute`** 汇总状态时，若多块取值不一致，查询结果可能落在 **`Normal`** 或仅反映其中一部分（以 **`Query`** 合并规则为准），产品侧可做「混合状态」样式。

## 可选字段详解 {#optional-attribute-fields}

下列两项可按需在 **`Attribute`** 配置对象里补充；细则见本章 **[可选字段详解](#optional-attribute-fields)**。

### `onlySelf`

**默认 `false`。** 对某一 **`Slot`** 调用 **`setAttribute`** 时，若 **`onlySelf` 为 `false`**，内核会在设置本槽之后，**递归地对本槽内嵌套块级子组件的各个子插槽** 再次 **`setAttribute`**，使嵌套结构在数据上也带上同一属性（常见用于希望 **标题里的强调块** 等与外层 **对齐一致**）。

**`onlySelf: true`** 时 **只修改当前这一槽**，不再自动向下级插槽复制。

### `checkHost`

可选；**不写则不做额外校验**。若提供 **`checkHost(host, value)`**，会在 **写入前** 调用：**`host`** 为当前 **`Slot`**；返回 **`false`** 则 **本次不应用**（命令侧相当于静默不收）。可用来限制 **某种属性只允许出现在特定 schema 的槽里**，或对 **`value`** 做合法性校验。

```ts
import { ContentType } from '@textbus/core'

checkHost(host, value) {
  return host.schema.includes(ContentType.Text)
}
```

## 常见问题

- **点了按钮没反应**：确认 **`attributes`** 已注册、**`name`** 与保存数据一致；选区是否落在 **可编辑文档流**（而不是仅选中整块组件外壳）。
- **对齐看不出效果**：检查视图中外壳是否是 **块级且宽度撑满**；子元素 **`float`** / **`flex`** 等布局可能改变视觉对齐。
- **只想清掉对齐**：对同一 **`Attribute`** 调用 **`unApplyAttribute`**；多种属性要批量清理时用 **`cleanAttributes`**。
- **子块没有跟着变**：若期望 **不级联**，把该 **`Attribute`** 设为 **`onlySelf: true`**；若期望 **级联** 却未生效，检查子块是否来自 **另一文档片段** 或 **`checkHost`** 拒绝了写入。

## 接下来

- **选区**：[选区](./selection)  
- [状态查询与基础操作](./operations-and-query)  
- **文字样式（格式）**：[文字样式](./text-styles)  
- **组件示例**：[组件基础](./component-basics)  
- **名词对照**：[核心概念](./concepts)
