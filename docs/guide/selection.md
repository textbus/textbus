# 选区

编辑器里的「光标」或「拖蓝的一段」，都抽象成 **选区**：落在哪个 **插槽**、从第几个 **位置** 到第几个位置。插入、删字、加粗和工具栏状态都会依赖它；输入法、协作光标也要和它打交道。

下文中的 **方法名、返回值字段名** 与 **`Selection`**、**`Range`** 等 **公共 API** 命名一致。插槽与内容流见 [组件基础](./component-basics)；块级属性写入与选区的关系见 [块级样式](./block-styles)；状态查询与命令如何配合选区见 [状态查询与基础操作](./operations-and-query)。

## 先建立直觉：位置下标是什么

把插槽里内容看成排成一队：**字符串**按字符占一格，**组件**整块占一格。下标表示「竖线」画在谁 **左边**：长度为 5 的 **`hello`**，合法下标是 **`0`～`5`**（**`5`** 表示紧贴在最后一个字母 **后面**，也就是常见「光标在词尾」）。

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">下标示意（同一行内）</div>
<p style="font-family: ui-monospace, monospace; font-size: 13px; margin: 0.5em 0 0;">
  <span style="opacity:0.75">0</span>&nbsp;<span style="opacity:0.75">1</span>&nbsp;<span style="opacity:0.75">2</span>&nbsp;<span style="opacity:0.75">3</span>&nbsp;<span style="opacity:0.75">4</span>&nbsp;<span style="opacity:0.75">5</span><br />
  h&nbsp;e&nbsp;l&nbsp;l&nbsp;o<br />
  <span style="border-left: 2px solid var(--vp-c-brand-1); padding-left: 2px;">光标在 2：在 <code>l</code> 左侧</span>
</p>
</div>

**折叠**表示 **起始位置** 与 **结束位置** 重合，就是一根光标；**不折叠** 就是拖出了一段（拖选方向对应 **锚点位置** 与 **焦点位置**，见下表）。

## 取得选区、监听变化

编辑器 **`render` 就绪** 之后，从 **`Textbus`** 实例上取；在组件 **`setup`** 里也可以 **`useContext(Selection)`**（和快速开始里给段落设光标是同一套）。

```ts
import { Selection } from '@textbus/core'

const selection = editor.get(Selection)

selection.onChange.subscribe(() => {
  // 选区变了：刷新工具条、保存草稿光标位置等
})
```

**`onChange`** 在 **有选区** 时推送 **锚点位置** 与 **焦点位置** 的快照对象；在 **无选区** 时推送 **`null`**。工具栏里常和 **`Query`** 一起：在 **`subscribe`** 回调里根据是否为 **`null`** 决定是否刷新查询。

## 读当前状态

下面这些 **只读属性** 适合打日志、做 UI 判断，不要在业务里当成可写字段去赋值。

| 直觉 | 说明 |
| --- | --- |
| 有没有选区 | **起始位置**（在哪个插槽、第几个偏移）和 **结束位置**（在哪个插槽、第几个偏移）四项都已确定时才算「有」；缺任一项则视为无选区，依赖选区的写入与查询会得到与「无选区」一致的结果。 |
| 是不是一根光标 | 有选区，且 **起始位置** 与 **结束位置** 落在 **同一插槽、同一偏移** → **折叠**（一根光标）；否则是拖蓝。 |
| 起始位置 / 结束位置 | 选区会按文档流 **规范化**：**起始位置** 在文档流上 **不晚于** **结束位置**（与你在屏幕上从右往左拖无关）。 |
| 锚点位置 / 焦点位置 | **锚点位置** 是拖选开始那一端的 **插槽** 与 **偏移**；**焦点位置** 是拖选结束那一端的 **插槽** 与 **偏移**。**只拉长拖蓝、不移动起点** 时，动的是 **焦点位置**；要区分「从哪一头扩展」时看这两个。 |
| 共同的「外壳」 | **公共祖先插槽**、**公共祖先组件**：当前选区涉及的内容，沿树向上最先共同落在 **哪一个插槽 / 哪一个组件** 上。做气泡菜单、判断「是不是在某张表里」时常用。 |

