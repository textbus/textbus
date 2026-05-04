# 组件事件与生命周期

富文本里许多行为并不是「调一次 **`Commander`** 就结束」：内核在 **改插槽、换行、粘贴、应用格式** 等路径上，会沿着 **组件树** 向相关 **`Component`** 派发 **钩子**（在源码里多命名为 **`onXxx`**）。你在 **`setup`** 里用 **`onContentInsert`**、**`onBreak`** 等函数注册监听后，就能 **改写默认流程** 或 **接入业务逻辑**。本篇列出常用钩子分组与 **`Event`** 上的 **`preventDefault`** 语义；**快捷键绑定**仍见 [快捷键和语法糖](./shortcuts-and-grammar)。

阅读本篇前建议已读过 [组件基础](./component-basics)（含 **`setup`** 示例）与 [状态查询与基础操作](./operations-and-query)（**`Commander`** 如何触发这些钩子）。

---

## `setup` 何时执行

在 **`Textbus`** 完成 **`render`** 时会先对 **根组件** 做一次 **`setup`**：调用组件可选实现的 **`setup()`**，再 **递归** 对子组件执行相同流程，保证树上节点在进入编辑交互前都已挂上监听。

钩子注册函数（例如 **`onBreak`**）只能在当前组件 **`setup`** 的执行栈内调用：它们会把回调记入该组件的 **`EventCache`**，供内核后续 **`invokeListener`**。

组件还可选实现 **`getSlots()`**、**`removeSlot()`**、**`separate()`** 等，与换行、删除、拆分结构配合使用；说明见 [组件高级](./component-advanced)，名词见 [核心概念](./concepts)。

---

## `Event` 与 **`preventDefault`**

钩子回调收到的 **`event`** 可 **`preventDefault()`**：表示 **拦截内核在这条路径上的默认后续步骤**。例如 **`Commander.break()`** 在非折叠删除选中后，若父组件对 **`onBreak`** 发出的 **`Event`** 未被阻止，才会继续默认的 **`write`** 换行（详见 [状态查询与基础操作](./operations-and-query) 中的 **`break`** 小节）。

若 **`event.isPrevented`** 已为 **`true`**，对应 **`Commander`** 方法常返回 **`false`** 或中止管线——调试「命令不生效」时，宜同时检查业务钩子里是否误 **`preventDefault`**。

---

## 插槽内容：插入与删除

与 **`Slot`** 内 **增删内容** 相关的一对钩子：

| 钩子 | 时机简述 |
| --- | --- |
| **`onContentInsert`** | 插入 **即将发生**；可 **`preventDefault`** 阻止本次插入。载荷含 **`index`、`content`、`formats`**（见 **`InsertEventData`**）。 |
| **`onContentInserted`** | 插入 **已完成**；多用于观测或二次处理。 |
| **`onContentDelete`** | 删除 **即将发生**；可阻止。载荷含位置、长度、方向 **`toEnd`**、**`actionType`**（**`'delete'`** 或 **`'move'`**）等（见 **`DeleteEventData`**）。 |
| **`onContentDeleted`** | 删除 **已完成**。 |

根组件或块级组件常在此接管「手敲内容如何收成段落」等策略（示例用语见 [组件基础](./component-basics) 中的 **`onContentInsert`**）。

---

## 换行与粘贴

| 钩子 | 时机简述 |
| --- | --- |
| **`onBreak`** | 用户在插槽内触发 **回车语义**；载荷 **`BreakEventData`** 含触发位置 **`index`**。自定义列表项、待办拆条等多在此处 **`preventDefault`** 后自行 **`cut` / `insertAfter`**。示例见 [组件基础](./component-basics)。 |
| **`onPaste`** | **`Commander.paste`** 向 **当前选区的公共祖先组件** 派发；载荷含结构化 **`data`**（**`Slot`**）与 **`text`**。阻止后可完全自定义粘贴结果（与 [状态查询与基础操作](./operations-and-query) 中的 **`paste`** 一节对照阅读）。 |

---

## 格式与属性写入前的校验

| 钩子 | 时机简述 |
| --- | --- |
| **`onSlotApplyFormat`** | **`Commander.applyFormat`** 在写入格式前，于 **承载插槽的父组件** 上触发；可阻止本次应用。**`Formatter`** 与 **`value`** 见 **`SlotApplyFormatEventData`**。 |
| **`onSlotSetAttribute`** | **`slot.setAttribute`** / **`Commander.applyAttribute`** 等路径上触发；可阻止。**`Attribute`** 与 **`value`** 见 **`SlotSetAttributeEventData`**。 |

与 **`applyAttribute`** 在折叠 / 展开选区下的分支说明见 [块级样式](./block-styles)。

---

## 选区与焦点相关（节选）

下列钩子用于 **选中整块组件**、**焦点进出**、**从一侧进入组件** 等交互；在 **`toNext` / `toPrevious`** 等移动选区时，组件也可在自身监听里 **`preventDefault`** 拦截本次穿越（细节配合 [选区](./selection)）：

**`onSelected`**、**`onUnselect`**、**`onSelectionFromFront`**、**`onSelectionFromEnd`**、**`onGetRanges`**、**`onFocus`**、**`onBlur`**、**`onFocusIn`**、**`onFocusOut`**。

---

## 输入法、右键菜单与其它

- **`onCompositionStart`**、**`onCompositionUpdate`**、**`onCompositionEnd`**：组合输入（如中文 IME）在插槽内的阶段回调。
- **`onContextMenu`**：右键菜单组装（与 **`triggerContextMenu`** 协作）。
- **`onParentSlotUpdated`**：父插槽数据更新通知。
- **`onDetach`**：组件从模型上 **剥离** 时触发； **`invokeListener`** 处理 **`onDetach`** 后会自 **`EventCache`** 中移除该组件缓存。

---

## 与 **`Selection.destroy`** 的区别

**`Selection.destroy()`** 取消选区对象的 **`onChange`** 等订阅，用于 **`Textbus` 生命周期末尾** 防止泄漏（见 [选区](./selection) **「销毁」**）。它描述的是 **选区服务本身**，不是单个 **`Component`** 的 **`onDetach`**；二者常在同一卸载流程里先后出现。

---

## 接下来

- **动手示例**：[组件基础](./component-basics)（**`onBreak`**）、[快速开始](./getting-started)（段落默认换行）  
- **命令如何触发钩子**：[状态查询与基础操作](./operations-and-query)  
- **多插槽拆分与删除语义**：[组件高级](./component-advanced)  
- **按键绑定**：[快捷键和语法糖](./shortcuts-and-grammar)  
- **名词总览**：[核心概念](./concepts)
