# 文档解析与兼容处理

从浏览器 **粘贴板**、外部网页复制的 **HTML**，或你自己保存的一段 **HTML 字符串** 回到 Textbus **组件树 / 插槽** 时，要靠 **`@textbus/platform-browser`** 里的 **`Parser`**，再配合 **`ComponentLoader`**、**`FormatLoader`**、**`AttributeLoader`**，把 DOM 节点翻译成已在编辑器里注册过的 **`Component`**、**`Formatter`**、**`Attribute`**。

本篇假定你已会用 **`new Textbus({ … })`** 注册 **`components` / `formatters` / `attributes`**（见 [文字样式](./text-styles)、[块级样式](./block-styles)），并了解 **`Commander.paste`**、**`onPaste`**（见 [状态查询与基础操作](./operations-and-query)、[组件事件与生命周期](./component-events-and-lifecycle)）。

## 整体流程（粘贴为例）

凡是把一段 **HTML** 还原成编辑器里的 **`Component` / `Formatter` / `Attribute`**（典型场景是 **粘贴**），关键都在 **`Parser`** 与你在 **`ViewOptions`** 里配置的 **`ComponentLoader` / `FormatLoader` / `AttributeLoader`**：**没有对应的 Loader，或节点匹配不上 `match`，那部分 HTML 就不会按你的扩展进入文档模型**。

```ts
const slot = parser.parse(html, new Slot([
  ContentType.BlockComponent,
  ContentType.InlineComponent,
  ContentType.Text,
]))
```

默认粘贴路径里，解析得到的 **`Slot`** 会写入当前选区；若在 **`onPaste`** 里 **`preventDefault()`**，则不再自动插入，由你自己决定如何用 **`Slot`**。一并提供的 **`PasteEventData.text`**（纯文本）可做降级或校验（详见 [状态查询与基础操作](./operations-and-query)、[组件事件与生命周期](./component-events-and-lifecycle)）。

## 在哪里配置 Loader

构造 **`BrowserModule`** 时传入的 **`ViewOptions`**（类型由 **`@textbus/platform-browser`** 导出）里有三项可选数组：

- **`componentLoaders`**：**`ComponentLoader[]`**，识别自定义块标签（表格、标题卡片等），读出 **`Component`** 或再吐出 **`Slot`** 片段。
- **`formatLoaders`**：**`FormatLoader[]`**，把 **`<strong>`**、带 **`style`** 的 **`<span>`** 等映射到 **`Formatter`** 与格式值。
- **`attributeLoaders`**：**`AttributeLoader[]`**，在「插槽外壳」DOM 上识别对齐、缩进等，映射到 **`Attribute`**。

这三份列表会注入 **`Parser`** 构造函数；**只有在这里出现过且 `match` 成功的 Loader**，才会参与解析。**编辑器配置里注册过的 `Formatter.name` / `Attribute.name` / 组件类**，还需要 Loader **`read`** 里返回 **同一个实例或能找到的注册项**，否则 **`Registry`** 一侧无法还原。

```ts
import { BrowserModule } from '@textbus/platform-browser'
import type { ViewOptions } from '@textbus/platform-browser'

const viewOptions: ViewOptions = {
  adapter: /* … */,
  renderTo: () => document.getElementById('editor')!,
  componentLoaders: [/* … */],
  formatLoaders: [/* … */],
  attributeLoaders: [/* … */],
}

new Textbus({
  imports: [new BrowserModule(viewOptions)],
  components: [/* … */],
  formatters: [/* … */],
  attributes: [/* … */],
})
```

## `Parser`：三个常用入口

### `Parser.parseHTML(html: string)`

静态方法：用浏览器 **`DOMParser`** 把字符串解析成 **`document.body`** 节点（内部 **`parseFromString(..., 'text/html')`**）。你在自有逻辑里要先得到 **`HTMLElement`** 时再交给 **`parse` / `parseDoc`**，可以直接用它。

```ts
import { Parser } from '@textbus/platform-browser'

const body = Parser.parseHTML('<p>你好</p>')
// body 即解析后的 body，子节点才是 <p>…
```

### `parse(html, rootSlot)`

