---
title: Component events & lifecycle
description: Component hooks for insert/delete/break/paste/format/attribute, IME, selection, context menu, detach.
---

# Component events & lifecycle

When **`Commander`** performs **insert/delete text, line breaks, paste, apply format or attribute**, or **`Selection`** **changes the selection**, the kernel dispatches hooks on **`Component`** (e.g. **`onContentInsert`**, **`onBreak`**). Register listeners in **`setup()`** with **`onXxx`** from **`@textbus/core`**—you can **`preventDefault`** to override defaults or only log / sync UI. **Shortcuts** are covered in [Shortcuts & grammar](./shortcuts-and-grammar).

Read [Component basics](./component-basics), [Query & operations](./operations-and-query), [Selection](./selection), and [Block styles](./block-styles) first.

## How to register

Inside **`setup()`** on the component class, call the imported helpers **synchronously**—do **not** register after **`await`**, **`Promise.then`**, or **`setTimeout`**.

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

## When `setup` runs

On first **`editor.render(root)`**, the kernel calls **`setup()`** on the **root**, then walks **child components** already under **child slots** and runs **`setup`** on each. When a new **`Component`** is mounted under a **`Slot`**, **`setup`** runs for that subtree. Interaction with **`getSlots()`**, **`separate()`**, …: [Advanced components](./component-advanced).

For **`event.target`** below: when it is a **`Component`**, it is **this component instance** (the block whose **`setup`** registered the hook)—you do not receive another component’s events from here. When it is a **`Slot`**, it is **one of this component’s child slots** (the same **`Slot`** instances exposed via **`getSlots()`**), meaning the operation targets that slot.

## Slot content

### `onContentInsert`

**When**: **before** **`Commander.insert`** (and similar) actually writes into the slot.

**Args**: **`event: Event<Slot, InsertEventData>`**.

- **`event.target`**: the **`Slot`** about to receive content.
- **`event.data.index`**: insertion offset.
- **`event.data.content`**: string or **`Component`** to insert.
- **`event.data.formats`**: formats carried with the insert (**`Formats`**).

**`event.preventDefault()`** cancels this insert; the command usually returns **`false`**. Root and paragraph blocks often use this to wrap typed text into blocks—[Component basics](./component-basics).

```ts
import { onContentInsert } from '@textbus/core'

onContentInsert(event => {
  const slot = event.target
  const { index, content, formats } = event.data
  // e.g. event.preventDefault() to forbid certain inserts
})
```

### `onContentInserted`

**When**: **after** content has been written to the **`Slot`**.

**Args**: **`event: Event<Slot, InsertEventData>`**—same fields as **`onContentInsert`** (describing the insert that just finished).

**`preventDefault()`** on **`onContentInserted`** affects whether the default pipeline collapses the selection near the insert (default **`insert`** behavior). Often used for observation or fine-tuning selection.

```ts
import { onContentInserted } from '@textbus/core'

onContentInserted(event => {
  const slot = event.target
  const { index, content } = event.data
  // insert committed; sync UI. event.preventDefault() to avoid default selection collapse
})
```

### `onContentDelete`

**When**: **before** a span is **removed or moved** from the slot (e.g. **`Commander.delete`** after splitting the selection).

**Args**: **`event: Event<Slot, DeleteEventData>`**.

- **`event.target`**: **`Slot`** being cut.
- **`event.data.index`**: delete start.
- **`event.data.count`**: length removed.
- **`event.data.toEnd`**: whether deletion heads toward the **end** of the document (forward vs backward).
- **`event.data.actionType`**: **`'delete'`** pure delete; **`'move'`** cut for cross-slot moves.

**`preventDefault()`** blocks this slice; command returns **`false`**.

```ts
import { onContentDelete } from '@textbus/core'

onContentDelete(event => {
  const { index, count, toEnd, actionType } = event.data
  // actionType is 'delete' | 'move'; event.preventDefault() to block
})
```

### `onContentDeleted`

**When**: **after** the slice has been cut from the **`Slot`**.

**Args**: **`event: Event<Slot>`**, **`event.data`** **`null`**—only **`event.target`** identifies the **`Slot`**.

**`preventDefault()`** may still be inspected in some delete flows: blocking can adjust focus/anchor and make **`delete`** return **`false`** (skip default post-delete cleanup). Often observation-only.

```ts
import { onContentDeleted } from '@textbus/core'

onContentDeleted(event => {
  const slot = event.target
  // post-delete observation; rarely event.preventDefault() to interrupt cleanup
})
```

## Line breaks

### `onBreak`

**When**: **`Commander.break()`**. Non-collapsed selection is cleared first; collapsed caret fires directly.

