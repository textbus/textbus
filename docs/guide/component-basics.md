# 组件基础

在 [快速开始](./getting-started) 里，我们已经用 **根组件** 和 **段落** 摸清了 Textbus 里「一块内容对应一个块级组件」的基本形态。实际业务里，文档往往不只有纯文字编辑：**组件本身要带状态**，才能把交互写进文档模型。典型例子是 **待办事项**——每一项都要有「是否完成」的状态；下面我们就以 **Todolist** 为例，学习如何用 **组件的数据模型（`state`）** 驱动界面（例如勾选框），并在 **换行** 时维护文档结构。

下面可在站内编辑源码，并切换到「预览」查看运行效果（打开 **`components/todolist.component.tsx`** 可对照下文讲解）。

<TextbusPlayground preset="component-basics" />

上文里你已经能看到 **Todolist** 的完整写法以及在预览里的交互（勾选、回车拆条、空条退回段落）。这些改动都会记入 Textbus 的 **History**，预览里同样支持 **撤销 / 重做**（详见 [历史](./history)）。下面结合源码细读实现要点。

---

## 一、静态属性与方法（写在类上的配置）

这类成员挂在 **`TodolistComponent` 类**上，描述「编辑器如何认出这类块」以及「如何从 JSON 还原」，与某一个运行中的实例无关。

### `componentName` 与 `type`

```ts
// 当前 Textbus 实例内全局唯一：适配器组件表、fromJSON、注册表与调试
static componentName = 'Todolist'
// 块级：在父 Slot 里占独立一格，可与段落等待办并排
static type = ContentType.BlockComponent
```

- **`componentName`**：在当前 **`Textbus`** 实例内 **全局唯一** 的字符串 id。适配器用 **`[TodolistComponent.componentName]: TodolistView`** 映射视图；**`fromJSON`**、注册表按名称实例化块等也会用到它；调试时也常据此区分组件类型。
- **`type: ContentType.BlockComponent`**：标明这是 **块级组件**，在父 **`Slot`** 里占 **独立一格**，可与 **`ParagraphComponent`**、其它 Todolist **并排**（参见沙箱 **`App.tsx`** 里对根 **`slot`** 的多次 **`insert`**）。

### `fromJSON`：字面量还原成运行时实例

```ts
static fromJSON(textbus: Textbus, data: ComponentStateLiteral<TodolistState>) {
  // 字面量里的 slot 须先经 Registry 还原为运行时 Slot（含 schema）
  const slot = textbus.get(Registry).createSlot(data.slot)
  return new TodolistComponent({ checked: !!data.checked, slot })
}
```

序列化层给出的是 **`ComponentStateLiteral`** 形态的字面量；其中的 **`slot`** 字段还不能直接当作运行时 **`Slot`** 使用。**`Registry.createSlot`** 会在当前注册表与 schema 规则下把它还原成文档树里的 **`Slot`**，再交给 **`new TodolistComponent({ … })`**。若 **`TodolistComponent`** 未写入 **`new Textbus({ components: [...] })`**，还原时内核找不到对应组件定义，会报错。

---

## 二、实例数据与实例方法（每个块各自的一份）

每个插在文档里的 Todolist **实例**都有自己的 **`state`**，以及告诉内核「我暴露哪些插槽」的 **`getSlots()`**。

### `state`：`TodolistState`（`checked` 与 `slot`）

沙箱 **`todolist.component.tsx`** 里 **`TodolistState`** 描述这份实例持久化时要带上场的两件事：

- **`checked`**：是否完成；视图里 **`input`** 的 **`checked`** 与它绑定。
- **`slot`**：正文 **`Slot`**，示例里 schema 为 **`ContentType.Text`**，与段落一致，插槽内走文本流（格式能力可在后续章节再扩展）。

运行时类型是 **`Component<TodolistState>`**，当前实例上的文档状态即 **`component.state`**。勾选框用 **`onChange`**，把 **`(e.target as HTMLInputElement).checked`** 写回 **`c.state.checked`**，与原生勾选行为一致。对组件 **`state`** 与插槽内容的修改都会纳入 Textbus 的 **`History`**，可按编辑器配置做撤销与重做（参见 [历史](./history)）。

