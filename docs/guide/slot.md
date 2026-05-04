# 插槽

**插槽**（类型名为 `Slot`）是组件 `state` 里承载文档片段的容器：文本与子组件按顺序排列，由 `schema` 限定可插入的 `ContentType`，并在其上叠加**格式**（文本区间）与**属性**（整槽）。与 [组件基础](./component-basics)、[文字样式](./text-styles)、[块级样式](./block-styles)、[核心概念](./concepts)、[组件高级](./component-advanced) 中的术语与用法相互引用。

## 构造与静态成员

### `new Slot(schema, state?)`

- **`schema`**：`ContentType[]`，表示允许插入 **`ContentType.Text` / `InlineComponent` / `BlockComponent`** 中的哪些。
- **`state`**：可选，默认 `{}`，经 **`observe`** 包装；修改 **`state`** 会标记插槽脏，便于视图更新。
- 新建后插槽内已有 **占位内容**；是否尚无用户可见的正文，用 **`isEmpty`** 判断。

```ts
import { ContentType, Slot } from '@textbus/core'

const plain = new Slot([ContentType.Text])

type CaptionState = { label: string }
const caption = new Slot<CaptionState>([ContentType.Text], { label: '' })
caption.state.label = '图 1'
```

### `Slot.placeholder`

零宽字符 **`'\u200b'`**。**`insert`** 在游标紧邻占位片段时会先合并 / 替换占位，再写入实际内容；**`Slot.placeholder`** 本身只是该占位符的常量引用。

```ts
import { Slot } from '@textbus/core'

console.log(Slot.placeholder === '\u200b')
```

### `Slot.emptyPlaceholder`

静态 getter，当前实现为 **`'\n'`**，与「空插槽仍保留一格占位」的语义配合；**`isEmpty`** 会把内容与 **`Slot.emptyPlaceholder`** 比对。

```ts
import { Slot } from '@textbus/core'

console.log(Slot.emptyPlaceholder === '\n')
```

## 只读成员与访问器

### `schema`

允许插入的内容类型列表。**`insert`** 会用它校验 **`content`** 的类型。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text, ContentType.InlineComponent])
console.log(slot.schema.includes(ContentType.BlockComponent)) // false
```

### `state`

挂在插槽上的业务数据对象（构造第二个参数）；响应式，修改其中的字段会标记插槽脏。

```ts
import { ContentType, Slot } from '@textbus/core'

type S = { hint: string }
const slot = new Slot<S>([ContentType.Text], { hint: '请输入' })
slot.state.hint = '标题'
```

### `changeMarker`

**`ChangeMarker`**：挂在 **`Slot`** 上的变更标记器，用来记录 **是否发生过修改**（如 **`dirty` / `changed`**）。**`markAsDirtied` / `markAsChanged`** 等触发时，会向 **`onChange`、`onSelfChange`、`onChangeBefore`** 等 Observable 推送 **`Operation` / `Action[]`**，并沿父 **`parentModel`** 冒泡。**业务代码一般不必直接读写**，多由 **`Slot`** 在插入、删除、改格式等操作内部维护。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
console.log(slot.changeMarker != null)
```

### `onContentChange`

**`Observable<Action[]>`**：插槽在内容或格式变更后，向订阅者推送本次对应的 **`Action[]`**（含类型与载荷）。**`onContentChange`** 用于在 **`Slot`** 侧订阅已发生的变更流；与 **`History`** 等机制的关系见 [状态查询与基础操作](./operations-and-query)。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
const sub = slot.onContentChange.subscribe(actions => {
  console.log(actions.map(a => a.type))
})
slot.retain(0)
slot.insert('a')
sub.unsubscribe()
```

### `parent`

当前 **`Slot`** 在文档树上所属的 **`Component`**：从内往外看，就是「持有这一段 **`Slot` 实例**」的那一个组件节点。插槽还没挂进任何组件的子结构里时，**`parent`** 为 **`null`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const orphan = new Slot([ContentType.Text])
console.log(orphan.parent) // null（尚未插入任何组件的子树）
```

### `parentSlot`

当 **`parent`** 存在时，**`parent`** 这块组件作为一段内容插在 **`parentSlot`** 里：**`parentSlot`** 就是包住 **`parent`** 的那一层 **`Slot`**，相对当前 **`Slot`** 再往外一层；**`parent`** 为 **`null`** 时，**`parentSlot`** 也为 **`null`**。沿文档树往外走时，可以 **`parentSlot`** 与 **`parent`** 交替向上查看。

