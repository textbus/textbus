# 快捷键和语法糖

本篇说明 **`Keyboard`** 注册快捷键的方式，以及 **Zen Coding 风格语法糖** 在配置与组件上的接入入口（不涉及内核调度实现细节）。

## 快捷键：`Keyboard`

**`Keyboard`** 通过 **`editor.get(Keyboard)`** 取得。使用 **`addShortcut`** 注册：**`keymap`**（键位、修饰键）与 **`action`** 回调；回调内常调用 **`Commander`** 或 **`Selection`**。

内核在 **`Textbus`** 初始化时会注册若干默认快捷键（如 **Enter**、方向键等）；业务扩展追加即可，注意避免与浏览器默认行为冲突时可 **`preventDefault`**（在 **`action` 返回约定**内处理，见类型注释）。

## 语法糖：组件上的 `zenCoding` 与全局开关

**`TextbusConfig`** 有 **`zenCoding?: boolean`**；为 **`true`** 时，**`Keyboard`** 会收集各 **`Component`** 类上的静态 **`zenCoding`** 配置（可为单个对象或数组）。

在组件类上声明 **`static zenCoding: ZenCodingGrammarInterceptor<T>`**：实现 **`match`**、**`createState`**、触发键 **`key`** 等，可在用户输入特定模式（如列表前缀）时 **替换当前段落为新的组件状态**。具体字段见 **`@textbus/core`** 中的 **`ZenCodingGrammarInterceptor`**。

也可运行时 **`keyboard.addZenCodingInterceptor(...)`** 增量注册。

## 接下来

- **历史记录**：[历史记录](./history)  
- **命令与选区**：[基础操作与状态查询](./operations-and-query)、[选区](./selection)  
- **浏览器层输入**：[浏览器平台层](./platform-browser)  
- **模块扩展**：[模块与扩展（进阶）](./editor-and-modules)
