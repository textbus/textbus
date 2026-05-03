# 选区

**选区（`Selection`）** 描述光标位置或拖选的文档范围，与 **`Commander`**、**`Query`**、输入法协作紧密相关。本篇面向使用角度：如何理解 **`Selection`** 暴露的常见能力（具体 API 以 **`@textbus/core`** 类型为准）。

## 从容器获取

编辑器就绪后：

```ts
const selection = editor.get(Selection)
```

在组件 **`setup`** 里常用 **`useContext(Selection)`**，与快速开始里 **`setPosition`** 一致。

## 常见概念

- **折叠选区**：光标落在一个偏移上，没有长度；此时 **`applyFormat`** 等行为会影响「后续输入是否继承格式」等规则。
- **范围选区**：跨越多字符或多块；命令常按 **分段插槽** 逐段处理。
- **`commonAncestorSlot` / `commonAncestorComponent`**：当前选区涉及的公共祖先，适合做上下文菜单、工具条状态。

## 与命令的配合

大多数 **`Commander`** 方法会先读 **`Selection`** 再修改 **`Slot`** 或插入 **`Component`**；自定义快捷键里也可先 **`selection.toPrevious()`** 等导航再执行命令。

## 接下来

- **命令与查询**：[基础操作与状态查询](./operations-and-query)  
- **浏览器桥接与 DOM**：[浏览器平台层](./platform-browser)  
- **术语对照**：[核心概念](./concepts)
