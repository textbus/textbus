---
title: Component basics
description: Block components with state (Todolist), fromJSON, setup/onBreak, and views with slotRender.
---

# Component basics

In [Getting started](./getting-started), we used a **root** block and **paragraphs** to see how Textbus maps “one chunk of content → one block component.” Real documents are rarely plain typing only: **components need state** so interactions live in the document model. A classic example is **todos**—each row needs a **done / not done** flag. Below we use **Todolist** to learn how **`state`** drives the UI (e.g. checkboxes), how **Enter** shapes the document, and how structure stays consistent.

Use the playground below to edit source and switch to **Preview** (open **`components/todolist.component.tsx`** alongside this page).

<TextbusPlayground preset="component-basics" />

You should see the full **Todolist** implementation and preview interactions (toggle, Enter to split, empty row back to paragraph). Changes go through Textbus **History**; preview supports **undo / redo** (see [History](./history)). The sections below walk through the important pieces.

---

## 1. Static properties and methods (class-level config)

These live on the **`TodolistComponent` class**: how the editor recognizes the block type and how instances are rebuilt from JSON—not tied to one running instance.

### `componentName` and `type`

```ts
// Globally unique within this Textbus instance: adapter map, fromJSON, registry, debugging
static componentName = 'Todolist'
// Block: one slot cell in the parent Slot; can sit next to paragraphs and other todos
static type = ContentType.BlockComponent
```

- **`componentName`**: a **globally unique** string id inside this **`Textbus`** instance. The adapter maps **`[TodolistComponent.componentName]: TodolistView`**; **`fromJSON`**, the registry, and debugging use the same name.
- **`type: ContentType.BlockComponent`**: marks a **block component**—one **slot cell** in the parent **`Slot`**, alongside **`ParagraphComponent`** and other Todolist rows (see multiple **`insert`** calls on the root **`slot`** in the sandbox **`App.tsx`**).

### `fromJSON`: literals → runtime instances

```ts
static fromJSON(textbus: Textbus, data: ComponentStateLiteral<TodolistState>) {
  // The literal’s slot must be turned into a runtime Slot (with schema) via Registry
  const slot = textbus.get(Registry).createSlot(data.slot)
  return new TodolistComponent({ checked: !!data.checked, slot })
}
```

The serialization layer hands you **`ComponentStateLiteral`** data; the **`slot`** field is not yet a runtime **`Slot`.** **`Registry.createSlot`** restores it under the current registry and schema rules, then **`new TodolistComponent({ … })`** receives it. If **`TodolistComponent`** is missing from **`new Textbus({ components: [...] })`**, restore fails because the kernel cannot find the component definition.

---

## 2. Per-instance data and methods (one copy per block)

Each Todolist **instance** has its own **`state`**, plus **`getSlots()`** telling the kernel which slots this block exposes.

### `state`: `TodolistState` (`checked` and `slot`)

In the sandbox **`todolist.component.tsx`**, **`TodolistState`** carries what must persist for this instance:

- **`checked`**: done or not; the view binds **`input`** **`checked`** to this field.
- **`slot`**: body **`Slot`**; in the sample the schema is **`ContentType.Text`** (same as a paragraph)—text flow inside the slot; richer formats come in later chapters.

At runtime the instance is **`Component<TodolistState>`**; live document state is **`component.state`**. The checkbox uses **`onChange`** to write **`(e.target as HTMLInputElement).checked`** back to **`c.state.checked`**, matching native checkbox behavior. Edits to **`state`** and slot content participate in **`History`** and undo/redo per your editor config (see [History](./history)).

### `getSlots()`: declare “which child slots exist in the document”

```ts
// List every child slot, in the same order they render in the document
// (selection and subtree walks rely on this)
override getSlots(): Slot[] {
  return [this.state.slot]
}
```

**Selection** and walks over parts of the document tree use **`getSlots()`** to know which **`Slot`** children live under a block. Todolist has a single body slot, so the array has one entry; if you later split into “title slot + body slot”, list them in **render order** in **`getSlots()`** so the kernel stays consistent. **`Slot`** schema, insert, cut, etc. are covered in [Slot](./slot).

Optional multi-slot APIs (**`separate`**, **`removeSlot`**, **`deleteAsWhole`**) and how they work with **`transform`** / **`paste`** are in [Advanced components](./component-advanced).

---

## 3. `setup`: lifecycle inside the block and “Enter” semantics

**`setup`** runs after the block is mounted in the document tree—good place to subscribe. **Hook overview, `preventDefault` meaning, and interaction with commands** → [Component events & lifecycle](./component-events-and-lifecycle). Below, the **`onBreak`** slice of **`TodolistComponent`** (full **`import`** list in the sandbox **`components/todolist.component.tsx`**):