### `getSlots()`：向内核声明「文档里有哪些子插槽」

```ts
// 列出所有子插槽，顺序须与文档中的渲染顺序一致（选区与子插槽遍历等依赖）
override getSlots(): Slot[] {
  return [this.state.slot]
}
```

**选区**与对部分文档树结构的遍历，都会依赖 **`getSlots()`** 所声明的「块下面有哪些 **`Slot`**」。Todolist 只有一个正文插槽，因此返回单元素数组；若以后拆成「标题插槽 + 正文插槽」，须按它们在 **文档中渲染的先后顺序** 在 **`getSlots()`** 里 **全部列出**，内核才能一致地对待它们。**`Slot`** 自身的 **`schema`、插入与剪切**等见 [插槽](./slot)。

多插槽块的 **`separate`**、**`removeSlot`**、**`deleteAsWhole`** 等可选能力与 **`transform`** / **`paste`** 的协作说明见 [组件高级](./component-advanced)。

---

## 三、`setup`：块内的生命周期与「换行」语义

**`setup`** 在块挂载进文档树后执行，适合做事件订阅。**常用钩子一览、`preventDefault` 语义及与其它命令的关系**见 [组件事件与生命周期](./component-events-and-lifecycle)。下面节选 **`TodolistComponent`** 中与 **`onBreak`** 相关的部分（完整 **`import`** 见沙箱 **`components/todolist.component.tsx`**）：

```tsx
override setup() {
  const commander = useContext(Commander) // 插入/替换块级节点等
  const selection = useContext(Selection) // 换行后移动光标

  onBreak(ev => {
    ev.preventDefault() // 换行不走内核默认行为，由下列分支定义
    const slot = ev.target // 触发换行的插槽，此处即正文插槽

    // 正文为空时回车：用段落替换当前待办
    if (slot.isEmpty) {
      const body = new Slot([ContentType.Text])
      const p = new ParagraphComponent({ slot: body })
      commander.replaceComponent(this, p)
      selection.setPosition(body, 0)
      return
    }

    // 非空：截断后半段，插入新 Todolist，勾选与当前条一致
    const nextSlot = slot.cut(ev.data.index)
    const next = new TodolistComponent({
      checked: this.state.checked,
      slot: nextSlot,
    })
    commander.insertAfter(next, this)
    selection.setPosition(nextSlot, 0)
  })
}
```

**`Commander`** 负责改文档结构，**`Selection`** 负责事后把光标落到合适位置。 **`ev.preventDefault()`** 表示换行不走内核默认行为，后面的分支才是本组件定义的语义。

- **`slot.isEmpty`** 时：**`replaceComponent(this, p)`** 把当前待办整块换成空 **`ParagraphComponent`**，光标进新段落插槽，避免空待办壳一直占着块级位。
- 否则：**`slot.cut(ev.data.index)`** 从光标处切开，后半段 **`nextSlot`** 装进 **`new TodolistComponent`**，**`insertAfter`** 插在 **`this`** 后面，新条 **`checked`** 与 **`this.state.checked`** 一致。

同预设里的 **`ParagraphComponent`** 只做「切开 + 新段落」，可作对照（节选）：

```tsx
override setup() {
  const commander = useContext(Commander)
  const selection = useContext(Selection)

  onBreak(ev => {
    ev.preventDefault()
    const nextContent = ev.target.cut(ev.data.index) // 光标后内容 → 新段正文插槽
    const p = new ParagraphComponent({ slot: nextContent })
    commander.insertAfter(p, this) // 回车：当前段之后插入新段落
    selection.setPosition(nextContent, 0)
  })
}
```

这里没有 **`replaceComponent`**：段落回车始终是「下一段还是段落」。

---

## 四、视图：`TodolistView`（DOM 长什么样）

视图是 Viewfly 函数组件；**`props.component`** 即内核侧的 **`TodolistComponent`** 实例，**`props.rootRef`** 必须挂在 **视图根 DOM** 上，供适配器对齐文档块与 DOM。

