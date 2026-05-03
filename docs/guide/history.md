# 历史记录

本篇说明 **`History`** 与 **撤销 / 重做** 在装配与配置上的入口（不涉及内核调度实现细节）。

**`History`** 由 **`Textbus`** 装配时注入；**`TextbusConfig`** 提供 **`historyStackSize`** 限制栈深度。用户在编辑器内的插入、删除、格式变更等经 **`Commander`** 合法路径生效后，一般由内核记入历史；具体撤销 / 重做 API 以 **`History`** 类型定义为准。

只读模式 **`readonly: true`** 下通常会限制写入与历史行为。

## 接下来

- **快捷键与语法糖**：[快捷键和语法糖](./shortcuts-and-grammar)  
- **命令与选区**：[基础操作与状态查询](./operations-and-query)、[选区](./selection)  
- **浏览器层输入**：[浏览器平台层](./platform-browser)
