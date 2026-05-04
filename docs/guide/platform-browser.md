# 浏览器模块

**`@textbus/platform-browser`** 负责把 **`@textbus/core`** 接到浏览器：**可编辑区域**、**键盘与合成输入**、**文档选区与页面选区的对齐**、**粘贴与 HTML 解析**，以及协作场景下常见的 **远程选区 / 虚拟光标** 等。你通过 **`@textbus/adapter-*`** 提供 **`DomAdapter`**（例如 **`ViewflyAdapter`** 继承 **`DomAdapter`**）；**`BrowserModule`** 则把 **`Adapter`**、**`NativeSelectionBridge`**、**`Input`** 等浏览器侧能力接到当前编辑器实例上。

完整接线见 [快速开始](./getting-started) 与各 [视图适配器](./adapter-viewfly)（[Vue](./adapter-vue)、[React](./adapter-react)）。本篇说明 **`BrowserModule`** 的配置项、与内核的分工及常见注意点。


## 安装

```bash
npm install @textbus/platform-browser
```

另需 **`@textbus/core`**、某一 **`@textbus/adapter-*`**，以及 **`reflect-metadata`**（须在任意 **`@textbus/*`** 导入之前执行一次）。


## `BrowserModule` 与 `ViewOptions`

加入 **`BrowserModule`** 后，编辑器在 **`render`** 时会 **把文档视图挂到你提供的挂载点**，并 **等待输入层就绪**；可选地在启动结束后 **自动聚焦**；在 **`destroy`** 时 **释放输入、选区桥接与协作光标** 等浏览器侧资源。

**`ViewOptions`**（构造 **`BrowserModule`** 时的参数）常用字段：

| 字段 | 作用 |
|------|------|
| **`adapter`** | 由 **`@textbus/adapter-*`** 提供的 **`DomAdapter`**；其中的 **`host`** 为视图根 DOM。 |
| **`renderTo()`** | 返回 **外层挂载点**（**`HTMLElement`**）；编辑器工作台会挂到该节点下。 |
| **`autoFocus`** | 可选；为 **`true`** 时，在启动完成后自动 **`textbus.focus()`**。 |
| **`minHeight`** | 可选；控制编辑区 **最小高度**（作用于视图根节点样式）。 |
| **`useContentEditable`** | 可选；为 **`true`** 时走 **`contenteditable`** 输入路径（**`NativeInput`**），否则为默认的 **`MagicInput`**。 |
| **`componentLoaders` / `formatLoaders` / `attributeLoaders`** | 可选；扩展 **HTML → 文档** 的解析策略，见 [文档解析与兼容处理](./document-parse-compat)。 |

与 [协作编辑](./collaborate) 同时使用时，**`MessageBus`** 载荷、**远程光标** 等展示数据需在 **各端约定一致**。


## 与 `@textbus/core` 的分工

| 层次 | 职责 |
|------|------|
| **`@textbus/core`** | 组件 / 插槽 / 格式 / 属性、**`Registry`**、**`Selection`**、**`Commander`**、**`Scheduler`**、**`History`** 等与 DOM 无关的编辑内核。 |
| **`@textbus/platform-browser`** | **输入**、**选区桥接**、**解析与粘贴管线**、**焦点相关事件**、**协作光标** 等浏览器侧能力。 |
| **`@textbus/adapter-*`** | 把 **`Component`** 树画到 **Viewfly、Vue 或 React**，并提供符合 **`DomAdapter`** 约定的 **`Adapter`**。 |

没有可用的 **`Adapter`** 与 **`NativeSelectionBridge`** 时，**`Textbus`** 无法完成 **`render`**；使用 **`BrowserModule`** 时，会用 **`SelectionBridge`** 与 **`config.adapter`** 满足上述能力。


## 输入：`MagicInput` 与 `NativeInput`

默认使用 **`MagicInput`**（非 **`contenteditable`** 主路径）。**`useContentEditable: true`** 时改用 **`NativeInput`**。两种模式下的 **输入手感、IME、与选区联动** 会有差异，可按产品需求切换并做回归测试。


## 选区与 `NativeSelectionBridge`

**`SelectionBridge`** 实现 **`NativeSelectionBridge`**：在允许使用 **原生选区** 时，**文档选区** 与 **页面上的选区** 会保持一致。选区 API 见 [选区](./selection)。


## `Parser` 与加载器

**`Parser`** 与各类 **Loader** 负责 **HTML、粘贴** 等入口如何变成文档树，详见 [文档解析与兼容处理](./document-parse-compat)。在 **`ViewOptions`** 里配置的加载器会与默认策略 **一起参与** 解析。


## 从 HTML / 字面量生成文档

在 **`Textbus` 已创建且本模块已加入配置** 之后，可通过 **`BrowserModule` 实例** 调用：

- **`readDocumentByHTML(html, rootComponentLoader, textbus)`**：把 **HTML 字符串** 解析成 **根 `Component` 实例**（由 **`rootComponentLoader`** 决定根类型与根内容）。
- **`readDocumentByComponentLiteral(data, rootComponent, textbus)`**：把 **JSON 字面量** 与 **根组件类** 还原成 **根 `Component` 实例**。

适用于导入外部 HTML、服务端下发 JSON 等场景。


## `CollaborateCursor` 与协作展示

启用 **`BrowserModule`** 后，可使用 **`CollaborateCursor`** 在编辑区域上 **绘制其他用户的选区或虚拟光标**。与 **`MessageBus`** 的数据约定见 [协作编辑 · `MessageBus`](./collaborate#message-bus)。


## 与 DOM / 自动化对接

若要在 **E2E 测试或外层布局** 中定位编辑器 DOM，可使用 **`@textbus/platform-browser`** 导出的 **具名字段常量**（见包内类型与导出列表）。


## 常见问题

- **`renderTo` 返回的不是 `HTMLElement`**：**`render`** 会失败；请返回真实 DOM 节点。
- **无输入或选区异常**：确认 **`render`** 已完成，并检查是否关闭了 **原生选区同步**（见 [选区](./selection)）。
- **粘贴丢格式**：检查 **解析与 Loader** 是否覆盖你的 **`Formatter` / `Attribute`** 名称，见 [文档解析与兼容处理](./document-parse-compat)。


## 接下来

- 模块合并与 **`providers`**：[模块与扩展](./editor-and-modules)
- 解析与粘贴：[文档解析与兼容处理](./document-parse-compat)