```tsx
override setup() {
  const commander = useContext(Commander) // insert/replace block-level nodes, etc.
  const selection = useContext(Selection) // move caret after line break

  onBreak(ev => {
    ev.preventDefault() // skip kernel default break; branches below define behavior
    const slot = ev.target // slot where break fired—here, the body slot

    // Empty body + Enter: replace this todo with a paragraph
    if (slot.isEmpty) {
      const body = new Slot([ContentType.Text])
      const p = new ParagraphComponent({ slot: body })
      commander.replaceComponent(this, p)
      selection.setPosition(body, 0)
      return
    }

    // Non-empty: cut after caret, new Todolist with same checked as this row
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

**`Commander`** changes document structure; **`Selection`** places the caret afterward. **`ev.preventDefault()`** means “don’t use the kernel default break”—the branches define this component’s semantics.

- When **`slot.isEmpty`**: **`replaceComponent(this, p)`** swaps the todo for an empty **`ParagraphComponent`** so you don’t leave an empty todo shell on the block lane.
- Otherwise: **`slot.cut(ev.data.index)`** splits after the caret; **`nextSlot`** goes into **`new TodolistComponent`**, **`insertAfter`** places it after **`this`**; the new row’s **`checked`** matches **`this.state.checked`**.

The **`ParagraphComponent`** in the same preset only does “cut + new paragraph”—useful contrast:

```tsx
override setup() {
  const commander = useContext(Commander)
  const selection = useContext(Selection)

  onBreak(ev => {
    ev.preventDefault()
    const nextContent = ev.target.cut(ev.data.index) // after caret → new paragraph body
    const p = new ParagraphComponent({ slot: nextContent })
    commander.insertAfter(p, this) // Enter: new paragraph after this one
    selection.setPosition(nextContent, 0)
  })
}
```

There is no **`replaceComponent`** here: Enter from a paragraph always yields another paragraph.

---

## 4. View: `TodolistView` (what the DOM looks like)

The view is a Viewfly function component; **`props.component`** is the **`TodolistComponent`** instance on the kernel side, and **`props.rootRef`** must attach to the **view root DOM** so the adapter can align document blocks with DOM.

```tsx
export function TodolistView(props: ViewComponentProps<TodolistComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const c = props.component
    const slot = c.state.slot
    return (
      /* rootRef must be on the root node so the adapter can bind block ↔ DOM */
      <div
        ref={props.rootRef}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '0.35em 0' }}
      >
        {/* Chrome UI: checkbox writes state, participates in History */}
        <input
          type="checkbox"
          checked={c.state.checked}
          onChange={(e: Event) => {
            c.state.checked = (e.target as HTMLInputElement).checked
          }}
          style={{ marginTop: '2px' }}
        />
        {/* Slot subtree comes from the kernel as children; wrap with createVNode before Viewfly */}
        {adapter.slotRender(slot, children =>
          createVNode('div', { style: { flex: '1', minWidth: 0 } }, children),
        )}
      </div>
    )
  }
}
```

- Outermost **`div`** with **`ref={props.rootRef}`**: the adapter binds the editable root for this block.
- **`input[type=checkbox]`**: chrome UI; **`checked`** / **`onChange`** sync **`c.state.checked`**; updates still go through Textbus history.
- **`adapter.slotRender(slot, …)`**: the kernel produces **`children`** for the slot document tree; you must wrap them with **`createVNode('div', …, children)`**—do not splice **`children`** as raw JSX siblings.

---

## Wiring the editor: three things in `App.tsx`

To plug Todolist into **`ViewflyAdapter`**, **`Textbus`**, and the initial document (full file in the sandbox **`App.tsx`**):

```tsx
// Kernel component name → Viewfly view; second arg mounts/unmounts the Viewfly sub-app
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

// components: block types the kernel knows; imports: browser rendering + input, etc.
const editor = new Textbus({
  components: [RootComponent, ParagraphComponent, TodolistComponent],
  imports: [browserModule],
})

// Root block owns a slot that only accepts block children; insert BlockComponents into rootSlot
const docRoot = new RootComponent({
  slot: new Slot([ContentType.BlockComponent]),
})
const rootSlot = docRoot.state.slot
// rootSlot.insert(new TodolistComponent({ … })); rootSlot.insert(new ParagraphComponent({ … }))
```

1. **Adapter map**: **`[TodolistComponent.componentName]: TodolistView`**, alongside paragraph and root.
2. **`Textbus({ components: [...] })`**: register **`TodolistComponent`** so **`fromJSON` / paste** can resolve the type.
3. **`insert` in the initial document**: demo mixes **`TodolistComponent`** and **`ParagraphComponent`** in a block-level slot; in real apps you might insert via **`RootComponent`** **`onContentInsert`** (the sandbox root still turns typed non-block content into paragraphs; hook index → [Component events & lifecycle](./component-events-and-lifecycle)).

## FAQ

- **`fromJSON` / paste errors**: confirm **`TodolistComponent`** is listed in **`components`**.

For body **bold / font size** and **block alignment**, see [Text styles](./text-styles) and [Block styles](./block-styles).

## What's next

- [Component events & lifecycle](./component-events-and-lifecycle)  
- [Advanced components](./component-advanced) (**`separate`**, **`removeSlot`**, etc.—when building multi-slot blocks)  
- [Text styles](./text-styles)  
- [Block styles](./block-styles)  
- [Concepts](./concepts)
