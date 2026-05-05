# 状态查询与基础操作

富文本工具栏要回答两件事：**当前选区里正在发生什么**（这一段是不是加粗、是不是段落、对齐方式是什么），以及 **用户点击后要怎样改文档**（加粗、删字、换行）。在 Textbus 里，前者交给 **`Query`**（只读模型），后者交给 **`Commander`**（写入入口）。二者都和 **[选区](./selection)** 绑定：选区一变，查询结果就变；命令执行后，文档与选区随之更新。

阅读本篇前请已跑通 [快速开始](./getting-started)，并了解 **`Formatter`** / **`Attribute`**（[文字样式](./text-styles)、[块级样式](./block-styles)）。下文默认 **`editor`** 已由 **`render`** 就绪。

---

## 取得 `Query` 与 `Commander`

内核把 **`Commander`**、**`Query`** 挂在 **`Textbus`** 上，用同一个 **`editor`** 取出即可。在组件 **`setup`** 里写交互逻辑时，常用 **`useContext(Commander)`** 注入命令对象（与 [组件基础](./component-basics) 一致）；**`Query`** 多在挂载编辑器的视图层或外层 UI 里用 **`editor.get(Query)`** 获取。

```ts
import { Commander, Query } from '@textbus/core'

const query = editor.get(Query)
const commander = editor.get(Commander)
```

**无选区**（**`selection.isSelected === false`**）时，内置 **`Query`** 对外为 **`QueryStateType.Normal`**，**`value`** 为 **`null`**。依赖有效选区的 **`Commander`** 写入在无选区时 **`return false`** 或直接 **`return`**，不改正文。

工具栏的典型做法是：**选区变化 → 重新跑一遍查询 → 更新按钮态**。下面是一段最小接线（**`BoldFormatter`** 换成你工程里已注册的 **`Formatter`**）。

```ts
import { Selection, QueryStateType } from '@textbus/core'

const selection = editor.get(Selection)

selection.onChange.subscribe(() => {
  const bold = query.queryFormat(BoldFormatter)
  boldButton.dataset.active =
    bold.state === QueryStateType.Enabled ? 'true' : ''
})
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">按钮态与 <code>QueryStateType</code>（示意）</div>
<p style="font-size: 12px; margin: 0 0 12px; color: #6e6e73;">左侧表示查询结果为 <strong>Enabled</strong>（范围内格式一致且生效），按钮可做成「按下」高亮；右侧表示 <strong>Normal</strong>（混合、未全覆盖或无选区等），按钮不高亮或显示第三种「部分」样式。</p>
<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center;">
<div style="display: flex; align-items: center; gap: 8px;">
<span style="font-size: 12px; color: #6e6e73;">Enabled</span>
<button type="button" disabled style="padding: 6px 12px; border-radius: 6px; border: 1px solid #07baf3; background: rgba(7,186,243,0.2); color: #0596c8; font-weight: 700; cursor: default;">B</button>
</div>
<div style="display: flex; align-items: center; gap: 8px;">
<span style="font-size: 12px; color: #6e6e73;">Normal</span>
<button type="button" disabled style="padding: 6px 12px; border-radius: 6px; border: 1px solid #c7c7cc; background: #fff; color: #3c3c43; font-weight: 700; opacity: 0.55; cursor: default;">B</button>
</div>
</div>
</div>

---

## `Query`：如何读出格式、属性与组件

**`Query`** 不修改文档，只返回 **`QueryState<T>`**：**`state`** 取 **`QueryStateType`**；**`state === Enabled`** 时 **`value`** 为类型 **`T`** 的具体值（格式取值、属性值、组件实例等）；否则 **`value`** 为 **`null`**。

```ts
import { Query, QueryStateType } from '@textbus/core'

interface QueryState<V, S = QueryStateType, K = S extends QueryStateType.Enabled ? V : null> {
  state: S
  value: K
}

