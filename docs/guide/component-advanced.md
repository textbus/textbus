# 组件高级

本篇面向已在 [组件基础](./component-basics) 里写过 **`state`**、**`getSlots()`**、**`setup`** 的读者，补充 **`Component`** 上一组 **可选** 能力：**多块结构如何声明**、**如何从一块里拆出同级新块**、**删除插槽与整块删除** 等与 **`Commander`**（如 **`transform`**、**`paste`**）共用的约定。钩子总览仍见 [组件事件与生命周期](./component-events-and-lifecycle)。

---

## `getSlots()` 与顺序

子插槽通过 **`getSlots()`** 暴露给内核时，须 **按文档中的渲染顺序** 排列（从前到后、从上到下与你的产品一致）。**选区遍历**、**范围计算**、**批量改结构** 都会依赖这一顺序；顺序与视图不一致时，容易出现光标乱跳、转换只作用一半等问题。

---

## `separate`

可选实现 **`separate(start?, end?)`**：**从当前组件实例拆出一个新的同类组件**，通常对应「尾部若干子 **`Slot`** 提成旁边一块兄弟节点」。**粘贴**、**`transform`** 等命令在遇到 **多插槽父组件** 时，会借助 **`separate`** 决定能不能干净地切开结构；未实现时，同类操作更容易退化成 **分段插入** 或形态碎片化。

拆分语义由业务定义：若有参数，起止子 **`Slot`** 应对应交给新实例的那一段；返回值为新的同类 **`Component`** 实例。边界以当前工程行为与测试为准。

---

## `removeSlot`

可选实现 **`removeSlot(slot)`**：当内核按默认路径尝试删除某个子 **`Slot`** 时调用。返回 **`true`** 表示删除已由组件自行完成（含 **`state`**、其它槽归属等）；返回 **`false`** 或未实现则走默认处理。适用于表格、复杂列表等需要自定义删格语义的场景。

---

## `deleteAsWhole`

可选字段 **`deleteAsWhole`**：**折叠光标** 下用退格 / Delete 划过块边界时，是否 **把整个组件当成一格删掉**，而不是把光标接进组件内部。块级卡片、独立控件常用 **`true`**；希望光标能钻进内部的块则不设或 **`false`**。

---

## 与命令、文档的关系

- **`transform`**、**`paste`** 等会读写多槽结构；规则见 [状态查询与基础操作](./operations-and-query) 中的 **`transform`**，并与本篇 **`separate`**、**`getSlots()`** 约定一并校验。
- **事件钩子**（**`onPaste`**、**`onBreak`** 等）与上述可选方法作用于同一文档树；协作方式见 [组件事件与生命周期](./component-events-and-lifecycle)。

---

## 接下来

- [组件基础](./component-basics)  
- [组件事件与生命周期](./component-events-and-lifecycle)  
- [状态查询与基础操作](./operations-and-query)  
- [核心概念](./concepts)  
- [模块与扩展（进阶）](./editor-and-modules)
