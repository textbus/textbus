# 简介

Textbus 是一个以组件为中心，数据驱动的富文本编辑器开发框架！为了解决传统富文本开发中遇到的各种问题，我们完全自主设计了富文本的组件系统和格式系统，旨在降低富文本的开发成本，帮助你更轻松的扩展出丰富的富文本功能。不管你是富文本开发的老鸟，亦或是前端的新手，你都将会在 Textbus 中感受到非凡的开发体验和扩展能力。

**从 4.0 开始**，Textbus 全面拥抱前端生态，支持 [Viewfly](https://viewfly.org)、Vue、React 直接渲染富文本内容。意味着你可以无任何成本的使用一些开源组件库，更简单的实现富文本中各种的交互能力。

Textbus 还拥有超强的性能，在使用 [Viewfly](https://viewfly.org) 作为渲染层时，我们使用红楼梦作为测试样本，Textbus 可以实现 **5 万个段落无卡顿编辑，这相当于 15 本红楼梦共 1700 万字同时在一个文档内** (<span style="font-size:14px">一本红楼梦大约 3100 个段落，测试电脑：MacBook M1 Pro，32G内存</span>），这在以前是不可想象的。

::: info ❗注意
从 4.0 开始，Textbus 仓库将<strong>不再提供默认的编辑器</strong>，不过我们重新开发了 XNote 富文本编辑器，仓库地址：<a href="https://github.com/textbus/xnote" target="_blanK">https://github.com/textbus/xnote</a>。
:::


若你已准备动手搭建环境，可直接进入 [快速开始](./getting-started)，再按 **入门**分组顺序阅读（从 [组件基础](./component-basics) 到 [文档解析与兼容处理](./document-parse-compat)）。

## 模型驱动的编辑体验

- **行为一致**：输入与输出走同一套数据模型，减轻浏览器差异带来的交互分叉。
- **语法糖与输入规则**：可配置实时转换（例如类 Markdown 的标题触发），也可完全自定义。
- **解析与粘贴**：可定制从网页、Office 等来源解析与清洗内容的策略。
- **协作**：可与 Yjs 等方案对接数据模型（见 [协作编辑](./collaborate)）。
- **选区与命令**：内核抽象选区与命令流，降低手写浏览器选区逻辑的复杂度。

## 包与职责

| 包 | 作用 |
|----|------|
| `@textbus/core` | 组件、插槽、格式、属性等模型，以及选区、命令、历史、调度、注册等内核能力 |
| `@textbus/platform-browser` | 浏览器环境下的平台能力（输入、选区桥接、DOM 等） |
| `@textbus/adapter-viewfly` | 使用 Viewfly 渲染文档视图 |
| `@textbus/adapter-vue` | 使用 Vue 渲染文档视图 |
| `@textbus/adapter-react` | 使用 React 渲染文档视图 |
| `@textbus/collaborate` | 协作相关能力与对接 |
| `@textbus/platform-node` | 适用于 Node 的工具与适配 |
