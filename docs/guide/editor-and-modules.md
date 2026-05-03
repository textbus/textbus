# 模块与扩展（进阶）

给编辑器加 **列表块**、**格式**、**对齐属性** 等可见交互时，请参考 **入门**中的 [组件基础](./component-basics)、[文字样式](./text-styles)、[块级样式](./block-styles)；本篇面向这些情况：**要写 Plugin**、**替换内核默认绑定（`providers`）**、**理解启动与销毁顺序**，或 **排查同名注册到底生效了哪一份**。

前置阅读：[核心概念](./concepts)、[组件基础](./component-basics)、[文字样式](./text-styles)、[块级样式](./block-styles)、[浏览器平台层](./platform-browser)。

## `Textbus` 配置里常见字段

**`Textbus`** 构造时会把 **`TextbusConfig`**（本身也是一种 **`Module`**）与 **`imports`** 合并后注入容器；**`render`** 才真正挂载视图并启动调度与历史。

| 字段 | 用途（极简） |
|------|----------------|
| `components` | 文档数据里会出现的 **组件类** |
| `formatters` / `attributes` | 实例内可用的 **格式** / **属性**；可用 **`(textbus) => 实例`** 延迟创建 |
| `imports` | 多个 **`Module`** 合并进同一编辑器 |
| `providers` | **依赖提供者**，可覆盖 **`Adapter`**、**`NativeSelectionBridge`** 等（一般由 **`BrowserModule`** 提供） |
| `plugins` | 在主视图 **`render` 完成之后** 执行 **`setup`** |
| `readonly`、`historyStackSize`、`zenCoding`、`additionalAdapters` | 全局开关与附加渲染 |

缺少可用的 **`Adapter`** 与 **`NativeSelectionBridge`** 时无法 **`render`**；浏览器环境请配合 **`BrowserModule`**。

## `Module` 钩子（何时执行）

- **`beforeEach`**：**构造** **`Textbus`** 时，按 **`imports`** 顺序、`render` 之前。
- **`setup`**：**`render`** 内 **`await`**；可返回 **`destroy` 回调**。
- **`onAfterStartup`**：调度器 **`run`**、主 **`Adapter.render`** 完成之后（例如 **`autoFocus`**）。
- **`onDestroy`**：**`textbus.destroy()`** 时。

多个 **`imports`** 的 **`setup`** 会 **`Promise.all`**，彼此之间 **没有固定的先后顺序**。

## `Plugin` 与 `Module.plugins`

**`Plugin.setup`** 排在 **主视图渲染之后**，适合依赖 DOM / 视图已就绪的集成；**`Module.setup`** 更早，适合做 **`BrowserModule`** 这类「搭台子」的工作。

## `Registry` 与同名覆盖

**`textbus.get(Registry)`** 按 **`componentName`** / 格式名 / 属性名解析字面量并 **`createSlot`** / **`createComponent`**。

合并后的列表 **先出现的条目覆盖后出现者**（内部 **`reverse()` 写入 `Map`**）：**根配置** 优先于 **`imports`**；仅在 import 之间比较时，**数组靠前的模块优先**。要让某实现生效，把它写在 **`new Textbus({ … })` 根字段**，或把对应 **`Module` 放在 `imports` 更前**。

## `providers`

形态与 **`@viewfly/core`** 的 **`Provider`** 一致；自定义项排在默认绑定 **之后**，因而可以 **覆盖** token——前提是你要知道准确的 **`provide`** 符号（多数业务无需手写）。

## 排错摘要

- 仅 **`new Textbus({ components })`** 而无 **`BrowserModule`**：**`render`** 会因缺 **`Adapter`** / **`NativeSelectionBridge`** 失败。
- **页面卸载**：调用 **`destroy()`**，否则输入层与 **`setup` 返回的清理函数** 不会执行。

## 接下来

- 命令与查询：[基础操作与状态查询](./operations-and-query) · [选区](./selection)  
- 浏览器集成：[浏览器平台层](./platform-browser)  
- 包索引：[API 概览](/api/)