```tsx
export function TodolistView(props: ViewComponentProps<TodolistComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const c = props.component
    const slot = c.state.slot
    return (
      /* 根节点必须挂 rootRef，适配器才能把文档块与 DOM 对齐 */
      <div
        ref={props.rootRef}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '0.35em 0' }}
      >
        {/* 壳层 UI：勾选状态写入 state，参与 History */}
        <input
          type="checkbox"
          checked={c.state.checked}
          onChange={(e: Event) => {
            c.state.checked = (e.target as HTMLInputElement).checked
          }}
          style={{ marginTop: '2px' }}
        />
        {/* 插槽内子树由内核算出 children，须 createVNode 包一层再放入 Viewfly */}
        {adapter.slotRender(slot, children =>
          createVNode('div', { style: { flex: '1', minWidth: 0 } }, children),
        )}
      </div>
    )
  }
}
```

- 最外层 **`div`** 上的 **`ref={props.rootRef}`**：适配器用它来绑定这一块的可编辑根节点。
- **`input[type=checkbox]`**：壳层 UI，**`checked`** / **`onChange`** 与 **`c.state.checked`** 同步，勾选写入 **`state`** 后仍走 Textbus 的历史等机制。
- **`adapter.slotRender(slot, …)`**：插槽内文档树由内核算子节点；回调里拿到的 **`children`** 须用 **`createVNode('div', …, children)`** 包一层再放进 Viewfly 树，不能像普通 JSX 那样直接把 **`children`** 当兄弟节点拼进去。

---

## 接入编辑器：`App.tsx` 里要补的三件事

把 Todolist 接到 **`ViewflyAdapter`**、**`Textbus`** 配置和初始文档里，下面节选与三项工作对应（完整文件见沙箱 **`App.tsx`**）：

```tsx
// 内核组件名 → Viewfly 视图；第二个参数负责挂载/卸载 Viewfly 子应用
const adapter = new ViewflyAdapter(
  {
    [RootComponent.componentName]: RootComponentView,
    [ParagraphComponent.componentName]: ParagraphComponentView,
    [TodolistComponent.componentName]: TodolistView,
  },
  (mountHost, root, context) => {
    const vf = createApp(root, { context })
    vf.mount(mountHost)
    return () => vf.destroy()
  },
)

// components：内核可识别的块类型；imports：浏览器渲染与输入等模块
const editor = new Textbus({
  components: [RootComponent, ParagraphComponent, TodolistComponent],
  imports: [browserModule],
})

// 根块持有「只接受块级子节点」的插槽，再往 rootSlot insert 各 BlockComponent
const docRoot = new RootComponent({
  slot: new Slot([ContentType.BlockComponent]),
})
const rootSlot = docRoot.state.slot
// rootSlot.insert(new TodolistComponent({ … })); rootSlot.insert(new ParagraphComponent({ … }))
```

1. **适配器组件表**：**`[TodolistComponent.componentName]: TodolistView`**，与 **`ParagraphComponent`**、根组件并列。
2. **`Textbus({ components: [...] })`**：把 **`TodolistComponent`** 注册进内核，**`fromJSON` / 粘贴** 等才能找到类型定义。
3. **初始文档里的 `insert`**：演示块级插槽里 **`TodolistComponent`** 与普通 **`ParagraphComponent`** 混排；日常也可由 **`RootComponent`** 的 **`onContentInsert`** 等逻辑插入（沙箱根组件仍会把手敲的非块内容收成段落；钩子索引见 [组件事件与生命周期](./component-events-and-lifecycle)）。

## 常见问题

- **`fromJSON` / 粘贴报错**：确认 **`TodolistComponent`** 已在 **`components`** 数组中注册。

正文 **粗体 / 字号**、**块级对齐** 见 [文字样式](./text-styles)、[块级样式](./block-styles)。

## 接下来

- [组件事件与生命周期](./component-events-and-lifecycle)  
- [组件高级](./component-advanced)（**`separate`**、**`removeSlot`** 等，写多插槽块时查阅）  
- [文字样式](./text-styles)  
- [块级样式](./block-styles)  
- [核心概念](./concepts)
