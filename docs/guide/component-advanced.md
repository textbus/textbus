# 组件高级

本篇说明 **`Component`** 上的一组 **可选** 扩展：**`getSlots()`**、**`separate`**、**`removeSlot`**、**`deleteAsWhole`**，以及类静态 **`zenCoding`**。它们与 **`Commander`**（如 **`delete`**、**`paste`**、**`transform`**）、**`Selection`** 及事件钩子共同约束「多插槽块」在编辑时的行为。

前置阅读：[组件基础](./component-basics)、[组件事件与生命周期](./component-events-and-lifecycle)、[状态查询与基础操作](./operations-and-query)、[快捷键和语法糖](./shortcuts-and-grammar)。

## `getSlots(): Slot[]`

**作用**：列出当前组件实例在 **文档模型** 上的 **所有子 `Slot`**，顺序必须与 **视图里从上到下、从前到后的渲染顺序** 一致。

**返回值**：**`Slot[]`**。组件实例上的 **`slots`** 访问器 **内部就是调用 `getSlots()`**；在 **选区计算**、**`Commander.delete`** 在块边界回溯、**粘贴** 或 **`transform`** 需要拆开多槽结构时，内核都会按 **`slots`** 暴露的顺序读取子槽。

**约定**：若你实现 **`removeSlot`** 且可能返回 **`true`**，或下文 **`removeSlot`** / **`separate`** 会让内核对 **`slots` 数组** 做 **`splice`**，**`getSlots()` 应长期返回同一数组引用**（例如 **`state` 里持有一个 `Slot[]`，`getSlots` 直接返回它**），否则 **`splice`** 只会作用在临时数组上，**`state` 与内核所见顺序会脱节**。

```ts
import { Component, ContentType, Slot } from '@textbus/core'

type RowState = { cells: Slot[] }

abstract class RowLike extends Component<RowState> {
  override getSlots(): Slot[] {
    return this.state.cells
  }
}
```

## `separate(start?, end?): Component`

**作用**：从 **当前组件** 上切出一段 **连续的子 `Slot` 区间**，生成 **一块新的、同类的 `Component` 实例**；切分后原实例不再包含这段 **`Slot`**（由你在实现里搬移 **`state`** / 引用）。

**参数**（均为 **`Slot` 引用**，不是下标数字）：

- **`start`**：区间 **第一个**要被拆走的子 **`Slot`**（含）。
- **`end`**：区间 **最后一个**要被拆走的子 **`Slot`**（含）。省略时语义以当前 **`Commander`** 调用处为准（常见为与 **`start` 同槽或单槽拆分**）。

**返回值**：新的 **`Component`** 实例，类型与 **`this` 相同**；内核会把该实例 **`insertAfter`** 到原组件之后。**`paste`** 与 **`transform`** 在需要把尾部槽提成兄弟块时都会用到这一步（与上文 **何时会调用** 所列一致）。

**何时会调用**：

- **`paste`**：当粘贴片段无法直接 **`insert`** 进当前选区时，若父组件实现了 **`separate`**，会取 **当前选区所在槽的下一个槽 `nextSlot`**，调用 **`parentComponent.separate(nextSlot)`**，把尾部结构拆成新块再继续插入。
- **`transform`**：当多槽父组件需要把 **尾部若干子槽** 提成兄弟节点时，会对 **`parentComponent.slots`** 做区间 **`splice`**，再 **`separate(deletedSlots[0], deletedSlots[deletedSlots.length - 1])`**，并把返回的组件 **`insertAfter`**。

未实现 **`separate`** 时，上述路径更容易退化为 **只插入一部分**、**结构残留不符合预期** 等；多列表、表格行等你需要 **「从中间/尾部再长一块同级」** 时，应实现并与 **`getSlots()`** 顺序对齐。

```ts
import { Component, ContentType, Slot } from '@textbus/core'

type GridState = { rows: Slot[] }

declare class GridRow extends Component<GridState> {
  static componentName = 'GridRow'
  static type = ContentType.BlockComponent
}

// 示意：从某行切出从第 2 个单元格起到末尾的 Slot，生成新行组件
function exampleSeparate(row: GridRow, start: Slot, end: Slot) {
  const idx = row.state.rows.indexOf(start)
  const endIdx = row.state.rows.indexOf(end)
  const moved = row.state.rows.splice(idx, endIdx - idx + 1)
  return new GridRow({ rows: moved })
}
```

