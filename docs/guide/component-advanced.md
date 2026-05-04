# 组件高级

本篇面向已在 [组件基础](./component-basics) 里写过 **`state`**、**`getSlots()`**、**`setup`** 的读者，补充 **`Component`** 上一组 **可选** 能力：**多块结构如何声明**、**如何从一块里拆出同级新块**、**删除插槽与整块删除**、**静态 `zenCoding`（语法糖前缀）** 等与 **`Commander`**（如 **`transform`**、**`paste`**）共用的约定。钩子总览仍见 [组件事件与生命周期](./component-events-and-lifecycle)。

---

## `getSlots()` 与顺序

子插槽通过 **`getSlots()`** 暴露给内核时，须 **按文档中的渲染顺序** 排列（从前到后、从上到下与你的产品一致）。**选区遍历**、**范围计算**、**批量改结构** 都会依赖这一顺序；顺序与视图不一致时，容易出现光标乱跳、转换只作用一半等问题。

---

## `separate`

可选实现 **`separate(start?, end?)`**：**从当前组件实例拆出一个新的同类组件**，通常对应「尾部若干子 **`Slot`** 提成旁边一块兄弟节点」。**粘贴**、**`transform`** 等命令在遇到 **多插槽父组件** 时，会借助 **`separate`** 决定能不能干净地切开结构；未实现时，同类操作更容易退化成 **分段插入** 或形态碎片化。

拆分语义由业务定义：若有参数，起止子 **`Slot`** 应对应交给新实例的那一段；返回值为新的同类 **`Component`** 实例。边界以当前工程行为与测试为准。

---

## `removeSlot`

可选实现 **`removeSlot(slot)`**：当内核按默认路径尝试删除某个子 **`Slot`** 时调用。返回 **`true`** 表示删除已由组件自行完成（含 **`state`**、其它插槽归属等）；返回 **`false`** 或未实现则走默认处理。适用于表格、复杂列表等需要自定义删格语义的场景。

---

## `deleteAsWhole`

可选字段 **`deleteAsWhole`**：**折叠光标** 下用退格 / Delete 划过块边界时，是否 **把整个组件当成一格删掉**，而不是把光标接进组件内部。块级卡片、独立控件常用 **`true`**；希望光标能钻进内部的块则不设或 **`false`**。

---

## 静态 `zenCoding`（语法糖）

用户在正文插槽里输入 **一行文本前缀**，再按 **`key`** 约定的键时，可把 **当前块** 换成 **本组件的一个新实例**（由 **`createState`** 给出 **`state`**）。总开关 **`TextbusConfig.zenCoding`**、运行时 **`keyboard.addZenCodingInterceptor`** 及 **`Keyboard`** 行为见 [快捷键和语法糖](./shortcuts-and-grammar)。

### 声明位置

写在 **组件类**（**`ComponentConstructor`**）上的 **`static zenCoding`**：

- 赋值为 **单个** **`ZenCodingGrammarInterceptor<YourState>`**，或 **数组**（多条规则依次注册）。
- 该类必须出现在 **`new Textbus({ components: [...] })`**（或模块合并进来的列表）里，**`Keyboard`** 才能在启动时读到配置。

### 三个字段怎么配合

- **`match`**：看 **当前插槽里第一段内容** 是否是你要的前缀（正则或函数）；插槽内已是多块混合内容时往往不满足语法糖假设，需自行试是否符合你的产品形态。
- **`key`**：空格、回车等 **触发替换** 的那颗键；也可写成数组、正则或自定义 **`(key, agent) => boolean`**。
- **`createState(content, textbus)`**：返回 **`new YourComponent(...)`** 所需的 **`state`**。 **`content`** 为触发前插槽内已匹配的文本；需要 **`Registry`**、**`Slot`** 等时用第二个参数 **`textbus`** 取用 **`textbus.get(Registry)`** 等 API。

### 与父插槽 `schema` 的关系

替换后的新实例 **`type`**（块级 / 行内等）必须 **能被当前父 **`Slot`** 接受**。父插槽 **`schema`** 不认你的 **`Component.type`** 时，语法糖会失败或无法插入。设计前缀与 **`createState`** 时要与根文档、段落等 **谁在容纳这一块** 对齐。

### 示例（Todolist）

与 [组件基础](./component-basics) 相同的 **`TodolistComponent`**，在段落内 **`-` + 空格** 触发整块替换为待办的完整说明、**`match` / `key` 时机** 与 **可运行沙箱**（**`zen-coding-todolist`** 预设）见 [快捷键和语法糖](./shortcuts-and-grammar) 中的 **「组件类静态属性：`zenCoding`」**。

多条规则仍使用 **`static zenCoding = [ { ... }, { ... } ]`**。

---

## 与命令、文档的关系

- **`transform`**、**`paste`** 等会读写多插槽结构；规则见 [状态查询与基础操作](./operations-and-query) 中的 **`transform`**，并与本篇 **`separate`**、**`getSlots()`** 约定一并校验。
- **事件钩子**（**`onPaste`**、**`onBreak`** 等）与上述可选方法作用于同一文档树；协作方式见 [组件事件与生命周期](./component-events-and-lifecycle)。

---

## 接下来

- [组件基础](./component-basics)  
- [组件事件与生命周期](./component-events-and-lifecycle)  
- [快捷键和语法糖](./shortcuts-and-grammar)  
- [状态查询与基础操作](./operations-and-query)  
- [核心概念](./concepts)  
- [模块与扩展（进阶）](./editor-and-modules)
