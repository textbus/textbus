# 组件事件与生命周期

当 **`Commander`** 做 **插入与删除文字、换行、粘贴、应用格式与属性** 等 **文档改动**，或 **`Selection`** **调整选区** 时，内核会向 **`Component`** 派发钩子（如 **`onContentInsert`**、**`onBreak`**）。你在 **`setup()`** 里用 **`@textbus/core`** 导出的 **`onXxx`** 注册监听后，既能 **`preventDefault`** 拦截默认行为，也能只做日志或联动业务。**快捷键**不在本篇，见 [快捷键和语法糖](./shortcuts-and-grammar)。

阅读前建议已读过 [组件基础](./component-basics)、[状态查询与基础操作](./operations-and-query)、[选区](./selection)、[块级样式](./block-styles)。


## 如何注册

在组件类的 **`setup()`** 里 **同步** 调用导入的注册函数，传入回调；不要在 **`await`、`Promise.then`、`setTimeout`** 之后再注册。

```ts
import { Component, onBreak, onContentInsert } from '@textbus/core'

class MyBlock extends Component<MyState> {
  override setup() {
    onContentInsert(ev => {
      // ...
    })
    onBreak(ev => {
      ev.preventDefault()
    })
  }
}
```


## `setup` 何时执行

首次 **`editor.render(root)`** 时，内核先对 **根组件** 调用 **`setup()`**，再递归遍历各 **子插槽** 里已有的 **子组件**，逐个执行 **`setup`**。之后若有新的 **`Component`** 挂到某 **`Slot`** 下并完成挂载，会为该子树再执行一次 **`setup`**。与 **`getSlots()`**、**`separate()`** 等配合见 [组件高级](./component-advanced)。

读各钩子下面的 **`event.target`**：当它是 **`Component`** 时，就是 **当前组件实例**（本 **`setup`**、**`onXxx`** 所在的那块），不会在甲组件里注册却收到乙组件。当它是 **`Slot`** 时，一定是 **当前组件的某一个子插槽**（与 **`getSlots()`** 暴露给内核的那几条 **`Slot`** 同一批），表示本次操作落在该插槽上。

## 插槽内容

### `onContentInsert`

**时机**：**`Commander.insert`** 等 **写入命令** 在真正把内容写入插槽 **之前**。

**参数**：**`event: Event<Slot, InsertEventData>`**。

- **`event.target`**：即将写入的 **`Slot`**。
- **`event.data.index`**：插入起点下标。
- **`event.data.content`**：待插入的字符串或 **`Component`**。
- **`event.data.formats`**：随插入携带的格式列表（**`Formats`**）。

调用 **`event.preventDefault()`** 后，本次插入放弃，相关命令通常返回 **`false`**。根组件、段落组件常用它把手敲字符收成块等，示例见 [组件基础](./component-basics)。

```ts
import { onContentInsert } from '@textbus/core'

onContentInsert(event => {
  const slot = event.target
  const { index, content, formats } = event.data
  // 例如：禁止某种插入时 event.preventDefault()
})
```

### `onContentInserted`

**时机**：内容 **已经** 写入 **`Slot`** 之后。

**参数**：**`event: Event<Slot, InsertEventData>`**，字段含义与 **`onContentInsert`** 相同（描述的是刚完成的那次插入）。

若对 **`onContentInserted`** 调用 **`preventDefault()`**，会影响插入完成后是否把选区收到插入位置附近（与默认 **`insert`** 管线有关）。多用于观测或微调选区。

```ts
import { onContentInserted } from '@textbus/core'

onContentInserted(event => {
  const slot = event.target
  const { index, content } = event.data
  // 插入已落盘；可同步 UI。若不希望默认收选区可 event.preventDefault()
})
```

### `onContentDelete`

**时机**：从插槽里 **删除或搬移** 一段内容 **之前**（例如 **`Commander.delete`** 展开选区后的分段删除）。

**参数**：**`event: Event<Slot, DeleteEventData>`**。