折叠时仍算 **有选区**；依赖范围的命令与查询会把这一段看成 **长度为 0**（光标所在的那一个点）。

## 设光标、设拖蓝

文档处于 **只读** 时，下列 **会改变选区** 的方法 **不会产生效果**。

**把光标放到某一插槽的某一偏移上**（折叠）：

```ts
selection.setPosition(slot, offset)
```

**拖蓝从 A 到 B**（可跨多个插槽）：先定 **锚点位置**（拖选开始处），再定 **焦点位置**（松开鼠标处）；或一次写完。下面是在 **同一插槽** 里选中 **`hello`** 中间三个字母的示意（**`1`～`4`** 包住 **`ell`**）：

```ts
selection.setBaseAndExtent(slot, 1, slot, 4)
selection.setAnchor(slot, 1)
selection.setFocus(slot, 4)
```

**起始位置 / 结束位置** 会落在文档顺序上 **靠前 / 靠后** 的两端；**锚点位置** 与 **焦点位置** 仍保留你拖选的方向，供下文 **「只动焦点、扩大选区」** 等场景使用。

**选中某一个插槽里的全部内容**（不折叠，从 **`0`** 到 **`slot.length`**）：

```ts
selection.selectSlot(slot)
```

## 按组件定位选区

下面这些调用都传入 **组件实例**（例如某段 **`ParagraphComponent`**、自定义卡片块）。实例须 **已在当前文档树里**；用 **`editor.render`** 之后拿到的引用，与树里节点一致即可。

### 光标跳进「第一个 / 最后一个能打字的地方」

把折叠光标放到该组件 **第一个可编辑位置**（通常是第一个子插槽里、最靠前的字符前）：

```ts
selection.selectFirstPosition(paragraph)
```

若组件里还有嵌套结构，希望 **一直钻到最深** 再落点，把第三个参数 **`deep`** 设为 **`true`**：

```ts
selection.selectFirstPosition(paragraph, false, true)
```

把折叠光标放到该组件 **最后一个可编辑位置**（通常是最后一个子插槽里、最靠后的字符后，例如本段末尾）：

```ts
selection.selectLastPosition(paragraph)
```

同样支持 **`deep`**：嵌套较深时，一直钻到最深再落点：

```ts
selection.selectLastPosition(paragraph, false, true)
```

**`selectLastPosition`** 与 **`selectFirstPosition`** 的参数顺序一致：**`(实例, 是否立刻同步页面拖蓝, 是否 deep)`**。

### 光标贴在组件前、组件后

不进入组件内部，而是把光标落在 **父插槽里、紧挨在该组件前或后的缝里**——适合「在这段后面再插一段」「光标停在标题块前面」等：

```ts
selection.selectComponentFront(paragraph)
selection.selectComponentEnd(paragraph)
```

### 整块选中这个组件

选区变成 **只包住这一块**（父插槽里从该项起到下一项前），便于做「整段对齐」「整段删除」或和 [状态查询与基础操作](./operations-and-query) 里 **包住组件** 的查询一起用：

```ts
selection.selectComponent(paragraph)
```

### 从第一个子插槽拖到最后一个子插槽

组件有 **多个子插槽**（例如左右两栏、表格里多格）时，可以从 **第一个子插槽的开头** 一直选到 **最后一个子插槽的末尾**：

```ts
selection.selectChildSlots(blockWithManySlots)
```

若该组件 **没有子插槽**，效果与 **`selectComponent`** 相同。

### 改完选区后，让页面拖蓝立刻跟上

上述方法第二个参数 **`isRestore`** 为 **`true`** 时，会在设置选区后 **立刻同步页面上的拖蓝**（与下文 **「和浏览器蓝条同步」** 一致）：

```ts
selection.selectFirstPosition(paragraph, true)
selection.selectLastPosition(paragraph, true)
selection.selectComponent(paragraph, true)
```

## 移动光标、收起拖蓝

**收起拖蓝** 与 **按字、按行挪动光标** 都用这一类 API。常见用法是绑定 **方向键**；也可以在 **工具条按钮、命令回调** 里直接调用，效果相同。

### 把拖蓝收成一根光标：`collapse`