（**`GridRow`**、**`state` 形状**仅为占位；真实项目里须与 **`fromJSON`、视图、`schema`** 一致。）

## `removeSlot(slot): boolean`

**作用**：当 **`Commander.delete`** 在 **折叠选区** 下从某个 **非首子槽** 往回删、需要 **删掉整块子槽** 时，内核会先问父组件：**`parentComponent.removeSlot(slot)`**。

**参数**：**`slot`** —— 即将从 **「父组件子槽列表」** 中移除的那一个 **`Slot`** 引用。

**返回值**：

- **`true`**：**你已自行完成删除**（更新 **`state`**、断开其它引用等）。内核随后会对 **`parentComponent.slots`（即 `getSlots()` 的返回值）执行 `splice`，从数组里去掉该槽对应的项**。
- **`false`** 或未实现：内核 **不会**替你改 **`state`**；删除语义退回默认（光标仍可能落在原 **`Slot`** 上）。

因此：**返回 `true` 时，必须与 `getSlots()` 所暴露数组一致地更新模型**；否则会出现「内核 **`splice`** 了数组，但 **`state` 里仍指向旧 `Slot`**」之类不一致。

```ts
import { Component, ContentType, Slot } from '@textbus/core'

type RowState = { cells: Slot[] }

class TableRow extends Component<RowState> {
  static componentName = 'TableRow'
  static type = ContentType.BlockComponent

  getSlots(): Slot[] {
    return this.state.cells
  }

  removeSlot(slot: Slot): boolean {
    const i = this.state.cells.indexOf(slot)
    if (i <= 0) {
      return false
    }
    this.state.cells.splice(i, 1)
    return true
  }
}
```

## `deleteAsWhole?: boolean`

**作用**：实例上的 **可选布尔字段**（不是方法）。当 **`Commander.delete`** 在 **折叠选区** 下，光标一侧相邻内容是 **`Component`** 时：

- 若该组件 **`type === BlockComponent`**，或 **`deleteAsWhole === true`**：本次删除会 **整颗 `removeComponent` 掉该块**，光标 **不会**先进入块内部。
- 否则：删除会继续按 **「进入子内容」** 的默认规则走。

**`false` 或不写**：行内块、需要光标钻进内部的块级结构，保持默认即可。

```ts
import { Component, ContentType, Slot } from '@textbus/core'

class Card extends Component<{ body: Slot }> {
  static componentName = 'Card'
  static type = ContentType.BlockComponent

  constructor(init: { body: Slot }) {
    super(init)
    this.deleteAsWhole = true
  }
}
```

## 静态 `zenCoding`

写在 **组件类** 上的 **`static zenCoding`**，与 **`TextbusConfig.zenCoding`**、**`keyboard.addZenCodingInterceptor`** 等一起构成 **语法糖**。**`match` / `key` / `createState`** 的语义、触发时机、与父 **`Slot.schema`** 的关系，以及 **Todolist** 可运行示例，集中在 [快捷键和语法糖](./shortcuts-and-grammar) 的 **「组件类静态属性：`zenCoding`」** 一节，本篇不重复展开。

## 与 `Commander`、事件的关系

- **`transform`**、**`paste`**、**`delete`** 会按选区与公共祖先，调用 **`separate` / `removeSlot` / `deleteAsWhole`** 等扩展点；命令参数与失败回退见 [状态查询与基础操作](./operations-and-query)。
- **`onPaste`**、**`onBreak`**、**`onContentDelete`** 等钩子与上述方法作用于 **同一棵文档树**；事件顺序与 **`preventDefault`** 见 [组件事件与生命周期](./component-events-and-lifecycle)。

## 接下来

- [组件基础](./component-basics)  
- [插槽](./slot)  
- [组件事件与生命周期](./component-events-and-lifecycle)  
- [快捷键和语法糖](./shortcuts-and-grammar)  
- [状态查询与基础操作](./operations-and-query)  
- [核心概念](./concepts)  
- [Viewfly 适配器](./adapter-viewfly)、[Vue 适配器](./adapter-vue)、[React 适配器](./adapter-react)  
- [模块与扩展（进阶）](./editor-and-modules)