**Args**: **`event: Event<Slot, BreakEventData>`**.

- **`event.target`**: **`Slot`** where break fires (**`startSlot`**).
- **`event.data.index`**: offset at break.

If not prevented, the kernel may **`write`** a newline into the slot. Custom lists / todos usually **`preventDefault()`** then **`cut` / `insertAfter`**—[Component basics](./component-basics).

```ts
import { onBreak } from '@textbus/core'

onBreak(event => {
  const slot = event.target
  const { index } = event.data
  // custom split: ev.preventDefault() then Commander cut / insertAfter
})
```

## Paste

### `onPaste`

**When**: **before** **`Commander.paste(pasteSlot, text)`** applies the default **`delta`** write.

**Args**: **`event: Event<Slot, PasteEventData>`**.

- **`event.target`**: **`Slot`** used for dispatch (related to common-ancestor selection).
- **`event.data.index`**: intended paste offset.
- **`event.data.data`**: structured clipboard **`Slot`** (parsed fragment tree).
- **`event.data.text`**: parallel plain text.

**`preventDefault()`** → custom paste; otherwise the kernel **`insert`**s from **`pasteSlot.toDelta()`** with **`separate`** and multi-slot rules—[Query & operations](./operations-and-query) **`paste`**.

```ts
import { onPaste } from '@textbus/core'

onPaste(event => {
  const { index, data, text } = event.data
  // full custom paste: event.preventDefault(), then insert data tree or text yourself
})
```

## Formats & attributes (before write)

### `onSlotApplyFormat`

**When**: **before** **`Commander.applyFormat`** writes the format onto the **`Slot`**.

**Args**: **`event: Event<Slot, SlotApplyFormatEventData>`**.

- **`event.target`**: **`Slot`** receiving the format.
- **`event.data.formatter`**: **`Formatter`** instance.
- **`event.data.value`**: format value.

**`preventDefault()`** cancels this apply.

```ts
import { onSlotApplyFormat } from '@textbus/core'

onSlotApplyFormat(event => {
  const { formatter, value } = event.data
  // validation fails → event.preventDefault()
})
```

### `onSlotSetAttribute`

**When**: **before** **`slot.setAttribute`**, **`Commander.applyAttribute`**, … attach an attribute.

**Args**: **`event: Event<Slot, SlotSetAttributeEventData>`**.

- **`event.target`**: target **`Slot`**.
- **`event.data.attribute`**: **`Attribute`** instance.
- **`event.data.value`**: attribute value.

**`preventDefault()`** cancels. Selection branching: [Block styles](./block-styles).

```ts
import { onSlotSetAttribute } from '@textbus/core'

onSlotSetAttribute(event => {
  const { attribute, value } = event.data
  // disallow → event.preventDefault()
})
```

## IME

### `onCompositionStart`

**When**: composition starts.

**Args**: **`event: Event<Slot, CompositionStartEventData>`**.

- **`event.target`**: **`Slot`**.
- **`event.data.index`**: composition start offset.

```ts
import { onCompositionStart } from '@textbus/core'

onCompositionStart(event => {
  const slot = event.target
  const { index } = event.data
  // composition starts at index in slot
})
```

### `onCompositionUpdate`

**When**: composition text updates.

**Args**: **`event: Event<Slot, CompositionUpdateEventData>`**.

- **`event.data.index`**: current position.
- **`event.data.data`**: IME string this round.

```ts
import { onCompositionUpdate } from '@textbus/core'

onCompositionUpdate(event => {
  const { index, data } = event.data
  // IME updates at index to string data
})
```

### `onCompositionEnd`

**When**: composition ends.

**Args**: **`event: Event<Slot>`**—no **`data`** payload (**`null`**); **`event.target`** is the **`Slot`**.

```ts
import { onCompositionEnd } from '@textbus/core'

onCompositionEnd(event => {
  const slot = event.target
  // composition ends on slot
})
```

## Selection & ranges

### `onGetRanges`

**When**: after selection changes, the kernel asks whether **`getRanges()`** should use **custom multi-range** selection.

**Args**: **`event: GetRangesEvent<Component>`**.

- **`event.target`**: **this component**.
- Call **`event.useRanges([{ slot, startIndex, endIndex }, ...])`** with **`SlotRange[]`**; omit to keep the default continuous range. Table box selection: [Selection](./selection).

```ts
import { onGetRanges } from '@textbus/core'

onGetRanges(event => {
  event.useRanges([])
})
```

### `onSelected`

**When**: the selection becomes **exactly one whole component** (drag or **`selectComponent`**, …).

**Args**: none—**`() => void`**.