- **`event.target`**：将被切的 **`Slot`**。
- **`event.data.index`**：删除起点。
- **`event.data.count`**：删除长度。
- **`event.data.toEnd`**：删除方向是否与「向文档末尾」一侧一致（与向前 / 向后删有关）。
- **`event.data.actionType`**：**`'delete'`** 表示纯删除；**`'move'`** 表示跨插槽搬移等场景下的切断。

**`preventDefault()`** 会阻止本次删除片段，命令返回 **`false`**。

```ts
import { onContentDelete } from '@textbus/core'

onContentDelete(event => {
  const { index, count, toEnd, actionType } = event.data
  // actionType 为 'delete' | 'move'；不允许删改时 event.preventDefault()
})
```

### `onContentDeleted`

**时机**：对应片段已从 **`Slot`** 里切出之后。

**参数**：**`event: Event<Slot>`**，**`event.data`** 为 **`null`**，仅用 **`event.target`** 指明是哪个 **`Slot`**。

**`preventDefault()`** 在部分删除流程里仍会被检查：若阻止，内核会 **按分支改选区的焦点或锚点**，并让 **`delete`** 返回 **`false`**（用于删完后仍要打断后续默认收尾时）。多数场景只做观测或统计即可。

```ts
import { onContentDeleted } from '@textbus/core'

onContentDeleted(event => {
  const slot = event.target
  // 删后观测；少数流程里也可 event.preventDefault() 打断后续默认收拾
})
```


## 换行

### `onBreak`

**时机**：**`Commander.break()`**。若选区非折叠，会先删选区再派发；折叠时直接派发。

**参数**：**`event: Event<Slot, BreakEventData>`**。

- **`event.target`**：发生换行的 **`Slot`**（即 **`startSlot`**）。
- **`event.data.index`**：换行触发位置下标。

默认未拦截时，内核会向插槽 **`write`** 换行符。自定义列表拆条、待办拆行等常在 **`preventDefault()`** 后自行 **`cut` / `insertAfter`**。示例见 [组件基础](./component-basics)。

```ts
import { onBreak } from '@textbus/core'

onBreak(event => {
  const slot = event.target
  const { index } = event.data
  // 自定义拆条：event.preventDefault() 后用 Commander 自行 cut / insertAfter
})
```


## 粘贴

### `onPaste`

**时机**：**`Commander.paste(pasteSlot, text)`** 在按默认策略把 **`delta`** 写回文档 **之前**。

**参数**：**`event: Event<Slot, PasteEventData>`**。

- **`event.target`**：派发时使用的 **`Slot`**（与选区公共祖先插槽相关）。
- **`event.data.index`**：粘贴插入意向位置下标。
- **`event.data.data`**：结构化剪贴 **`Slot`**（已解析好的片段树）。
- **`event.data.text`**：并行提供的纯文本。

**`preventDefault()`** 后走你自己的粘贴逻辑；否则内核按 **`pasteSlot.toDelta()`** 循环 **`insert`**，并与 **`separate`** 等多插槽行为配合。详见 [状态查询与基础操作](./operations-and-query) **`paste`**。

```ts
import { onPaste } from '@textbus/core'

onPaste(event => {
  const { index, data, text } = event.data
  // 完全自定义粘贴：event.preventDefault()，再用 data（片段树）或 text 自行插入
})
```


## 格式与属性（写入前）

### `onSlotApplyFormat`

**时机**：**`Commander.applyFormat`** 真正把格式写到 **`Slot`** 上 **之前**。

**参数**：**`event: Event<Slot, SlotApplyFormatEventData>`**。

- **`event.target`**：将要接收格式的 **`Slot`**。
- **`event.data.formatter`**：本次 **`Formatter`** 实例。
- **`event.data.value`**：格式值。

**`preventDefault()`** 取消本次应用。

```ts
import { onSlotApplyFormat } from '@textbus/core'

onSlotApplyFormat(event => {
  const { formatter, value } = event.data
  // 校验不通过则 event.preventDefault()
})
```

### `onSlotSetAttribute`