当前是 **拖蓝**（有长度）时，收成 **折叠**（一根光标），落在 **起始位置** 或 **结束位置** 一侧：

```ts
selection.collapse()
selection.collapse(true)
```

### 在文档流里往前、往后挪一格：`toPrevious` / `toNext`

**折叠**时，光标按内容顺序 **前移一格 / 后移一格**（跨字符、跨组件边界时由编辑器规则决定落点）：

```ts
selection.toPrevious()
selection.toNext()
```

当前若是 **拖蓝**，会先 **收成一根光标**（效果上接近先 **`collapse()`** 再移动），再按上一步的朝向移动。经过 **整块选中的组件** 时，该组件 **可以拦截** 本次移动（在组件提供的选区相关钩子里 **`preventDefault`**；钩子索引见 [组件事件与生命周期](./component-events-and-lifecycle)）。

### 在排版上挪到上一行、下一行：`toPreviousLine` / `toNextLine`

把 **折叠光标** 挪到 **视觉上的上一行或下一行**（与当前列大致对齐）。这里的「行」是 **页面按宽度折行后的行**，不是插槽里的换行符；须 **能根据 DOM 得到行边界**（例如编辑器已跑在浏览器里）才有可靠落点，**得不到目标行时选区不改变**。

```ts
selection.toPreviousLine()
selection.toNextLine()
```

### 用代码改选区后，让页面拖蓝跟上

**`collapse`、`toNext`、`toPreviousLine`** 等 **只更新编辑器里的选区**。若在 **按钮点击、命令逻辑** 等里调用后，发现 **页面蓝条没有一起变**，可在同一流程末尾再调 **`restore()`**（须已开启 **`nativeSelectionDelegate`**，见下文 **「和浏览器蓝条同步」**）：

```ts
selection.toNext()
selection.restore()
```

## 扩大选区：只动焦点、不动锚点

拖选开始后，若希望 **固定起点、只拉长或缩短终点**，可以用下面这组方法：**锚点位置不变，只改焦点位置**，拖蓝在视觉上变长或变方。这与上一节的 **`toNext` / `toPrevious`**（**折叠光标** 在文档里挪一格）不同——这里是 **在已有选区上往外扩**。

### 同一视觉行上往左、往右扩

```ts
selection.wrapToAfter()
selection.wrapToBefore()
```

### 把焦点挪到上一行、下一行

```ts
selection.wrapToPreviousLine()
selection.wrapToNextLine()
```

这里的「上一行 / 下一行」与 **`toPreviousLine` / `toNextLine`** 一样，指 **页面上折行后的行**；**`wrapTo*Line`** 动的是 **焦点**，用来 **加长拖蓝**，而不是移动一根折叠光标。

若要把按键接到这些方法上，见 [快捷键和语法糖](./shortcuts-and-grammar)。

## 全选、清空选区

### 选中整篇：`selectAll`

从根组件 **第一处根级插槽** 的开头，一直选到 **最后一处根级插槽** 的末尾；根下有多块根级插槽时，按根上 **插槽列表的顺序** 取首尾。

```ts
selection.selectAll()
```

### 取消当前选区：`unSelect`

去掉当前选区；若已开启与浏览器的选区同步，**页面上的拖蓝会一起消失**。

```ts
selection.unSelect()
```

与后文 **`setSelectedRanges([])`** 效果相同（见 **「自定义选中区域」**）。

## 快照：临时改选区再还原

粘贴、打开浮层前常要 **记住用户刚才选哪了**：

```ts
const snapshot = selection.createSnapshot()
// …中间改选区、插入内容 …
snapshot.restore()
```

**`restore(true)`** 会在还原模型的同时 **把页面拖蓝一起推过去**；无参调用只还原 **当前内核里的选区**。

若快照里记录的 **插槽** 或节点 **已被删除**，**`restore()`** 无法还原到有效位置，须在业务里自行校验或放弃恢复。

## 选区会被拆成哪些区间

[状态查询与基础操作](./operations-and-query) 里，**删除、加粗、清格式** 等都会先把选区拆成 **「在哪些插槽、每一段从哪到哪」**。下面三个方法用来：**直接读出** 与这些操作 **相同的分段**；或在 **不改当前选区** 的前提下，对 **你给定的一段起止** 先算一遍会拆成几段。