Use for block chrome, block-only actions.

```ts
import { onSelected } from '@textbus/core'

onSelected(() => {
  // this component is fully selected
})
```

### `onUnselect`

**When**: whole-block selection ends or the selection no longer wraps only this block.

**Args**: none—**`() => void`**.

```ts
import { onUnselect } from '@textbus/core'

onUnselect(() => {
  // whole-block selection ended
})
```

### `onFocus`

**When**: start **`Slot`** and end **`Slot`** share the same **`parent`** **`Component`**, and that **`Component`** differs from the previous round. Collapsed caret: **`parent`** of the caret’s **`Slot`**.

**Args**: none—**`() => void`**.

Often styles “current editing block”.

```ts
import { onFocus } from '@textbus/core'

onFocus(() => {
  // anchor/focus sit in this component’s direct child slots
})
```

### `onBlur`

**When**: paired with **`onFocus`**—when **`parent`** switches to another component, **`onBlur`** fires on the **previous** **`parent`**.

**Args**: none—**`() => void`**.

```ts
import { onBlur } from '@textbus/core'

onBlur(() => {
  // editing context left this component (paired with onFocus)
})
```

### `onFocusIn`

**When**: after common-ancestor component changes, fires **once per `Component`** on the path **from the new ancestor toward the root**—selection entered this subtree.

**Args**: none—**`() => void`**.

```ts
import { onFocusIn } from '@textbus/core'

onFocusIn(() => {
  // selection common-ancestor chain includes this component
})
```

### `onFocusOut`

**When**: paired cleanup with **`onFocusIn`**—fires on components along the **previous** chain.

**Args**: none—**`() => void`**.

```ts
import { onFocusOut } from '@textbus/core'

onFocusOut(() => {
  // previous focus-in context ends
})
```

### `onSelectionFromFront`

**When**: e.g. **`Selection.toNext()`**—caret crosses **into** a **`Component`** from its **front** edge; the component may handle it first.

**Args**: **`event: Event<Component>`**, no **`data`** (**`null`**). **`event.target`** is that component.

**`preventDefault()`** can skip default behavior (e.g. **`selectComponent`** when there are no child slots); selection may stay where it was.

```ts
import { onSelectionFromFront } from '@textbus/core'

onSelectionFromFront(event => {
  // event.target: entered component; event.preventDefault() to skip default “select whole block on entry”
})
```

### `onSelectionFromEnd`

**When**: e.g. **`Selection.toPrevious()`**—symmetric entry from the **back** edge.

**Args**: **`event: Event<Component>`**, **`event.target`** the entered component. **`preventDefault()`** mirrors **`onSelectionFromFront`**.

```ts
import { onSelectionFromEnd } from '@textbus/core'

onSelectionFromEnd(event => {
  // symmetric to onSelectionFromFront
})
```

If the caret “jumps back”, check for accidental **`preventDefault()`** in these hooks.

## Context menu & model notifications

### `onContextMenu`

**When**: app calls **`triggerContextMenu(component)`** (from **`@textbus/core`**); walks **`parentComponent`** upward from **`component`**.

**Args**: **`event: ContextMenuEvent<Component>`**.

- **`event.target`**: component at this layer.
- **`event.useMenus(menuConfigs)`**: contributes **`ContextMenuConfig[]`**—item types include **`ContextMenuItem`**, **`ContextMenuGroup`**, … (see typings).
- **`event.stopPropagation()`**: stop bubbling to parents.

```ts
import { onContextMenu } from '@textbus/core'

onContextMenu(event => {
  event.useMenus([])
  // event.stopPropagation()
})
```

### `onParentSlotUpdated`

**When**: parent **`Slot`** notifies the subtree after an update (e.g. after adapter sync).

**Args**: none—**`() => void`**. Refresh local view state that depends only on the parent slot.

```ts
import { onParentSlotUpdated } from '@textbus/core'

onParentSlotUpdated(() => {
  // parent slot updated
})
```

### `onDetach`

**When**: this component instance is about to be removed from the document (delete, replace whole block, …).

**Args**: none—**`() => void`**. Unsubscribe timers, etc.; the kernel clears hook registrations after.

```ts
import { onDetach } from '@textbus/core'

onDetach(() => {
  // cleanup side effects
})
```

## What's next

- [Component basics](./component-basics) (**`onBreak`**, **`onContentInsert`**)  
- [Query & operations](./operations-and-query) (commands vs hooks)  
- [Advanced components](./component-advanced) (**`separate`**, multi-slot)  
- [Shortcuts & grammar](./shortcuts-and-grammar)  
- [Concepts](./concepts)