```ts
import type { Slot } from '@textbus/core'

declare const attached: Slot
console.log(attached.parentSlot)
```

### `length`

按「字符格 + 每个子组件占一格」统计。**是否视为空文档**用 **`isEmpty`**，不要单凭 **`length`** 推断。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('你好')
console.log(slot.length) // 依据占位被替换后的实际长度
```

### `isEmpty`

**`true`** 表示「仅有占位、无可编辑实质内容」；与 **`length === 0`** 不是同一回事。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
console.log(slot.isEmpty) // true
slot.retain(0)
slot.insert('x')
console.log(slot.isEmpty) // false
```

### `index`

当前 **书写游标**位置（下标）。**`isEmpty`** 时读 **`index`** 恒为 **`0`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
console.log(slot.index) // 3
slot.retain(1)
console.log(slot.index) // 1
```

## 属性：`Attribute`

### `setAttribute(attribute, value, canSet?)`

把 **`Attribute`** 写到 **当前槽**；若 **`attribute.onlySelf` 不为 `true`**，还会下发到 **子组件的各个插槽**。**`canSet`** 返回 **`false`** 或 **`attribute.checkHost`** 失败时不生效。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'right')
```

**`canSet(slot, attribute, value)`** 返回 **`false`** 时，本次 **`setAttribute`** 直接放弃，不写 **`Attribute`**、不下发子槽。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])

let allowAlign = false
slot.setAttribute(align, 'left', () => allowAlign)
console.log(slot.hasAttribute(align)) // false

allowAlign = true
slot.setAttribute(align, 'left', () => allowAlign)
console.log(slot.hasAttribute(align)) // true
```

### `getAttribute(attribute)`

读取当前槽上该 **`Attribute`** 的值；未设置时 **`null`**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
console.log(slot.getAttribute(align)) // 'left'
```

### `hasAttribute(attribute)`

是否已设置该 **`Attribute`**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
console.log(slot.hasAttribute(align)) // false
slot.setAttribute(align, 'left')
console.log(slot.hasAttribute(align)) // true
```

### `getAttributes()`

返回 **`[Attribute, value][]`**，用于遍历当前槽上的全部块级属性。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
for (const [attr, value] of slot.getAttributes()) {
  console.log(attr.name, value)
}
```

### `removeAttribute(attribute, canRemove?)`

删除指定 **`Attribute`**；同样会按 **`onlySelf`** 规则递归子组件插槽。**`canRemove`** 可拦截。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
slot.removeAttribute(align)
console.log(slot.hasAttribute(align)) // false
```

**`canRemove(slot, attribute)`** 返回 **`false`** 时，**本次调用**在 **当前插槽** 上直接返回：既不删除本槽上的该属性，也 **不会**再向子组件插槽派发删除。（子槽上的删除若未带 **`canRemove`**，则会照常执行。）

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')

slot.removeAttribute(align, () => false)
console.log(slot.hasAttribute(align)) // true

slot.removeAttribute(align, () => true)
console.log(slot.hasAttribute(align)) // false
```

## 游标：`retain`

### `retain(offset)`（只移动游标）

把内部游标移到 **`offset`**（边界裁剪到 **`[0, length]`**）。随后的 **`insert` / `delete`** 从该位置开始。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
slot.retain(1)
slot.delete(1) // 删掉 'b'
```

### `retain(offset, formatter, value, canApply?)`

从 **当前游标**起，向后 **`offset`** 长度的区间施加格式；**`value` 为 `null`** 表示在该区间对该 **`Formatter`** 解除格式（清空）。亦可传入 **`Formats`**（**`[Formatter, value][]`**）一次多套。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.retain(0)
slot.retain(5, bold, true)
slot.retain(0)
slot.retain(5, bold, null) // 清除加粗（示意）
```

### `canApply`（可选回调）

在 **`insert` / `write`、带格式参数的 `retain`、`applyFormat`、`cleanFormats`、`insertDelta`** 里可作为最后一参传入，签名为 **`(slot, formatter, value) => boolean`**。返回 **`false`** 时，**这一轮**里不会对 **`formatter` / `value`** 做合并（**`insert` 仍会写入字符串或组件**，只是被拒绝的 **`Formatter`** 不会套上）。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>

const denied = new Slot([ContentType.Text])
denied.retain(0)
denied.insert('hi', bold, true, () => false)