**作用**：把一段 HTML 字符串或已有的 **`HTMLElement`**，**填进你传入的 `rootSlot`**（在原 **`Slot`** 上追加内容），并返回这个 **`Slot`**。

**参数**：

- **`html`**：**`string | HTMLElement`**。字符串会先走 **`parseHTML`** 得到 **`body`**，再以 **`body` 的子节点** 为遍历起点（与整页粘贴 DOM 结构一致）。
- **`rootSlot`**：目标 **`Slot`**。粘贴路径里会 **`new Slot([BlockComponent, InlineComponent, Text])`**，表示解析结果允许块、行内组件和文本混排；你若只允许段落级文本，应改成与目标文档 **`schema`** 一致的 **`ContentType[]`**，否则可能出现 **`Commander.insert`** 时不接受的节点类型。

解析顺序大致是：遇到 **元素节点** 时先尝试 **`componentLoaders`**（按数组顺序 **`match`**），命中则 **`read`**；否则对该元素做 **`formatLoaders`** 包裹，并递归子节点；**`<br>`** 会落成换行字符；纯文本节点会 **`insert`**（仅空白且只有零宽/换行的会被跳过）。

```ts
import { Parser } from '@textbus/platform-browser'
import { ContentType, Slot, Textbus } from '@textbus/core'

declare const textbus: Textbus

const parser = textbus.get(Parser)
const slot = new Slot([ContentType.Text])

parser.parse('<p>a<strong>b</strong></p>', slot)
// slot 内为解析后的结构与格式（取决于 formatLoaders / componentLoaders）
```

### `parseDoc(html, rootComponentLoader)`

**作用**：整篇文档入口。不是填既有 **`Slot`**，而是交给 **`rootComponentLoader.read`**，由你决定根上是 **`RootComponent`** 还是别的外壳；**`read` 需返回一块 `Component`** 作为文档根（若返回 **`Slot`** 或 **`void`**，则不适合当作「整篇 HTML → 根组件」这条路径的产出，应调整 Loader 或改用 **`parse`** 往已有 **`Slot`** 里填内容）。

**参数**：

- **`html`**：同上，字符串或 DOM。
- **`rootComponentLoader`**：**`ComponentLoader`**。内部会把 **`SlotParser`** 回调传进来，让你在 **`read`** 里嵌套解析子区域。

```ts
import { Parser } from '@textbus/platform-browser'
import type { ComponentLoader } from '@textbus/platform-browser'
import { Textbus } from '@textbus/core'

declare const textbus: Textbus
declare const rootLoader: ComponentLoader

const parser = textbus.get(Parser)
const root = parser.parseDoc('<div class="doc">…</div>', rootLoader)
```

## `ComponentLoader`

**职责**：判断某个 **DOM 元素**是不是你关心的「一整块」组件；若是，则 **`read`** 成 **`Component`**，或 **`Slot`**（会被展开成 **`delta` 插入外层**），或 **`void`**（放弃该节点）。

**`match(element, returnableContentTypes)`**

- **`element`**：当前遍历到的 DOM 节点。
- **`returnableContentTypes`**：来自外层 **`Slot.schema`** 的拷贝，表示 **当前插槽还能接受哪些 `ContentType`**。你应在 **`match` 里结合标签名、`dataset`、`class` 等判断**，并确保产物类型与 **`schema`** 相容，否则后续 **`insert` 可能失败**。

**`read(element, textbus, slotParser)`**

- **`element`**：命中的那个 DOM 节点。
- **`textbus`**：当前 **`Textbus`**，可取 **`Registry`**、**`Commander`** 等。
- **`slotParser`**：下文 **`SlotParser`**，用来「把一段 DOM 填进子 **`Slot`**」。

返回值：

- **`Component`**：作为一块插入当前上下文。
- **`Slot`**：内核会把 **`slot.toDelta()`** 摊平塞进外层 **`Slot`**。
- **`void`**：当作未匹配，继续尝试下一个 **`ComponentLoader`**；若全部失败，会走 **`FormatLoader` + 子节点** 的通用路径。