### `getRanges`：一段段「起止插槽 + 偏移」

```ts
const ranges = selection.getRanges()
```

每一项里有 **`startSlot`、`endSlot`、`startOffset`、`endOffset`**，表示一段连续范围。

**结果长什么样（举例）**：在同一段正文里拖了一截字，**通常 `ranges` 只有一项**：**起始、结束都在这个正文插槽里**，两个 offset 包住拖蓝范围。若文档里做了 **多块不相邻** 的选区定制（常见是表格），**`ranges` 里会有多项**，每一项对应一块连续区域。

### `getSelectedScopes`：每个插槽里「从第几个到第几个」

```ts
const scopes = selection.getSelectedScopes()
const scopesFiner = selection.getSelectedScopes(true)
```

每一项里有 **`slot`、`startIndex`、`endIndex`**。

**结果长什么样（举例）**：拖蓝只盖在某段 **一个正文插槽** 里时，**`scopes` 常只有一项**：**`slot`** 就是那段正文，**`startIndex`～`endIndex`** 与拖蓝在该插槽里的范围一致。光标 **折叠**、没有长度时，常见 **`startIndex === endIndex`**，表示 **一个点**。第二参数传 **`true`** 时：在 **第二参数为 `false` 时** 得到的每一段上，若这一段里 **并排跨了多个块级子节点**，会 **沿子节点边界再切开**，使每一段只覆盖 **其中一块**（或更细的连续区间），**返回数组一般比传 `false` 更长**。

### `getScopes`：不读当前选区，自己传入起止

**不改变当前选区**；若把当前选区设成同样的起止，**`getSelectedScopes()`** 读到的分段与这里一致。

```ts
const pieces = selection.getScopes(
  startSlot,
  startOffset,
  endSlot,
  endOffset,
  false,
)
```

**`discardEmptyScope`（第五参数，可选）** 为 **`true`** 时，结果里会去掉 **`startIndex === endIndex`** 的段；默认 **`false`** 时保留这些「零长度」段。

**结果长什么样（举例）**：你已经知道 **一段范围的两头**——**从哪个插槽、第几个偏移开始**，**到哪个插槽、第几个偏移结束**（和 **`getRanges()`** 里 **一项** 能表达的是同一套信息），但 **此刻不想改当前拖蓝**。这时 **`getScopes`** 返回的 **`pieces`**，就等于：**假定拖蓝恰好是这一段**，上一节的 **`getSelectedScopes()`** 会拆出来的那几段；每一项仍是 **`slot`、`startIndex`、`endIndex`**。你可以先按 **`pieces`** 分段做加粗、删除等（与 [状态查询与基础操作](./operations-and-query) 里对选区的分段一致），再单独决定要不要用 **`setPosition` / `select*`** 把选区切到这一段。

## 自定义选中区域

**`setSelectedRanges(ranges)`** 把 **`ranges`** 里每一段 **`{ slot, startIndex, endIndex }`** 登记为 **当前逻辑上的「选中块」**；之后 **`getRanges()`**、**`getSelectedScopes()`** 都 **按这几段返回**，而不再只按「一顶一焦之间那一整条连续区间」去拆。传 **空数组** 等价于 **`unSelect()`**，并会清掉这类登记。

