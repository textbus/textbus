# 历史记录

本篇说明 **`History`** 与 **撤销 / 重做** 在装配与配置上的入口（不涉及内核调度实现细节）。

**`History`** 由 **`Textbus`** 装配时注入；**`TextbusConfig`** 提供 **`historyStackSize`** 限制栈深度。文档树上的变更在 **`History`** 启用时一般由内核记入栈；具体撤销 / 重做 API 以 **`History`** 类型定义为准。

只读模式 **`readonly: true`** 下通常会限制写入与历史行为。

## 接下来

- **快捷键与语法糖**：[快捷键和语法糖](./shortcuts-and-grammar)  
- **组件钩子**：[组件事件与生命周期](./component-events-and-lifecycle)  
- **选区与命令**：[选区](./selection)、[状态查询与基础操作](./operations-and-query)  
- **浏览器层输入**：[浏览器平台层](./platform-browser)