```ts
import type { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { ContentType, Slot, Textbus } from '@textbus/core'

declare class TableComponent {
  constructor(state: unknown)
}

const MyTableLoader: ComponentLoader = {
  match(el, schema) {
    return el.tagName === 'TABLE' && schema.includes(ContentType.BlockComponent)
  },
  read(el, _textbus: Textbus, slotParser: SlotParser) {
    const cellSlot = new Slot([ContentType.Text])
    const td = el.querySelector('td')!
    slotParser(cellSlot, td, td)
    return new TableComponent({ cells: cellSlot })
  },
}
```

（**`TableComponent`**、**`state`** 形状仅为占位；请换成你项目里真实的组件类与 **`state`**。）

## `SlotParser`（回调形态）

**不是类**，而是 **`Parser`** 传给 **`ComponentLoader.read`** 的函数：

```ts
(childSlot, slotRootElement, slotContentHostElement?) => childSlot
```

**参数含义**：

- **`childSlot`**：你已经 **`new Slot(schema)`** 好的目标插槽；解析结果写进这里。
- **`slotRootElement`**：视为「插槽外壳」的 DOM，用于 **`AttributeLoader`**（对齐、缩进等挂在容器上的元数据）。
- **`slotContentHostElement`**：可选；**不传时与根相同**。当你外壳是 **`<div class="wrap">`**、正文在 **`<div class="inner">`** 时，根传 **`wrap`**，内容传 **`inner`**，属性读外壳、正文读内层。

内核实现里会先在外壳上跑 **`attributeLoaders`**，再在内容宿主上跑 **`formatLoaders` + 子树**。

## `FormatLoader`

**职责**：判断某个元素是否代表某种 **行内格式**，并在 **`read`** 里返回 **`Formatter` 实例 + 值**。

**`match(element)`**：返回 **`true`** 表示由本 Loader 认领。

**`read(element)`**：返回 **`{ formatter, value }`**，类型 **`FormatLoaderReadResult`**。**`formatter`** 应与 **`Textbus` 配置里注册的实例一致**（或至少 **`name` 能被内核匹配**），**`value`** 类型与该 **`Formatter`** 泛型一致。

同一元素上可以 **多个 `FormatLoader` 同时为 `true`**：内核会把它们都 **`read`** 出来，并在插入的内容区间上 **叠加应用**（区间由解析子节点前后的 **`slot.index`** 决定）。

```ts
import type { FormatLoader } from '@textbus/platform-browser'

declare const boldFormatter: import('@textbus/core').Formatter<boolean>

const BoldLoader: FormatLoader<boolean> = {
  match(el) {
    return el.tagName === 'STRONG' || el.tagName === 'B'
  },
  read() {
    return { formatter: boldFormatter, value: true }
  },
}
```

## `AttributeLoader`

**职责**：在解析 **`Slot`** 时，根据 **「插槽外壳」DOM**（**`SlotParser`** 的第二个参数 **`slotRootElement`**）认出 **插槽级 `Attribute`**，并写入 **`value`**。典型用途是从粘贴进来的 **`<p style="text-align:center">`**、**`<div data-indent="1">`** 等还原成你在 [块级样式](./block-styles) 里注册过的 **`Attribute`**。

**和 `FormatLoader` 的差别**：

- **`AttributeLoader`** 只在 **`SlotParser` 往子 **`Slot`** 里填内容之前**、针对 **`slotRootElement`** 执行；效果是 **`childSlot.setAttribute(attribute, value)`**，作用在 **整段插槽**，不是某一段文字的区间格式。
- **`FormatLoader`** 跑在 **`slotContentHostElement`** 上（见上文 **`SlotParser`**），用 **`retain` + `formatter`** 套在 **子节点插进来的那段下标区间** 上。

**`match(element: Element): boolean`**

- **`element`** 即当前这次 **`slotParser(..., slotRootElement, ...)`** 传进来的 **外壳节点**。只有 **元素节点** 才会参与匹配。
- 返回 **`true`** 表示本 Loader 认领该外壳；**多个 Loader 可以同时为 `true`**：内核会先 **`filter` 出全部命中的项**，再按 **`attributeLoaders` 数组顺序** 依次 **`read` 并 `setAttribute`**（都会生效，不是「只采纳第一个」）。