const allowed = new Slot([ContentType.Text])
allowed.retain(0)
allowed.insert('hi', bold, true, () => true)

console.log(denied.extractFormatsByIndex(0).some(([f]) => f === bold)) // false
console.log(allowed.extractFormatsByIndex(0).some(([f]) => f === bold)) // true
```

在 **带格式的 `retain`** 上同理：返回 **`false`** 则该次区间格式合并跳过。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.retain(0)
slot.retain(5, bold, true, () => false)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === bold)) // false
```

## 写入与删除

### `insert(content, formats?, canApply?)`

在 **当前 `index`** 插入字符串或 **`Component`**。**`schema`** 不匹配返回 **`false`**。组件若已在别处挂载，会先 **`removeComponent`** 再挂到本槽。可选 **`formats`** 仅对 **非块级子节点** 的文本等内容叠加 **`Formatter`**。**`canApply`** 语义见上一节 **`canApply`（可选回调）**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hi', bold, true)
```

### `write(content, formatter?, value?, canApply?)`

在 **`insert`** 前先 **继承游标邻侧格式**（模拟连续输入），再写入；需要「干净无继承」时用 **`retain` + `insert`**。**`canApply`** 会原样传给内部的 **`insert`**（见 **`canApply`（可选回调）**）。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('a', bold, true)
slot.retain(1)
slot.write('bc') // “bc”会带上与左侧衔接的格式（示意）
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('a', bold, true)
slot.retain(1)
slot.write('b', bold, true, () => false) // 本轮拒绝叠 bold；文本仍会写入
console.log(slot.toString().includes('ab'))
```

### `delete(count)`

从 **当前 `index`** 向后删 **`count`** 格；删空后会重新放入占位并尽量保留格式骨架。**`count <= 0`** 返回 **`false`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
slot.retain(1)
slot.delete(2)
```

### `removeComponent(component)`

按实例查找下标，**`retain` 到该格再 `delete(1)`**；找不到返回 **`false`**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Component } from '@textbus/core'

declare const child: Component
const slot = new Slot([ContentType.InlineComponent])
slot.retain(0)
slot.insert(child)
slot.removeComponent(child)
```

## 格式：`Formatter`

### `applyFormat(formatter, { startIndex, endIndex, value }, canApply?)`

等价于 **`retain(startIndex)`** 再 **`retain(endIndex - startIndex, formatter, value)`**，用于 **绝对下标区间** 套格式。**`canApply`** 见 **`canApply`（可选回调）**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true })
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true }, () => false)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === bold)) // false
```

### `getFormats()`

返回当前槽上全部 **`FormatItem`** 的列表：每一项给出 **`formatter`**、区间 **`startIndex` / `endIndex`** 以及该段上的 **`value`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab')
console.log(slot.getFormats().length >= 0)
```

### `extractFormatsByIndex(index)`

取出 **某一字符格处**生效的格式列表 **`[Formatter, value][]`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('x')
const at0 = slot.extractFormatsByIndex(0)
console.log(Array.isArray(at0))
```

### `getFormatRangesByFormatter(formatter, startIndex, endIndex)`

在 **`[startIndex, endIndex)`** 内，找出指定 **`Formatter`** 覆盖到的 **`FormatRange[]`**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.applyFormat(bold, { startIndex: 1, endIndex: 4, value: true })
const ranges = slot.getFormatRangesByFormatter(bold, 0, slot.length)
console.log(ranges.length)
```

### `cleanFormats(remainFormats?, startIndex?, endIndex?, canApply?)`

在 **`[startIndex, endIndex)`** 区间内 **去掉格式**。第一个参数 **`remainFormats`**（默认 **`[]`**）二选一：

- **`Formatter[]`**：出现在数组里的 **`Formatter` 实例所对应的格式会保留**；未出现的格式器，在该区间内对其调用 **`retain(..., formatter, null)`** 予以清除。
- **`(formatter: Formatter) => boolean`**：遍历 **`getFormats()`** 的每一条 **`FormatItem`**，将其 **`formatter`** 传入回调。返回 **`true`** 表示 **跳过清除**（保留该格式化器在当前区间的呈现）；返回 **`false`** 则在 **`[startIndex, endIndex)`** 上对该 **`formatter`** 执行 **`retain(..., formatter, null)`**。

