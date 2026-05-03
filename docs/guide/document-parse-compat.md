# 文档解析与兼容处理

从 **网页 HTML**、**粘贴板** 或 **导出 DOM** 回到 Textbus 文档模型时，依赖 **`@textbus/platform-browser`** 提供的 **`Parser`** 与若干 **Loader**。本篇说明职责划分与配置入口（具体匹配规则由业务 Loader 实现）。

## `Parser` 做什么

**`Parser`**（随 **`BrowserModule`** 注入）把 HTML 字符串或 DOM 子树解析成 **`Component`** 或 **`Slot`**：内部会结合 **`ComponentLoader`**、**`FormatLoader`**、**`AttributeLoader`**，把认识的标签与样式映射到已注册的 **`componentName`**、**`Formatter.name`**、**`Attribute.name`**。

未匹配到的节点会被丢弃或降级为纯文本，以避免脏数据进入模型。

## `BrowserModule` 与 Loader 列表

**`ViewOptions`**（传入 **`BrowserModule` 构造器**）支持：

- **`componentLoaders`**：**`ComponentLoader[]`**，按 **`match` / `read`** 识别自定义块（如表格、卡片）。
- **`formatLoaders`**：**`FormatLoader[]`**，把 **`<strong>`**、**`<span style="...">`** 等映射到 **`Formatter`**。
- **`attributeLoaders`**：**`AttributeLoader[]`**，映射容器上的对齐、缩进等 **属性**。

**`ComponentLoader.read`** 可使用注入的 **`SlotParser`**，把某个 DOM 子树填进 **`Slot`**。

## `SlotParser`

**`SlotParser`** 负责「把一个 DOM 片段还原成 **`Slot`**」：指定 **`schema`**、根节点与可选内容宿主节点，返回填充后的 **`Slot`**。组件 **`fromJSON`** 与 Loader **`read`** 都会用到同类逻辑。

## 实践建议

- **先注册再解析**：只有 **`new Textbus`** 里出现过的 **`components` / `formatters` / `attributes`**，解析阶段才能还原。
- **粘贴路径**：浏览器粘贴最终会走平台层与 **`Parser`**；要为 Office / 网页定制清洗规则，在 Loader 的 **`match` / `read`** 中收窄或扩展。
- **导出 HTML**：常用 **`additionalAdapters`** 或单独 **`Adapter`** 在内存中渲染再序列化；与解析互为逆过程时需保持 **`data-component`** 等约定一致（若有）。

## 接下来

- **浏览器集成**：[浏览器平台层](./platform-browser)  
- **格式与属性注册**：[文字样式](./text-styles)、[块级样式](./block-styles)  
- **模块合并**：[模块与扩展（进阶）](./editor-and-modules)