**`read(element: Element): AttributeLoaderReadResult<T>`**

- 返回 **`{ attribute, value }`**。**`attribute`** 须与 **`Textbus` 里注册的 `Attribute` 实例**一致（或内核能按 **`name`** 对齐）；**`value`** 类型须与该 **`Attribute<T>`** 的 **`T`** 一致。
- **`read`** 里应从 **`element`** 读取 **`style` / `dataset` / `class`** 等组装 **`value`**（与 **`match`** 判定所用信息对齐，避免 **`match` 为真却读不到字段**）。

```ts
import type { AttributeLoader } from '@textbus/platform-browser'
import type { Attribute } from '@textbus/core'

declare const textAlignAttribute: Attribute<'left' | 'center' | 'right' | 'justify'>

/** 示意：从行内 style 还原对齐（真实场景还需处理 class、Office 脏标记等） */
const TextAlignFromStyleLoader: AttributeLoader<'left' | 'center' | 'right' | 'justify'> = {
  match(el) {
    const t = (el as HTMLElement).style.textAlign
    return t === 'left' || t === 'center' || t === 'right' || t === 'justify'
  },
  read(el) {
    const value = (el as HTMLElement).style.textAlign as 'left' | 'center' | 'right' | 'justify'
    return { attribute: textAlignAttribute, value }
  },
}
```

**编写时注意**：外壳与内容宿主分离时（**`slotParser(slot, wrap, inner)`**），**只有 `wrap` 会走 `AttributeLoader`**；**`inner`** 上不会再自动跑属性 Loader——块级元数据应落在 **`wrap`** 上，或在 **`ComponentLoader.read`** 里把 **`slotParser`** 接到合适的壳子上。

## 与粘贴、命令的配合

- **默认粘贴**：平台层 **`parser.parse`** → **`commander.paste(slot, text)`**。详见 [状态查询与基础操作](./operations-and-query) **`paste`**。
- **拦截粘贴**：在 **`onPaste`**（见 [组件事件与生命周期](./component-events-and-lifecycle)）里 **`preventDefault()`**，自行 **`parser.parse`** 或清洗 HTML 后再 **`insert`**。
- **复制**：平台层对「整块选中单个组件」时会往剪贴板塞 **`text/html`** + **`text`**；对方应用粘贴回来时又走同一套 **`Parser`**，因此 **Loader 与视图导出 HTML 的约定** 最好对称设计。

## 编写 Loader 时注意

1. **`match` 要稳**：Office、浏览器产生的标签 **`class` / `style` 很脏**，尽量 **收窄条件**，避免误吞大块 DOM。
2. **`componentLoaders` 顺序**：**`parse` 内部按数组顺序找第一个 `match` 成功的 Loader**，靠前的优先。
3. **`attributeLoaders`**：**所有 `match` 成功的都会 `setAttribute`**，执行顺序与 **`attributeLoaders` 数组顺序**一致（与 **`componentLoaders`「先到先得」不同**）。
4. **`schema` 一致**：解析用的 **`Slot`** **`schema`** 与文档里真实插槽一致，否则 **`insert` 可能失败**，插入会退化为按 **`getNextInsertPosition`** 寻找下一可写位再继续。
5. **未匹配的节点**：不会自动变成「未知组件」，多数情况会 **当作普通容器** 递归；完全没有 Loader 认领时，最终往往只剩 **文本或结构丢失**，必要时在 **`FormatLoader`** 层兜底。
6. **浏览器集成**：在浏览器里如何把 **`BrowserModule`**、视图与内核拼在一起，见 [浏览器平台层](./platform-browser)；多个 **`imports` 如何合并见 [模块与扩展（进阶）](./editor-and-modules)。

## 接下来

- [浏览器平台层](./platform-browser)  
- [状态查询与基础操作](./operations-and-query)（**`paste`**、**`insert`**）  
- [组件事件与生命周期](./component-events-and-lifecycle)（**`onPaste`**）  
- [文字样式](./text-styles)、[块级样式](./block-styles)  
- [模块与扩展（进阶）](./editor-and-modules)