若当前槽 **`getFormats()`** 为空，会 **递归子组件插槽** 内的格式清理。每一次解除格式的 **`retain`** 都会传入 **`canApply`**：返回 **`false`** 则 **这一轮不对该 `formatter` 执行清除**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
declare const italic: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab', italic, true)
slot.cleanFormats([bold], 0, slot.length) // italic 不在保留列表里，会被清除；bold 若在区间内则会保留
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const italic: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab', italic, true)
slot.cleanFormats([], 0, slot.length, (_s, fmt) => fmt !== italic)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === italic)) // true，拦截了对 italic 的清除

slot.cleanFormats([], 0, slot.length, () => true)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === italic)) // false
```

## 读取片段与剪切

### `getContentAtIndex(index)`

返回该下标处的 **字符串片段或 `Component`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab')
const ch = slot.getContentAtIndex(0)
console.log(typeof ch === 'string')
```

### `sliceContent(startIndex?, endIndex?)`

默认 **`[0, length)`**，返回 **`Array<string | Component>`**。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
const parts = slot.sliceContent(1, 2)
console.log(parts.join(''))
```

### `indexOf(component)`

子 **`Component`** 首次出现的下标；不存在为 **`-1`**。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Component } from '@textbus/core'

declare const child: Component
const slot = new Slot([ContentType.InlineComponent])
slot.retain(0)
slot.insert(child)
console.log(slot.indexOf(child))
```

### `cut(startIndex?, endIndex?)`

把 **`[startIndex, endIndex)`** 剪到新 **`Slot`**（复制 **`schema`**，并 **深拷贝 `state`**），源槽删除该区间；剪下的片段携带与之对齐的格式信息。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
const tail = slot.cut(3, slot.length)
console.log(tail.toString())
```

### `cutTo(targetSlot, startIndex?, endIndex?)`

剪到 **你已构造好的**目标 **`Slot`**（例如自定义 **`state` 初始值**）；区间语义与 **`cut`** 相同。

```ts
import { ContentType, Slot } from '@textbus/core'

const src = new Slot([ContentType.Text])
src.retain(0)
src.insert('abcde')
const dst = new Slot([ContentType.Text])
src.cutTo(dst, 2, src.length)
console.log(dst.toString())
```

## Delta

### `toDelta()`

得到 **`DeltaLite`**：**每项为 `{ insert, formats }`**，并把 **`attributes`** 打进 **`delta.attributes`**，便于粘贴合并或自定义管线。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hi')
const delta = slot.toDelta()
console.log(delta.length, delta.attributes.size)
```

### `insertDelta(delta, canApply?)`

先把 **`delta.attributes`**  **`setAttribute`** 到当前槽，再 **顺序 `insert` 每一段**；若某次 **`insert` 失败**（例如 **`schema`** 不符），**停止消费**并返回 **剩余的 `delta`**。每一段 **`insert` 叠格式时**都会把 **`canApply`** 传下去（见 **`canApply`（可选回调）**）。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
const src = new Slot([ContentType.Text])
src.retain(0)
src.insert('ab')
const delta = src.toDelta()
slot.retain(0)
slot.insertDelta(delta)
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const src = new Slot([ContentType.Text])
src.retain(0)
src.insert('z', bold, true)
const delta = src.toDelta()

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insertDelta(delta, () => false)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === bold)) // false，delta 里带的 bold 未套上
console.log(slot.toString().includes('z')) // true，文本仍插入
```

## 其它方法

### `background(fn)`

在 **`fn` 执行期间**，凡是 **`retain`（带格式）、`applyFormat`** 等写入的 **`Formatter`**，都会以 **最低优先级**参与 **`Format.merge`**：**在同一 `Formatter`、与你指定的合并区间相交的部分里，若已经存在该格式化器的区间，则以已有的 **`value` 与区间**为准；只有区间内尚未被当前 **`Formatter`** 覆盖到的部分，这次新设的格式才会生效**。重叠区间不会出现「背景写入把原来的同格式化结果盖掉」的行为。

当 **`retain`** 需要作用到 **嵌套子组件内部的插槽**时，内核会对子槽再套一层 **`background`**（内部 **`applyFormatCoverChild`**），子槽里的格式写入遵循同一套合并规则。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.background(() => {
  slot.retain(0)
  slot.retain(slot.length, bold, true)
})
```

### `cleanAttributes(remainAttributes?, canRemove?)`

第一个参数 **`remainAttributes`** 二选一（默认 **`[]`**，表示 **不保留任何** `Attribute`，全部删除）：