表格里常见的 **框选**，是从 **起始单元格** 拖到 **结束单元格** 所围成的 **矩形区域**（类似 **Excel** 里拖一片格子）。**浏览器自带的选区** 以及内核里 **默认由锚点、焦点表达的范围**，则是按 **文档流从前到后的顺序** 连成 **一整段**：从起点沿内容顺序走到终点，**不等于** 表格行列意义上的「矩形里的每一块」。矩形对角上的两格在文档流里往往 **相距很远**，中间会经过 **本不该算进选中的** 文字或其它单元格，所以 **不能单靠默认选区** 表达框选结果，必须在表格里 **定制选区**。

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">矩形框选 vs 文档流选区（同一对角上的起始格与结束格）</div>
<p style="font-size: 12px; margin: 0 0 12px; color: #6e6e73;">横向 **7** 列、**3** 行，格子按 **先行后列** 编号 **1～21**。假定从 **10** 拖到 **18**（矩形的一对对角）；Excel 式包络内是 **10、11、17、18** 四格，文档流连续选区则是编号顺序下 **10→…→18** 经过的 **全部九格**（含 **12～16** 等不在矩形内的格子）。</p>
<div style="display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start;">
<div>
<p style="font-size: 13px; font-weight: 600; margin: 0 0 8px;">矩形框选（表格语义）</p>
<table style="border-collapse: collapse; font-family: ui-monospace, monospace; font-size: 12px;">
<tr>
<td style="border:1px solid #c7c7cc;width:44px;height:44px;text-align:center;vertical-align:middle;">1</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">2</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">3</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">4</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">5</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">6</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">7</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">8</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">9</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;line-height:1.25;padding:3px;">10<br /><span style="font-size:10px;font-weight:700;color:#0596c8;">起始</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;">11</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">12</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">13</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">14</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">15</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">16</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;">17</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;line-height:1.25;padding:3px;">18<br /><span style="font-size:10px;font-weight:700;color:#0596c8;">结束</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">19</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">20</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">21</td>
</tr>
</table>
<p style="font-size: 12px; margin: 8px 0 0; color: #6e6e73;">浅蓝为 **10、11、17、18** 四格（**起始**、**结束** 在对角 **10** 与 **18**）。</p>
</div>
<div>
<p style="font-size: 13px; font-weight: 600; margin: 0 0 8px;">默认文档流选区</p>
<table style="border-collapse: collapse; font-family: ui-monospace, monospace; font-size: 12px;">
<tr>
<td style="border:1px solid #c7c7cc;width:44px;height:44px;text-align:center;vertical-align:middle;">1</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">2</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">3</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">4</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">5</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">6</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">7</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">8</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">9</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;line-height:1.25;padding:3px;">10<br /><span style="font-size:10px;font-weight:700;color:#b45309;">起始</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">11</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">12</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">13</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">14</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">15</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">16</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">17</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;line-height:1.25;padding:3px;">18<br /><span style="font-size:10px;font-weight:700;color:#b45309;">结束</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">19</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">20</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">21</td>
</tr>
</table>
<p style="font-size: 12px; margin: 8px 0 0; color: #6e6e73;">橙色为 **10～18** 沿线连续九格；其中 **12～16** 不在左图矩形内。</p>
</div>
</div>
</div>

**和默认选区在 API 上的差别**：平常拖蓝或 **`setBaseAndExtent`**，规范化后 **起始位置→结束位置** 仍是 **一段连续带**；命令与查询若只认这一段，会默认「从起点到终点之间都算选中」。框选矩形时，你真正需要的是 **多个单元格正文插槽里各一小段**；用默认选区去读 **`getRanges()`**，往往只会得到 **一长段**，与 **每个格里要高亮、要参与加粗/删除的那几截** 对不上。**在表格（或其它复合块）的实现里**，一般会通过 **`setSelectedRanges`** 或 **`onGetRanges`** 之一（或两者配合），按 UI 用多段 **`SlotRange`** **设置选区**；这样 **`getRanges()`** 等会按 **多段** 回报，而不是只能落在 **从锚点沿文档流走到焦点** 的那 **一整段连续范围** 上。

下面假定 **`slotA`、`slotB`** 已是两个 **不同单元格** 里的正文插槽（具体怎么从表格组件上取到它们，由表格实现决定），要把 **两段** 同时算作选中：

```ts
selection.setSelectedRanges([
  { slot: slotA, startIndex: 0, endIndex: slotA.length },
  { slot: slotB, startIndex: 2, endIndex: 7 },
])
```

取消这类多段登记、回到无选区：

```ts
selection.setSelectedRanges([])
```

## 路径：`getPaths` 与 `usePaths`

编辑器里一个 **落点**（在哪个插槽、第几个偏移）可以编成一串 **数字**：从 **根组件** 往下走，在 **「父级里第几个子插槽」** 和 **「当前插槽里第几个子（组件或字符串）」** 之间交替，直到锁定 **目标插槽**；这串数字后面再 **多一位**，表示 **该插槽内的偏移**，和 **`setBaseAndExtent`** 里用的偏移是同一套刻度。