enum QueryStateType {
  Normal = 'Normal',
  Disabled = 'Disabled',
  Enabled = 'Enabled',
}
```

内置 **`Query`** 在已实现的路径上只返回 **`Normal`** 与 **`Enabled`**。**`Disabled`** 留在枚举里，供自定义 **`Query`** 表示「操作不可用」等扩展语义。

### 格式：`queryFormat` / `queryFormatByRange`

判断某一 **`Formatter`** 在范围内是否 **全覆盖且取值一致**。**折叠光标** 看光标 **左侧** 是否落在该格式上；**拖选** 若混有无格式片段、同一格式多种取值、或跨子组件后子树未一致携带该格式，合并结果为 **`Normal`**。一致时为 **`Enabled`**，**`value`** 即当前格式值。

```ts
const bold = query.queryFormat(BoldFormatter)

if (bold.state === QueryStateType.Enabled && bold.value) {
  // 当前选区视为「整段加粗且取值一致」
}
```

### 属性：`queryAttribute` / `queryAttributeByRange`

查询 **插槽属性**。折叠时在公共祖先插槽上按 **整个插槽** 判断；展开时对各个 **`getSelectedScopes`** 分段合并，分支规则见 [块级样式](./block-styles)。合并失败为 **`Normal`**；一致则为 **`Enabled`**，**`value`** 为属性值。

```ts
const align = query.queryAttribute(TextAlignAttribute)
```

### 组件：`queryComponent` / `queryWrappedComponent`

**`queryComponent`**：从每个 **`Range`** 的起止 **`Slot`** 沿祖先链向上找 **第一个** 匹配构造函数的 **`Component`**，多范围再 **`mergeState`**。**`queryWrappedComponent`**：要求选区 **非折叠**，且几何上 **刚好包住** 某一个组件节点（整块选中段落时常见 **`Enabled`**；光标仅在段落内游走时用 **`queryComponent`** 更合适）。

```ts
const para = query.queryComponent(ParagraphComponent)
const wrapped = query.queryWrappedComponent(ParagraphComponent)
```

### 使用快照范围：`*ByRange`

**`queryFormatByRange`**、**`queryAttributeByRange`**、**`queryComponentByRange`**、**`queryWrappedComponentByRange`** 接受显式 **`Range`**（**`startSlot` / `startOffset` / `endSlot` / `endOffset`**），用于当前 **`Selection`** 以外的区间（例如插件缓存了一段起止再预览）。

```ts
const q = query.queryFormatByRange(BoldFormatter, {
  startSlot,
  startOffset: 0,
  endSlot,
  endOffset: endSlot.length,
})
```

---

## 合并规则与工具栏反馈

多段选区、多 **`Range`** 时，**`Query`** 会把各段结果交给 **`mergeState`**：**任一** 子结果为 **`Normal`**，合并结果就是 **`{ state: Normal, value: null }`**。

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">合并后出现 Normal 时（示意）</div>
<p style="font-size: 12px; margin: 0; color: #6e6e73;">同一条目下多块选中且格式取值不一致时，合并为 <strong>Normal</strong>，工具栏可显示为「未点亮」或单独做「混合」图标，避免给用户「全开 / 全关」的假结论。</p>
</div>

- **格式**：同一 **`Formatter`** 必须在选中范围内 **分段连续且取值一致** 才是 **`Enabled`**；否则为 **`Normal`**。
- **属性 / 组件**：多块选中且 **取值不同** 或 **命中实例不同** 时，合并结果为 **`Normal`**。若要「只要有一块对齐就高亮」，需自行遍历 **`Selection`** / **`Slot`**，**不要**依赖内置 **`mergeState`**。

---

## `Commander`：如何改写文档

**`Commander`** 提供一组高层写入：**通过它的方法改数据**时，内核会替你做好 **选区与文档的同步**，并 **派发相应的数据变更事件** 等，省去手写底层接线的负担。

## `write`：写入内容

在当前选区写入 **`content`**（字符串或 **`Component`**）。**非折叠** 时会先 **删掉选中** 再插入。若当前插槽允许插入，还会从 **光标左侧邻域** 抽取 **可继承**（**`inheritable`**）且与插入点 **右侧** 格式一致的片段，**合并进本次写入**；再把你传入的格式叠加上去。成功返回 **`true`**，否则 **`false`**。

**调用形式**（由第二、三个参数区分）：

1. **`write(content, formats?)`**：第二个参数为 **`Formats`**；省略则只有邻域合并，无额外显式格式。
2. **`write(content, formatter, value?)`**：第二个参数为单个 **`Formatter`**，第三个为对应的 **`value`。若第二参实际传入数组，实现按 **`Formats`** 处理并与邻域合并，与在第二参上传入整段 **`Formats`** 等价。

**`write(content)`**（不传格式，仅用邻域合并）：

```ts
commander.write('你好')
```

**`write(content, formats)`**（显式 **`Formats`**，并与邻域合并）：

```ts
commander.write('混合', [
  [BoldFormatter, true],
  [ItalicFormatter, true],
])
```

**`write(content, formatter, value?)`**（单个格式及其取值）：

```ts
commander.write('标题', headingFormatter, true)
```

## `insert`：插入内容

在当前选区插入 **`content`**。**非折叠** 时先删选中再插入。与 **`write`** 不同：**不** 做邻域格式合并，**只**使用参数里给出的样式。返回值 **`boolean`**。

**调用形式**（由第二个参数区分）：

1. **`insert(content, formats?)`**：第二个参数为 **`Formats`**（**`[Formatter, value][]`**）；省略则不带额外格式。
2. **`insert(content, formatter, value?)`**：第二个参数为单个 **`Formatter`**，第三个为 **`value`**；若第二参实际为数组，则按 **`Formats`** 解析（与 **`write`** 相同）。

**`insert(content)`**：

```ts
commander.insert('纯文本')
```

**`insert(content, formats)`**：

```ts
commander.insert('混合', [
  [BoldFormatter, true],
  [ItalicFormatter, true],
])
```

**`insert(content, formatter, value?)`**：

```ts
commander.insert('纯文本', plainFormatter, value)
```

## `delete`：删除

**非折叠**：删除选中范围。**折叠**：由 **`deleteBefore`** 控制方向——**`true`**（默认）按 **向前** 删一格（类退格）；**`false`** 按 **向后** 删一格（类 Delete）。删除过程中对 **`slot.cut`** 出的 **`Slot`** 片段，可通过 **`receiver`** 接住做自定义处理。返回 **`boolean`** 表示是否发生了有效删除。

**调用形式**（二选一）：

1. **`delete(deleteBefore?)`**：仅控制方向。
2. **`delete(receiver, deleteBefore?)`**：第一个参数为 **`(slot: Slot) => void`**，在删除过程中每当得到一段被切下来的 **`Slot`** 快照时会调用；第二个参数仍为 **`deleteBefore`**，可省略则默认为 **`true`**。

注意：只传一个 **布尔** 时走的是 **形式一**（没有 **`receiver`**）。

**`delete(deleteBefore?)`**：

```ts
commander.delete()
```

```ts
commander.delete(false)
```

**`delete(receiver, deleteBefore?)`**：

```ts
commander.delete(cutSlot => {
  // 使用本次 delete 过程中 cut 出的 Slot
})
```

```ts
commander.delete(cutSlot => {
  /* ... */
}, false)
```

## `break`：换行

模拟 **回车**。**非折叠** 时先清空选中；随后交给父组件 **`onBreak`**（钩子语义见 [组件事件与生命周期](./component-events-and-lifecycle)）。默认路径里会继续 **`write`** 换行；段落最终被拆成几块由 **`ParagraphComponent`** 等具体实现决定。返回 **`boolean`**：**`onBreak`** 未被 **`preventDefault`** 时为 **`true`**。

```ts
commander.break()
```

## `applyFormat`：应用文字格式

按 **当前选区** 应用文字格式。**折叠**、占位 **`Slot.placeholder`**、与 **`Formatter`** 交集等细节见 [文字样式](./text-styles)。父级 **`onSlotApplyFormat`** 可 **`preventDefault`** 阻止本次应用（见 [组件事件与生命周期](./component-events-and-lifecycle)）。

```ts
commander.applyFormat(BoldFormatter, true)
```

## `unApplyFormat`：移除文字格式

按 **当前选区** 移除指定 **`Formatter`**，不再保留该格式标记。

```ts
commander.unApplyFormat(BoldFormatter)
```

## `cleanFormats`：清除文字格式

清除当前选区内的文字格式。可选参数 **`remainFormats`** 默认 **`[]`**：**要保留的** **`Formatter`**（可为格式类数组或谓词）；命中保留条件的格式不会被清除。有两种写法：

- 由 **`Formatter`** 实例组成的数组：列在数组里的格式 **不清除**。
- **`(formatter: Formatter) => boolean`** 形式的谓词：对某个 **`formatter`** 返回 **`true`** 时该格式 **不清除**（与数组语义一致）。

**不传参**（清空可选范围内的格式，无保留项）：

```ts
commander.cleanFormats()
```

**传入保留格式数组**：

```ts
commander.cleanFormats([BoldFormatter])
```

**传入保留谓词**：

```ts
commander.cleanFormats(f => f === BoldFormatter)
```

## `applyAttribute`：设置插槽属性

按 **当前选区** 设置 **插槽属性**；分支与取值语义见 [块级样式](./block-styles)。**`onSlotSetAttribute`** 可阻止（见 [组件事件与生命周期](./component-events-and-lifecycle)）。

```ts
commander.applyAttribute(TextAlignAttribute, 'center')
```

## `unApplyAttribute`：移除插槽属性

按 **当前选区** 移除指定 **`Attribute`**。

```ts
commander.unApplyAttribute(TextAlignAttribute)
```

## `cleanAttributes`：清除插槽属性

清除当前选区涉及的插槽属性。可选参数 **`remainAttributes`** 与 **`cleanFormats`** 对称：可为 **`Attribute`** 实例组成的数组，或 **`(attribute: Attribute) => boolean`** 形式的谓词；用于指定 **保留** 的属性。

**不传参**：

```ts
commander.cleanAttributes()
```

**传入保留属性数组**：

```ts
commander.cleanAttributes([TextAlignAttribute])
```

**传入保留谓词**：

```ts
commander.cleanAttributes(a => a === TextAlignAttribute)
```

## `copy`：复制

把当前选区对应内容交给 **`adapter.copy()`**，写入 **系统剪贴板**（具体能力与 **`Adapter`** 实现有关）。**无返回值**（不表示成功与否，依赖适配器）。

```ts
commander.copy()
```

## `cut`：剪切

先执行 **`copy`**；若选区 **未折叠**，再对选中范围执行 **`delete`**。**折叠** 时不会删除正文，返回 **`false`**；否则返回 **`delete`** 的结果（**`boolean`**）。

```ts
const ok = commander.cut()
```

## `paste`：粘贴

参数 **`pasteSlot`** 为待写入的结构化片段，**`text`** 为平行提供的纯文本（供 **`onPaste`** 等逻辑使用）。**非折叠** 时会先 **`delete`** 再粘贴。向 **`commonAncestorComponent`** 派发 **`onPaste`**（见 [组件事件与生命周期](./component-events-and-lifecycle)），未阻止则按增量写入。**`pasteSlot.isEmpty`**、**无选区** 或插入失败时返回 **`false`**；成功走完管线返回 **`true`**。

```ts
const ok = commander.paste(pasteSlot, plainText)
```

## `insertBefore`：在参照组件之前插入

在 **`ref`** 所在的 **父插槽** 里，把 **`newChild`** 插在 **`ref`** **之前**。

```ts
commander.insertBefore(newChild, refComponent)
```

## `insertAfter`：在参照组件之后插入

在 **`ref`** 所在的 **父插槽** 里，把 **`newChild`** 插在 **`ref`** **之后**。

```ts
commander.insertAfter(newChild, refComponent)
```

## `replaceComponent`：替换组件

移除 **`oldComponent`**，并在 **同一位置** 插入 **`newComponent`**（常用于整块替换卡片、切换块类型）。

```ts
commander.replaceComponent(oldCard, newCard)
```

## `removeComponent`：删除组件

删除 **`component`** 整块；等价于先选中该组件在父插槽里所占的那一格，再执行删除。

```ts
commander.removeComponent(card)
```

## `transform`：转换选区结构

**`transform`** 用来在 **当前选区** 上做一次 **批量「改结构」**：按你给出的 **`TransformRule`**，把选中范围内的文字与嵌套内容 **搬到新造的插槽里**，再 **组装成新的块级组件** 放回文档。典型场景是 **段落 ↔ 列表项**、**一段收成多块** 等；若你的块本身很复杂（多插槽、表格、可拆分列表），还要在组件一侧把 **插槽能接收什么**、**多块之间如何拆开** 约定清楚（见 [组件高级](./component-advanced) 中的 **`getSlots()`**、**`separate`**），否则很容易出现「只改了一半」「拆得很碎」的视觉结果。

与多次调用 **`cut` / `replaceComponent`** 相比，**`transform`** 在同一次调用中完成「读出选中范围 → 按需建新插槽 → 生成新组件并写回文档」。

### 前置条件与返回值

- **没有选区**：**`transform`** 返回 **`false`**，文档不变。
- **有选区**：调用结束后通常返回 **`true`**，表示 **`transform`** 流程已结束；**不表示**文档结构已与预期一致，需在界面或文档树上核对结果。
- **选区里有多段**（不连续选中）：按顺序逐段尝试转换；若某一段在当前上下文下无法继续，后续段可能不再处理，外层仍可能 **`return true`**。**返回值不宜作为转换是否成功的唯一依据**。

### **`TransformRule` 三个字段**

| 字段 | 说明 |
| --- | --- |
| **`targetType`** | **`ContentType`**，取 **`stateFactory`** 所产出目标组件的 **`static type`**。例如转成 **`ParagraphComponent`**（段落）时组件 **`type`** 为 **`ContentType.BlockComponent`**，此处填 **`ContentType.BlockComponent`**；转成行内组件则填 **`ContentType.InlineComponent`**。段落正文等子 **`Slot`** 的 **`schema`**（如 **`ContentType.Text`**）由 **`slotFactory`** 给出，与 **`targetType`** 区分。 |
| **`slotFactory(from)`** | 每当需要 **新开一个空插槽** 来装正文时，会通过此回调创建；参数 **`from`** 是当前所在的 **父组件**，方便你在 **同一层级** 下创建列表项正文插槽、表格单元插槽等。搬过去时，原来附着在片段上的 **插槽级样式（属性）** 一般会尽量保留到新插槽上（边界行为以实际运行与类型说明为准）。 |
| **`stateFactory(slots, textbus)`** | 已有一组准备好的插槽时，由调用方把它们变成最终要出现的块（例如每个插槽一个段落，或多个插槽组成一条列表项）。返回值按顺序写回文档。 |

**`TransformRule`** 包含：**`targetType`**（目标组件类型）、**`slotFactory`**（承载内容的插槽）、**`stateFactory`**（组装出的组件）。

转换会改写选区附近的文档树，并可能改变光标位置。结果异常时，常见原因是规则与父组件、插槽 **`schema`**、**`separate`** 等约定不一致（见 [组件高级](./component-advanced)）。多插槽父组件若在模型层未明确相邻插槽如何拆成同级块，批量转换更容易表现为分段插入，而非整块替换。**`transform`** 与其它写入命令一样走编辑管线；拦截或改写依赖各 **`Component`** 在 **`setup`** 中注册的钩子（见 [组件事件与生命周期](./component-events-and-lifecycle)）。

### 示例：选中内容收成多个段落块

下面假定你的工程里已有 **`ParagraphComponent`**（与 [快速开始](./getting-started)、[组件基础](./component-basics) 中段落一致），其 **`static type`** 为 **`ContentType.BlockComponent`**。转成段落时 **`targetType`** 填 **`ContentType.BlockComponent`**；段落正文 **`Slot`** 仍只允许文本流时，由 **`slotFactory`** 返回 **`new Slot([ContentType.Text])`**。

```ts
import type { TransformRule } from '@textbus/core'
import { ContentType, Slot, Textbus } from '@textbus/core'
// ParagraphComponent 为你工程中已注册的段落块，写法见快速开始 / 组件基础