- **`Attribute[]`**：出现在数组里的 **`Attribute` 实例会保留**；未出现的则对当前槽调用 **`removeAttribute`**。
- **`(attribute: Attribute) => boolean`**：对当前槽上 **每一个已设置的 `Attribute`** 调用一次。返回 **`true`** 表示 **保留**该属性；返回 **`false`** 表示 **删除**（对该 **`attribute`** 调用 **`removeAttribute`**）。

上述规则处理完 **当前槽** 后，会对 **子组件里的各子插槽** 递归执行 **`cleanAttributes(remainAttributes, canRemove)`**（参数原样下传）。**`canRemove`** 的语义与单条 **`removeAttribute(attribute, canRemove?)`** 相同。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
slot.cleanAttributes([align])
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
declare const other: Attribute<string>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
slot.setAttribute(other, 'x')
slot.cleanAttributes(attr => attr === align)
console.log(slot.hasAttribute(align), slot.hasAttribute(other)) // true, false
```

### `toJSON()`

**`SlotLiteral`**：**`schema`、content 字面量、`attributes`、`formats`、`state`**，用于持久化或与 **`Registry.createSlot`** 配合还原。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ok')
const json = slot.toJSON()
console.log(Array.isArray(json.schema), json.content.length)
```

### `toString()`

返回按插槽线性内容拼接得到的字符串：遇到 **`Component`** 节点时，其字符串形式由该 **`Component`** 的实现决定，而非由 **`Slot`** 统一格式化。

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
console.log(slot.toString())
```

### `toTree(slotRenderFactory, customFormat?, renderEnv?)`

根据当前槽上的格式与内容生成 **`VElement`**：区间格式走各 **`Formatter.render`**，槽级 **`Attribute`** 再渲染到 **`slotRenderFactory`** 返回的根节点上。**`slotRenderFactory`** 负责把子虚拟节点列表包成一层宿主元素。与浏览器视图对接时见 [浏览器模块](./platform-browser) 与 [Viewfly 适配器](./adapter-viewfly)（或 [Vue](./adapter-vue)、[React](./adapter-react)）。

```ts
import { ContentType, Slot } from '@textbus/core'
import type { SlotRenderFactory } from '@textbus/core'

declare const wrapChildren: SlotRenderFactory
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('x')
console.log(slot.toTree(wrapChildren))
```

### `Slot.toTree`（静态）

在低层给定 **`FormatTree`** 与 **`Slot`**，拼出根 **`VElement`**（仍属适配器 / 渲染管线内部）。

```ts
import { Slot } from '@textbus/core'
import type { FormatTree } from '@textbus/core'
import type { SlotRenderFactory } from '@textbus/core'

declare const slot: Slot
declare const tree: FormatTree
declare const wrapChildren: SlotRenderFactory
console.log(Slot.toTree(slot, wrapChildren, tree))
```

### `Slot.formatsToTree`（静态）

把一层 **`Formats`** 嵌套套在 **`children`** 外包 **`VElement`**，供 **`Formatter.render`** 链式包裹使用。

```ts
import { Slot } from '@textbus/core'
import type { Formats } from '@textbus/core'
import type { Component } from '@textbus/core'
import type { VElement, VTextNode } from '@textbus/core'

declare const formats: Formats
declare const children: Array<VElement | VTextNode | Component>
console.log(Slot.formatsToTree(formats, children, /* renderEnv */ {}))
```

## 与命令、选区的关系

**`Commander`**、**`Selection`** 提供面向编辑器的 **命令与选区** 能力，常见写入在内部仍会落到 **`Slot`** 的 **`insert` / `delete` / `retain`** 等（见 [状态查询与基础操作](./operations-and-query)、[选区](./selection)）。你也可以在 **`setup`** 等逻辑里 **直接**调用上述 **`Slot`** 方法：只要改动落在 **文档树** 上，内核就会按本轮变更产生对应的 **`Action`**，并写入 **`History`**，因而 **始终具备可撤销 / 可重做** 的记录基础。

## 接下来

- [文字样式](./text-styles)、[块级样式](./block-styles)：`Formatter` / `Attribute` 的注册与渲染  
- [文档解析与兼容处理](./document-parse-compat)：**`Parser`** 如何把 HTML 写入 **`Slot`**  
- [组件高级](./component-advanced)：**`getSlots()`**、**`separate`**、**`removeSlot`**  
