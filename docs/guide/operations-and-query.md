# 基础操作与状态查询

本篇说明如何通过 **`Commander`** 修改文档，以及如何用 **`Query`** 读出「当前选区下格式 / 属性是否生效」，便于做工具栏高亮、禁用按钮等。假定你已具备 [快速开始](./getting-started)，并已注册 **`Formatter`** / **`Attribute`**（见 [文字样式](./text-styles)、[块级样式](./block-styles)）。

## 取得 `Commander` 与 `Query`

**`Textbus`** 实例即内核的依赖注入容器：编辑器 **`render` 就绪**后，可用 **`editor.get(Commander)`**、**`editor.get(Query)`**（类型均来自 **`@textbus/core`**）。

```ts
const commander = editor.get(Commander)
const query = editor.get(Query)
```

在组件 **`setup`** 内也可 **`useContext(Commander)`**，与快速开始里段落 **`onBreak`** 的写法一致。

## `Commander`：常用写入操作（示例）

下列是最常用的文档变更入口（完整签名见类型定义）：

| 方法 | 用途 |
|------|------|
| **`applyFormat(formatter, value)`** | 对当前选区应用文字格式 |
| **`unApplyFormat(formatter)`** | 清除该格式 |
| **`applyAttribute(attribute, value)`** | 对当前选区涉及插槽应用块级属性 |
| **`insert(content)`** / **`delete`** 等 | 插入字符、删除内容（多与快捷键绑定） |

工具栏按钮通常在 **`render().then`** 里绑定 DOM 事件后调用 **`Commander`**。

## `Query`：格式与属性是否生效

**`Query`** 根据 **当前 `Selection`** 判断某一 **`Formatter`** 或 **`Attribute`** 的状态，返回 **`QueryState`**：**`state`** 为 **`Enabled` / `Disabled` / `Normal`**，生效时常带有 **`value`**。

典型用法：

- **`query.queryFormat(boldFormatter)`**：当前选区是否加粗、值是否为 **`true`**。
- **`query.queryAttribute(textAlignAttribute)`**：当前插槽对齐属性取值。

工具栏可根据 **`QueryState`** 切换按钮 **`active`** 样式或禁用「冲突」操作。

## 与选区的关系

**`Commander`** 与 **`Query`** 都依赖 **`Selection`** 的当前锚点；折叠选区与拖选范围行为不同，详见 [选区](./selection)。

## 接下来

- **选区细节**：[选区](./selection)  
- **文字 / 块级样式**：[文字样式](./text-styles)、[块级样式](./block-styles)  
- **内核扩展**：[模块与扩展（进阶）](./editor-and-modules)  
- **术语对照**：[核心概念](./concepts)