const paragraphTransform: TransformRule = {
  targetType: ContentType.BlockComponent,
  slotFactory() {
    return new Slot([ContentType.Text])
  },
  stateFactory(slots: Slot[], _textbus: Textbus) {
    return slots.map(body => new ParagraphComponent({ slot: body }))
  },
}

commander.transform(paragraphTransform)
```

**`ParagraphComponent`** 须在 **`new Textbus({ components: [...] })`** 中注册。列表 ↔ 段落时，**`stateFactory`** 改为产出列表项组件，**`targetType`** 填列表项的 **`static type`**（多为 **`ContentType.BlockComponent`**）；列表项正文 **`Slot`** 的 **`schema`** 仍由 **`slotFactory`** 决定。

### 异常表现与相关约束

- **`targetType`**、**`slotFactory`** 与 **`schema`** 不一致：常见表现为 **只改写局部** 或 **块被拆碎**。
- **表格、多插槽列表**：**`separate`**、**`getSlots()`** 顺序等见 [组件高级](./component-advanced)，须先与产品设计对齐。
- **钩子**：粘贴、换行等与 **`transform`** 同属编辑管线，见 [组件事件与生命周期](./component-events-and-lifecycle)。

---

## 方法一览（速查）

下列条目便于全文检索。

**`Commander`**

| 方法 | 作用概要 |
| --- | --- |
| **`transform(rule)`** | **`TransformRule`**（**`targetType` / `slotFactory` / `stateFactory`**）；见上文「转换选区结构」 |
| **`write`** | **`write(content)` / `write(content, formats)` / `write(content, formatter, value?)`**；合并邻域可继承格式 |
| **`insert`** | **`insert(content)` / `insert(content, formats)` / `insert(content, formatter, value?)`**；仅用显式格式 |
| **`delete`** | **`delete(deleteBefore?)`** 或 **`delete(receiver, deleteBefore?)`** |
| **`break`** | 模拟回车 |
| **`insertBefore`** | 在参照组件前插入 |
| **`insertAfter`** | 在参照组件后插入 |
| **`replaceComponent`** | 移除旧组件再插入新组件 |
| **`removeComponent`** | 删除整块组件 |
| **`copy`** | 写入系统剪贴板 |
| **`cut`** | 先 **`copy`**；未折叠再 **`delete`**，返回 **`boolean`** |
| **`paste`** | **`paste(pasteSlot, text)`**，返回 **`boolean`** |
| **`cleanFormats`** | **`cleanFormats()`**；或传入 **`Formatter`** 数组，或传入谓词函数；用于指定清除时保留的格式（见正文） |
| **`applyFormat`** | 应用格式 |
| **`unApplyFormat`** | 移除格式 |
| **`cleanAttributes`** | **`cleanAttributes()`**；或传入 **`Attribute`** 数组，或传入谓词函数；用于指定清除时保留的属性（见正文） |
| **`applyAttribute`** | 设置插槽属性 |
| **`unApplyAttribute`** | 移除插槽属性 |

**`Query`**

| 方法 | 作用概要 |
| --- | --- |
| **`queryFormat` / `queryFormatByRange`** | 格式是否全覆盖且取值一致 |
| **`queryAttribute` / `queryAttributeByRange`** | 插槽属性查询 |
| **`queryComponent` / `queryComponentByRange`** | 沿祖先链命中组件 |
| **`queryWrappedComponent` / `queryWrappedComponentByRange`** | 是否整块包住某一组件 |

---

## 常见问题

- **命令总是 `false`**：先确认 **`selection.isSelected`**；再看 **`onContentInsert` / `onBreak` / `onPaste`** 是否 **`preventDefault`**（钩子说明见 [组件事件与生命周期](./component-events-and-lifecycle)）。
- **`queryFormat` 已是加粗仍为 `Normal`**：选中是否 **跨格式边界**、或 **混有多种 `value`**；折叠光标是否在 **格式内侧**（见 [选区](./selection)）。
- **`queryWrappedComponent` 恒为 `Normal`**：当前是 **折叠**，或 **未** 做到 **`selectComponent`** 式整块选中；改用 **`queryComponent`**。
- **`paste` 无效**：**`pasteSlot.isEmpty`**、**`onPaste`** 是否阻止（见 [组件事件与生命周期](./component-events-and-lifecycle)）；剪贴板依赖 **`Adapter`** / **`BrowserModule`**。

## 接下来

- **撤销 / 重做**：[历史记录](./history)  
- **快捷键与语法糖**：[快捷键和语法糖](./shortcuts-and-grammar)  
- **组件钩子**：[组件事件与生命周期](./component-events-and-lifecycle)  
- **名词与模型**：[核心概念](./concepts)