成对的 **`anchor` / `focus`** 路径打包成 **`SelectionPaths`**，用来完整描述 **拖蓝的两头**（仍是 **锚点**、**焦点**，**不是** 文档流规范化后的 **起始位置 / 结束位置**）。

### `getPaths`

用来 **把当前选区读成可序列化的纯数据**。没有选区时，**`anchor`**、**`focus`** 各是 **空数组**；有选区时，每一条都是 **「从根到插槽」的下标序列，最后一位是插槽内偏移**。

```ts
const paths = selection.getPaths()
// paths.anchor / paths.focus：最后一项为插槽内偏移，前面各项从根定位到该插槽
```

### `usePaths`

用来 **按保存下来的路径重新设拖蓝**：把 **`paths.anchor`**、**`paths.focus`** 各自还原成 **插槽 + 偏移**，再内部调用 **`setBaseAndExtent`**。若 **任一端** 根据当前树 **还原失败**，**整次调用不会改选区**。

```ts
selection.usePaths(paths)
```

### `getPathsBySlot`

手里已经握着 **`Slot` 引用** 时，若只想知道 **它在整篇文档里的插槽路径（不含偏移）**、还 **没决定光标在该插槽第几位**，可以用它只取 **「根 → 该插槽」** 这一段，**结果里不含插槽内偏移**。插槽不在当前根子树等情况下会得到 **`null`**。

```ts
const slotOnly = selection.getPathsBySlot(someSlot)
```

### `findSlotByPaths` 与 `findComponentByPaths`

这是 **从数字往回找节点**：入参是 **只描述「走到哪一插槽」** 的下标序列，**不要** 带上 **`getPaths()`** 里那种 **最后一位偏移**。**`findSlotByPaths`** 若一路能走通且终点是 **插槽**，就返回该 **`Slot`**；**`findComponentByPaths`** 在 **空数组** 时返回 **根组件**，非空时若终点是 **组件** 则返回该 **`Component`**，若终点落在 **插槽** 上则返回 **`null`**，和前者 **互补**。

这两个查找方法会 **原地消费传入的数组**（内部 **`shift`**），若你还要留着原来的 **`paths`**，**请先 `[...paths]` 再传进去**。

```ts
const copy = [...(slotOnly ?? [])]
const slotAgain = selection.findSlotByPaths(copy)

const root = selection.findComponentByPaths([])
```

## 和浏览器蓝条同步

平台接入浏览器后，内核里的锚点、焦点可以映射成页面上的 **原生拖蓝**。是否跟随由 **`nativeSelectionDelegate`** 控制；就绪流程里通常会把它设为 **`true`**。

### `nativeSelectionDelegate`

为 **`true`** 时，文档选区与页面拖蓝联动；为 **`false`** 时断开与 **`@textbus/platform-browser`** 的选区桥接，**内核不再向页面同步选区**。需要在代码里临时关掉同步时再设 **`false`**。

```ts
selection.nativeSelectionDelegate = true
```

### `restore`

把内核中的 **抽象选区** **立刻同步** 到页面的 **原生选区**（拖蓝）。

```ts
selection.setPosition(slot, offset)
selection.restore()
```

## 跨块分解与祖先视角

下列接口在 **表格、嵌套块、插件** 里常用来 **按块遍历**、**在祖先节点坐标系里换算选区**，或 **在不改当前选区的前提下试算下一格位置**。

### `getBlocks` 与 `getGreedyRanges`

**`getGreedyRanges()`** 先把当前选区两端在 **行内方向** 扩到允许的最大范围（**不会** 把整块块级子节点从中间切开），再得到若干 **`SlotRange`**。**`getBlocks()`** 在此基础上继续 **按块分解**，返回的每一项仍是 **`{ slot, startIndex, endIndex }`**，适合 **逐块** 处理。

```ts
const greedy = selection.getGreedyRanges()
const blocks = selection.getBlocks()
```

### `getCommonAncestorSlotScope` 与 `getSlotRangeInCommonAncestorComponent`