**时机**：**`slot.setAttribute`**、**`Commander.applyAttribute`** 等给插槽挂属性 **之前**。

**参数**：**`event: Event<Slot, SlotSetAttributeEventData>`**。

- **`event.target`**：目标 **`Slot`**。
- **`event.data.attribute`**：**`Attribute`** 实例。
- **`event.data.value`**：属性值。

**`preventDefault()`** 取消本次设置。选区分支见 [块级样式](./block-styles)。

```ts
import { onSlotSetAttribute } from '@textbus/core'

onSlotSetAttribute(event => {
  const { attribute, value } = event.data
  // 不允许写入该属性时 event.preventDefault()
})
```


## 输入法（IME）

### `onCompositionStart`

**时机**：组合输入开始。

**参数**：**`event: Event<Slot, CompositionStartEventData>`**。

- **`event.target`**：**`Slot`**。
- **`event.data.index`**：组合起始下标。

```ts
import { onCompositionStart } from '@textbus/core'

onCompositionStart(event => {
  const slot = event.target
  const { index } = event.data
  // 组合输入从 slot 的 index 处开始
})
```

### `onCompositionUpdate`

**时机**：组合输入过程中内容变化。

**参数**：**`event: Event<Slot, CompositionUpdateEventData>`**。

- **`event.data.index`**：当前位置。
- **`event.data.data`**：本轮 IME 字符串。

```ts
import { onCompositionUpdate } from '@textbus/core'

onCompositionUpdate(event => {
  const { index, data } = event.data
  // index 处 IME 更新为字符串 data
})
```

### `onCompositionEnd`

**时机**：组合输入结束。

**参数**：**`event: Event<Slot>`**，无 **`data`** 载荷（视为 **`null`**），用 **`event.target`** 可知是哪个 **`Slot`**。

```ts
import { onCompositionEnd } from '@textbus/core'

onCompositionEnd(event => {
  const slot = event.target
  // 组合输入在 slot 上结束
})
```


## 选区与范围

### `onGetRanges`

**时机**：选区变化后，内核要向 **`Selection`** 询问「当前应用 **`getRanges()`** 时是否改用自定义多段范围」。

**参数**：**`event: GetRangesEvent<Component>`**。

- **`event.target`**：**当前组件**。
- 在回调里调用 **`event.useRanges([{ slot, startIndex, endIndex }, ...])`** 给出 **`SlotRange[]`**；不写则沿用默认连续范围。表格框选等见 [选区](./selection)。

```ts
import { onGetRanges } from '@textbus/core'

onGetRanges(event => {
  event.useRanges([])
})
```

### `onSelected`

**时机**：选区变为恰好 **整块选中一个组件节点**（拖选或 **`selectComponent`** 等，对应某一个 **`Component`** 实例）。

**参数**：无；签名为 **`() => void`**。

用于高亮块工具栏、启用块级操作等。

```ts
import { onSelected } from '@textbus/core'

onSelected(() => {
  // 当前组件整块被选中
})
```

### `onUnselect`

**时机**：原先整块选中失效，或选区不再只包住这一块组件。

**参数**：无；**`() => void`**。

```ts
import { onUnselect } from '@textbus/core'

onUnselect(() => {
  // 整块选中状态结束
})
```

### `onFocus`

**时机**：起始 **`Slot`** 与结束 **`Slot`** 的 **`parent`** 是同一块 **`Component`**，且这块 **`Component`** 与上一轮不同时，在新 **`parent`** 上触发。折叠光标时，等价于光标所在 **`Slot`** 的 **`parent`**。

**参数**：无；**`() => void`**。

常用于给「当前编辑块」加焦点样式。

```ts
import { onFocus } from '@textbus/core'

onFocus(() => {
  // 选区锚点/焦点落在本组件的直接子插槽集合内
})
```

### `onBlur`

**时机**：与 **`onFocus`** 成对；当上述 **`parent`** 换成另一块组件时，对 **上一轮** 的 **`parent`** 触发。

**参数**：无；**`() => void`**。

