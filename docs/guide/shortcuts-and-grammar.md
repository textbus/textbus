# 快捷键和语法糖

**快捷键**由 **`Keyboard`** 统一管理：**`addShortcut`** 注册全局快捷键；组件 **`setup`** 里可用 **`useDynamicShortcut`** 把快捷键挂到当前块实例。**语法糖（Zen Coding）** 在用户输入简短前缀并以特定键结束时，可把当前结构换成另一种块类型；由 **`TextbusConfig.zenCoding`** 总开关、组件类上的 **`static zenCoding`**（下文以 **Todolist** 讲透），以及可选的 **`addZenCodingInterceptor`** 组成。父插槽 **`schema`**、多插槽边界见 [组件高级](./component-advanced)。

阅读本篇前请已跑通 [快速开始](./getting-started)，并了解 **`Commander`**、**`Selection`**（[状态查询与基础操作](./operations-and-query)、[选区](./selection)）。下文 **`editor`** 表示已 **`render`** 的 **`Textbus`** 实例。


## 取得 `Keyboard`

```ts
import { Keyboard } from '@textbus/core'

const keyboard = editor.get(Keyboard)
```


## `Shortcut` 与 `Keymap`

**`Shortcut`**（**`@textbus/core`** 导出）包含 **`keymap`** 与 **`action`**：

- **`keymap`**：**`Keymap`**
  - **`key`**：**`string`**、**`string[]`**，或 **`Key`**（含 **`match`**、**`name`**，用于更复杂的键位匹配）。
  - **`modKey`**、**`shiftKey`**、**`altKey`**：可选；未写视为 **`false`**。**`modKey`** 在桌面环境通常对应 **Ctrl**（Windows / Linux）或 **Command**（macOS），具体以当前平台层为准（见 [浏览器模块](./platform-browser)）。
- **`action`**：**`(key: string) => boolean | void`**。返回 **`false`** 时表示不视为已处理，键盘逻辑可能继续尝试其它快捷键。

下列 **`interface`** 与 **`@textbus/core`** 导出类型一致（摘录自类型定义，便于一眼看清字段）：

```ts
interface RawKeyAgent {
  key: string
  code: string
  keyCode: number
}

interface Key {
  match: RegExp | ((key: string, agent: RawKeyAgent) => boolean)
  name: string | string[]
}

interface Keymap {
  modKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  key: string | string[] | Key
}

interface Shortcut {
  keymap: Keymap
  action(key: string): boolean | void
}
```


## `keyboard.addShortcut(shortcut)`

**作用**：注册一条**全局**快捷键（相对当前选区公共祖先组件上的快捷键，后注册者优先）。

**返回值**：**`{ remove: () => void }`**，用于卸载本条注册。

```ts
const off = keyboard.addShortcut({
  keymap: {
    key: 'd',
    modKey: true,
  },
  action() {
    // 调用 Commander / Selection 等
  },
})

off.remove()
```


## 组件内快捷键：`useDynamicShortcut`

**作用**：仅在组件 **`setup`** 中调用；把 **`Shortcut`** 推入**当前组件实例**的 **`shortcutList`**。选区有效且公共祖先块为当前组件时，会先尝试这些快捷键，再尝试 **`addShortcut`** 注册的全局快捷键；同一列表内按 **后注册先匹配**：遍历顺序为注册顺序的逆序。

```ts
import { useDynamicShortcut } from '@textbus/core'

override setup() {
  useDynamicShortcut({
    keymap: { key: 'Enter', shiftKey: true },
    action(key) {
      void key
      // ...
    },
  })
}
```


## 默认快捷键（参考）

在未额外覆盖的前提下，**`Textbus`** 会为 **`Keyboard`** 注册一组默认行为（**`modKey`** 含义见上文）：

| 按键 | 行为概要 |
| --- | --- |
| **Mod+S** | 触发 **`editor`** 的保存通知（**`onSave`**） |
| **Enter** | **`commander.break()`**（换行语义由当前块组件等决定） |
| **Delete** / **Backspace** | **`commander.delete(...)`** |
| **方向键** | 移动光标（**`selection.toPrevious`** / **`toNext`** / **`toPreviousLine`** / **`toNextLine`**） |
| **Shift + 方向键** | 扩展选区（**`selection.wrapTo*`** 系列） |
| **Tab** | 插入四个空格 **`'    '`** |
| **Mod+A** | 全选 |
| **Mod+C** | 复制 |
| **Mod+X** | 剪切 |
| **Mod+Z** | 撤销（**`History`**，见 [历史记录](./history)） |
| **Mod+Shift+Z** / **Mod+Y** | 重做 |

