# 组件基础

在 [快速开始](./getting-started) 的根组件与段落之上，本篇加一个 **待办行**：左侧勾选，右侧正文插槽；回车拆出新的一行。顺带说明 Textbus 里两个常用事实：

1. **插槽上的 `schema`** 说明「这个槽里允许插入哪些类型的内容」（纯文本、块、行内控件等），内核按它校验插入与粘贴。  
2. **组件的视图** 决定这一块在页面上 **长成什么 DOM**（几个标签、怎么嵌套）。视图里用 **`adapter.slotRender`** 把槽里的内容嵌进去。

下面用两个小例子对照：**待办行**（多块并列）与 **表格**（一块里多个格）。

## 示例 A：待办行——文档里一块，视图里一圈外壳

**每条待办**在根插槽里是 **一个块级组件**，状态里两件事就够：

- **`checked`**：是否完成；  
- **`slot`**：正文，一般用 **`new Slot([ContentType.Text])`**，与段落一致。

**视图**负责把这 **一块**画成「勾选 + 正文」。常用写法是：**插槽以外的外壳**（例如 **`div`**、**`checkbox`**）用 **Viewfly JSX**；**`adapter.slotRender` 的第二个参数**里仍用 **`createVNode`** 包住内核生成的子节点（与格式树、虚拟节点类型一致）。**`rootRef`** 挂在外层 **`div`**，方便内核对齐选区。

用户在这条正文里 **回车**：和段落一样 **`onBreak`** 里 **`cut`** 出后半段 **`Slot`**，**`Commander.insertAfter`** 插一个新的 **`TodoRowComponent`**，光标移到新槽开头。

下面的代码即完整可用的 **`TodoRow`**（组件名可按项目改名）。

::: code-group

```tsx [src/components/todo-row.component.tsx]
import {
  Adapter,
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  createVNode,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf
} from '@textbus/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'

export interface TodoRowState {
  checked: boolean
  slot: Slot
}

export class TodoRowComponent extends Component<TodoRowState> {
  static componentName = 'TodoRow'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, data: ComponentStateLiteral<TodoRowState>) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new TodoRowComponent({
      checked: !!data.checked,
      slot
    })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    const self = useSelf()

    onBreak(ev => {
      ev.preventDefault()
      const nextSlot = ev.target.cut(ev.data.index)
      const next = new TodoRowComponent({
        checked: false,
        slot: nextSlot
      })
      commander.insertAfter(next, self)
      selection.setPosition(nextSlot, 0)
    })
  }
}

export function TodoRowView(props: ViewComponentProps<TodoRowComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const c = props.component
    return (
      <div
        ref={props.rootRef}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '0.35em 0' }}
      >
        <input
          type="checkbox"
          checked={c.state.checked}
          onClick={(e: MouseEvent) => {
            e.preventDefault()
            c.state.checked = !c.state.checked
          }}
        />
        {adapter.slotRender(c.state.slot, children =>
          createVNode('div', { style: { flex: '1', minWidth: 0 } }, children)
        )}
      </div>
    )
  }
}
```

```tsx [src/App.tsx 改动要点]
import { TodoRowComponent, TodoRowView } from './components/todo-row.component'

// ViewflyAdapter：[TodoRowComponent.componentName]: TodoRowView

// new Textbus({
//   components: [RootComponent, ParagraphComponent, TodoRowComponent],
//   ...
// })

const rootSlot = new Slot([ContentType.BlockComponent])

const firstSlot = new Slot([ContentType.Text])
firstSlot.insert('准备发布会材料')
rootSlot.insert(new TodoRowComponent({ checked: false, slot: firstSlot }))

const paraSlot = new Slot([ContentType.Text])
rootSlot.insert(new ParagraphComponent({ slot: paraSlot }))

const docRoot = new RootComponent({ slot: rootSlot })
void editor.render(docRoot)
```

:::

初始文档里插了一条待办和一段段落；在待办正文里回车会继续追加待办行。根组件仍然可以把「直接在根下打的字」收成段落，这和快速开始一致。

## 示例 B：表格——一块组件里多个槽，视图里一张 `<table>`

要做 **规整的行列**：在一个 **`TableComponent`** 的 **`state`** 里保存行、列（每个单元格一个 **`Slot`**），**`getSlots()`** 返回所有单元格槽，交给内核参与选区与历史。**视图**只写 **一个 `<table>`**：遍历行、列，在每个 **`td`** 里 **`slotRender(cell.slot, …)`**。整张表的 DOM 在这一层视图里就定下来了。

这是和「待办多行 = 多个并列块」并列的另一种建模方式：**复杂格子适合收进单组件 state；简单清单适合一行一块。** 两种都对，按产品选。

## 有序列表可以怎么做

思路与待办同一类：**每一列表项一个块级组件**，状态里 **`slot` 存该行正文**，视图里输出 **`ol` 或 `ul`**，里头 **`li` + 序号/符号 + `slotRender`**。多行就是父插槽里多个列表块并列；序号递增可以在 **`setup`** 或视图里读前后兄弟算出来。

## 注册与序列化

- **`componentName`**（上文 **`'TodoRow'`**）在编辑器里唯一。  
- **`type`** 为 **`ContentType.BlockComponent`**。  
- **`fromJSON`**：用 **`Registry.createSlot`** 还原 **`slot`**。

## 常见问题

- **`fromJSON` 失败**：检查 **`TodoRow`** 是否写在 **`new Textbus({ components: [...] })`** 里。  
- **根里一打字仍是段落**：符合快速开始根组件的行为；待办用初始 JSON、工具栏或命令插入 **`TodoRowComponent`** 即可。

正文上的 **加粗 / 字号**、**块级对齐** 见 [文字样式](./text-styles)、[块级样式](./block-styles)。

## 接下来

- **文字样式**：[文字样式](./text-styles)  
- **块级样式**：[块级样式](./block-styles)  
- **术语对照**：[核心概念](./concepts)