**`getCommonAncestorSlotScope()`** 在 **公共祖先插槽** 视角下，给出选区两端对应的 **子插槽**、子组件及在祖先里的 **下标范围**（用于精细几何或自定义绘制）。**`getSlotRangeInCommonAncestorComponent()`** 则在 **公共祖先组件** 下，给出选区跨越 **从第几个子插槽到第几个**（**`endOffset` 为半开区间上界**）。无公共祖先或当前无选区时可能为 **`null`**。

```ts
const scope = selection.getCommonAncestorSlotScope()
const slotSpan = selection.getSlotRangeInCommonAncestorComponent()
```

### `getNextPositionByPosition` / `getPreviousPositionByPosition`

给定任意 **插槽 + 偏移**，返回 **下一个 / 上一个** 合法光标位置（**`SelectionPosition`**：`slot` + `offset`），**不修改** 当前选区。

```ts
const next = selection.getNextPositionByPosition(slot, offset)
const prev = selection.getPreviousPositionByPosition(slot, offset)
```

### `findFirstPosition` / `findLastPosition`

在 **`slot` 子树** 内查找 **第一个 / 最后一个** 可落光标的深度位置；第二参数 **`toChild`** 为 **`true`**（默认）时会 **钻进子组件** 的最深插槽。

```ts
const first = selection.findFirstPosition(slot)
const last = selection.findLastPosition(slot, true)
```

## `Selection` 静态方法

**不依赖当前选区**：只要手里有一对 **`startSlot` / `startOffset` / `endSlot` / `endOffset`**，可用 **`Selection.getCommonAncestorSlot`**、**`Selection.getCommonAncestorComponent`**、**`Selection.getSelectedScopes`**、**`Selection.getScopes`** 等与实例方法相同的分解逻辑。入参为 **`Range`** 形状的对象。

```ts
import { Selection } from '@textbus/core'

const ancestorSlot = Selection.getCommonAncestorSlot(startSlot, endSlot)

const scopes = Selection.getSelectedScopes(
  { startSlot, startOffset, endSlot, endOffset },
  false,
)
```

## 销毁

**`destroy()`** 取消 **`onChange`** 相关订阅；**`Textbus` / 编辑器销毁** 时应随生命周期调用，避免泄漏。与 **单个组件** 的 **`onDetach`** 等区别见 [组件事件与生命周期](./component-events-and-lifecycle)。

## 常见问题

- **代码里设好了光标，页面上没蓝条**：确认 **`nativeSelectionDelegate`** 已开启；改选区后调用 **`restore()`**，使页面拖蓝与之一致。
- **`restore()` 与「有没有选区」**：内核侧 **没有选区** 时，**`restore()`** 会 **清除** 页面上的原生拖蓝（仍须 **`nativeSelectionDelegate`** 为 **`true`**）。
- **`restore(fromLocal)`**：无参等价于 **`restore(true)`**。**`fromLocal`** 表示 **本次选区变更是否由本地文档变更引起**：内核用它区分 **本地** 与 **远程协作** 导致的选区更新。**绝大多数场景**里，选区会随文档改动（无论是本地还是协作）**自动**与内核、页面拖蓝对齐，**不必**手写 **`restore(fromLocal)`**。只有碰到 **少数不走常规编辑管线** 的情况时，才需要自己调用 **`restore`**，并按接入协作时的约定传入 **`true`** / **`false`**；单机编辑一般用无参 **`restore()`** 即可。
- **只读时怎么都不动**：会改变选区的方法在只读下不生效；**`restore`** 也同样不会产生可见变化（见上文 **「设光标、设拖蓝」**）。
- **`toNextLine` 没反应**：当前环境 **算不出「下一行」在页面上的位置**（例如未接入浏览器排版）时，选区会保持不动。

## 接下来

- [状态查询与基础操作](./operations-and-query)  
- **组件钩子**：[组件事件与生命周期](./component-events-and-lifecycle)  
- **快捷键与按键绑定**：[快捷键和语法糖](./shortcuts-and-grammar)  
- **浏览器与选区桥接**：[浏览器平台层](./platform-browser)  
- **名词与数据模型**：[核心概念](./concepts)