自定义或冲突时，可用 **`addShortcut`** 追加逻辑，或在 **`action`** 中返回 **`false`** 放弃本条匹配。


## 语法糖总开关：`TextbusConfig.zenCoding`

**类型**：`boolean | undefined`

**作用**：为 **`true`** 时，才会在用户输入过程中尝试 **Zen Coding** 拦截（组件静态 **`zenCoding`** 与 **`addZenCodingInterceptor`** 注册的规则）；未开启则相关规则不生效。

```ts
const editor = new Textbus({
  zenCoding: true,
  // ...
})
```


## 组件类静态属性：`zenCoding`

在 **组件类**上声明 **`static zenCoding`**：**`ZenCodingGrammarInterceptor<ComponentState>`** 单条，或该类型的**数组**（类型由 **`@textbus/core`** 导出）。启用 **`TextbusConfig.zenCoding`** 后，**`Keyboard`** 会在启动时从 **`new Textbus({ components: [...] })`** 已注册的组件类上读取这些配置。

下面三个字段共同描述一条规则：**先**检查本次按键是不是 **`key`**，**再**用 **`match`** 看插槽里已有正文；都通过则调用 **`createState`** 得到 **`state`**，并 **`new` 当前组件类** 完成替换。**`RawKeyAgent`** 描述本次按键事件，常见字段含 **`key`**、**`code`** 等。

### `match`

判断 **触发键按下之前**、插槽内当前文本是否符合你的前缀（或任意自定义条件）。可用 **`RegExp`**（整段插槽内文本参与匹配），或 **`(content: string, textbus: Textbus) => boolean`**；函数里可通过 **`textbus`** 访问 **`Registry`** 等。此处用到的 **`content`** 与 **`createState`** 的第一个参数同源。

### `key`

指定 **哪一颗键** 触发替换：可为 **`string`**、**`string[]`**（任一命中即可）、**`RegExp`**，或 **`(key: string, agent: RawKeyAgent) => boolean`**。**`RawKeyAgent`** 携带 **`key`**、**`code`** 等，便于与浏览器键盘事件对齐。

### `createState`

**`(content: string, textbus: Textbus) => ComponentState`**：返回 **`new` 当前组件类** 所需的初始 **`state`**。**`content`** 仍为触发前插槽内文本；**`textbus`** 用于 **`textbus.get(Registry)`**、构造 **`Slot`** 等与编辑器交互的操作。

多条规则时把 **`static zenCoding`** 设为 **`ZenCodingGrammarInterceptor`** 的 **数组**；字段形态与下文 **Todolist** 沙箱中的 **`static zenCoding`** 一致。

### 示例：**`TodolistComponent`**（与 [组件基础](./component-basics) 同源）

待办块 **`Todolist`** 为 **`ContentType.BlockComponent`**，**`state`** 含 **`checked`** 与正文 **`Slot`**（正文 **`schema` 为 `ContentType.Text`**，与组件基础一致）。在类上挂 **`static zenCoding`** 后：用户在 **普通段落** 正文里输入 **`-`**，再按 **空格**，**整条段落** 会变成一条 **空白待办**（未勾选、正文为空，光标随后进待办正文）。

**类上的配置（节选）**——完整文件见沙箱 **`todolist.component.tsx`**：

```ts
export class TodolistComponent extends Component<TodolistState> {
  static componentName = 'Todolist'
  static type = ContentType.BlockComponent

  static zenCoding = {
    match: /^-$/,
    key: ' ',
    createState(_content: string, _textbus: Textbus): TodolistState {
      const slot = new Slot([ContentType.Text])
      return { checked: false, slot }
    },
  }

  // … fromJSON、getSlots、setup 等与组件基础相同
}
```

**`match` + `key`：为何是 `/^-$/` 与空格**

流程是：**先**判断当前键是不是 **`key`**（空格），**再**读插槽里已有正文——**这一颗空格还没写进去**。因此按下空格时插槽内仍是 **`"-"`**，用 **`/^-$/`** 即可。

```ts
// 与上述时机一致：match 看到的是 "-"
static zenCoding = { match: /^-$/, key: ' ', /* … */ }

// 不推荐：/^-\s$/ 假设 "-" 与空格都已落在正文里，与「先按键、再 match」不符
```

**`createState`：给 `new TodolistComponent(...)` 凑初始 `state`**

下面返回「一条空待办」。若要把前缀写进正文，可解析参数 **`content`** 再 **`slot.insert(...)`**。

```ts
createState(content: string, _textbus: Textbus): TodolistState {
  const slot = new Slot([ContentType.Text])
  // 示例：横杠后的字符塞进正文
  // if (content.length > 1) slot.insert(content.slice(1))
  return { checked: false, slot }
}
```