```ts
import { onBlur } from '@textbus/core'

onBlur(() => {
  // 编辑语境离开本组件（相对 onFocus 语义）
})
```

### `onFocusIn`

**时机**：选区 **公共祖先组件** 变化后，沿 **从新祖先到根** 的路径，对每个 **`Component`** 触发一次，表示选区已进入该子树语境。

**参数**：无；**`() => void`**。

```ts
import { onFocusIn } from '@textbus/core'

onFocusIn(() => {
  // 选区公共祖先链包含本组件
})
```

### `onFocusOut`

**时机**：与 **`onFocusIn`** 成对清理：对上一轮记录的链路上的组件触发，表示离开对应语境。

**参数**：无；**`() => void`**。

```ts
import { onFocusOut } from '@textbus/core'

onFocusOut(() => {
  // 上一轮 focus-in 语境收尾
})
```

### `onSelectionFromFront`

**时机**：例如 **`Selection.toNext()`**：光标从某一 **`Component`** 的 **前缘** 跨入时，内核可先问该组件是否接管。

**参数**：**`event: Event<Component>`**，无 **`data`**（**`null`**）。**`event.target`** 即该组件。

**`preventDefault()`** 可阻止默认「若组件无子插槽则 **`selectComponent`**」等行为；若阻止，选区会维持调用前的位置。

```ts
import { onSelectionFromFront } from '@textbus/core'

onSelectionFromFront(event => {
  // event.target 为被跨入的组件；不需要默认「跨入即整块选中」时 event.preventDefault()
})
```

### `onSelectionFromEnd`

**时机**：例如 **`Selection.toPrevious()`**：从 **后缘** 跨入 **`Component`** 时对称触发。

**参数**：同为 **`Event<Component>`**，**`event.target`** 为被跨入组件。**`preventDefault()`** 语义与 **`onSelectionFromFront`** 对称。

```ts
import { onSelectionFromEnd } from '@textbus/core'

onSelectionFromEnd(event => {
  // 与 onSelectionFromFront 对称；event.target 为被跨入的组件
})
```

若出现「光标一跳又回去」，可检查这两个钩子里是否误 **`preventDefault()`**。


## 右键菜单与模型通知

### `onContextMenu`

**时机**：业务调用 **`triggerContextMenu(component)`**（**`@textbus/core`** 导出）时，从 **`component`** 开始沿 **`parentComponent`** 向上逐层询问。

**参数**：**`event: ContextMenuEvent<Component>`**。

- **`event.target`**：当前这一层处理的组件。
- **`event.useMenus(menuConfigs)`**：把 **`ContextMenuConfig[]`** 交给内核汇总；其中菜单项类型含 **`ContextMenuItem`**、**`ContextMenuGroup`** 等，字段以类型声明为准。
- **`event.stopPropagation()`**：不再向上层组件继续收集菜单。

```ts
import { onContextMenu } from '@textbus/core'

onContextMenu(event => {
  event.useMenus([])
  // event.stopPropagation()
})
```

### `onParentSlotUpdated`

**时机**：父 **`Slot`** 一侧数据更新并通知子树时（例如适配层同步后）。

**参数**：无；**`() => void`**。适合刷新仅依赖父插槽状态的本地视图或缓存。

```ts
import { onParentSlotUpdated } from '@textbus/core'

onParentSlotUpdated(() => {
  // 父插槽已更新
})
```

### `onDetach`

**时机**：当前组件实例即将从文档模型上剥离（删除、整块替换等）。

**参数**：无；**`() => void`**。用于取消订阅、清定时器等。处理完成后内核会清除该实例上的钩子登记。

```ts
import { onDetach } from '@textbus/core'

onDetach(() => {
  // 清理副作用
})
```


## 接下来

- [组件基础](./component-basics)（**`onBreak`**、**`onContentInsert`**）  
- [状态查询与基础操作](./operations-and-query)（命令与钩子）  
- [组件高级](./component-advanced)（**`separate`**、多插槽）  
- [快捷键和语法糖](./shortcuts-and-grammar)  
- [核心概念](./concepts)