**段落正文插槽 vs 块级待办**

段落内层是 **纯文本插槽**；**`Todolist`** 是 **块**，不能直接塞进该正文插槽。内核会 **选中整块段落 → 删除 → 在段落所在的父插槽**（本示例为根的 **`BlockComponent` 插槽**）**插入待办**，再把光标放进待办正文 **`Slot`**。父组件若为多插槽等复杂结构，可能走不通——见 [组件高级](./component-advanced)。

**总开关**：构造 **`Textbus`** 时必须 **`zenCoding: true`**，否则上面的 **`static zenCoding`** 不会参与：

```ts
const editor = new Textbus({
  zenCoding: true,
  components: [RootComponent, ParagraphComponent, TodolistComponent],
  imports: [browserModule],
})
```

下面沙箱已写好上述两项；初始为 **一条空段落**。操作：**点击正文 → 输入 `-` → 按空格**，应得到空白待办；需要时可配合 [历史记录](./history) 撤销 / 重做。

<TextbusPlayground preset="zen-coding-todolist" />

源码可在沙箱中打开 **`todolist.component.tsx`**（ **`static zenCoding`** ）、**`App.tsx`**（ **`zenCoding: true`** ）；**`ParagraphComponent`**、**`RootComponent`** 与 [组件基础](./component-basics) 预设一致。

更复杂的 **`schema`**、多插槽父组件等仍以 [组件高级](./component-advanced) 为准。


## `keyboard.addZenCodingInterceptor(interceptor)`

**作用**：运行时追加一条语法糖规则，不写在组件类上。**`interceptor`** 类型为 **`ZenCodingInterceptor`**（**`Keyboard`** 模块导出）：**`match(content)`**、**`try(key, agent)`**、**`action(content)`**（返回 **`boolean`**，表示是否已处理）。

**返回值**：**`{ remove: () => void }`**。

```ts
import type { Keyboard, ZenCodingInterceptor } from '@textbus/core'

declare const keyboard: Keyboard

const off = keyboard.addZenCodingInterceptor({
  match(content) {
    return content.length > 0
  },
  try(key) {
    return key === ' '
  },
  action(_content) {
    return true
  },
})

off.remove()
```


## `keyboard.execShortcut(keymapState)`

按 **`keymapState`** 尝试执行语法糖（**`zenCoding`** 开启时）与已注册的快捷键。

**参数 `KeymapState`**

- **`key`**：本次按键对应的键名（如 **`Enter`**、**`d`**），与快捷键配置里的 **`keymap.key`** 同一套语义。
- **`modKey`**：是否视为按下了「主修饰键」。常见写法：对应 Ctrl 时用 **`ev.ctrlKey`**，对应 Command 时用 **`ev.metaKey`**，以你的产品约定为准。
- **`altKey`**、**`shiftKey`**：是否与 **`KeyboardEvent.altKey` / `shiftKey`** 一致；须与 **`Shortcut.keymap`** 里可选的 **`altKey`**、**`shiftKey`** 布尔值对齐（配置里未写的视为 **`false`**）。
- **`agent`**：**`RawKeyAgent`**，包含 **`key`**、**`code`**、**`keyCode`**；当 **`keymap.key`** 为函数或正则时用其做精细判断。一般逐项填入 **`KeyboardEvent`** 上同名字段即可。

**返回值**：**`true`** 表示本轮已有快捷键或语法糖接手；**`false`** 表示没有匹配到或未执行。

```ts
import { Keyboard } from '@textbus/core'

const keyboard = editor.get(Keyboard)

// ev：keydown 的 KeyboardEvent
keyboard.execShortcut({
  key: ev.key,
  modKey: ev.ctrlKey,
  altKey: ev.altKey,
  shiftKey: ev.shiftKey,
  agent: {
    key: ev.key,
    code: ev.code,
    keyCode: ev.keyCode,
  },
})
```


## 常见问题

- **`action` 写了但没生效**：确认选区有效；组件快捷键依赖公共祖先是否为对应组件实例。
- **语法糖从不触发**：确认 **`zenCoding: true`**；确认 **`match`** 用的是「触发键按下 **前**」插槽内文本；可用上文 **Todolist** 沙箱对照。父插槽 **`schema`** / 多插槽见 [组件高级](./component-advanced)。

## 接下来

- **静态 `zenCoding` 与块结构**：[组件高级](./component-advanced)
- **钩子与输入**： [组件事件与生命周期](./component-events-and-lifecycle)
- **撤销 / 重做**：[历史记录](./history)
- **浏览器输入与桥接**：[浏览器模块](./platform-browser)
- **模块与配置合并**：[模块与扩展](./editor-and-modules)
