---
title: Advanced components
description: getSlots, separate, removeSlot, deleteAsWhole, zenCoding pointer — multi-slot blocks with Commander and hooks.
---

# Advanced components

This page covers **optional** **`Component`** extensions: **`getSlots()`**, **`separate`**, **`removeSlot`**, **`deleteAsWhole`**, and static **`zenCoding`**. Together with **`Commander`** (**`delete`**, **`paste`**, **`transform`**), **`Selection`**, and event hooks they define how **multi-slot blocks** behave while editing.

Read first: [Component basics](./component-basics), [Component events & lifecycle](./component-events-and-lifecycle), [Query & operations](./operations-and-query), [Shortcuts & grammar](./shortcuts-and-grammar).

## `getSlots(): Slot[]`

**Role**: list **every child `Slot`** on this component instance in **document model** order—the order must match **top-to-bottom, front-to-back** rendering in the view.

**Returns**: **`Slot[]`**. The **`slots`** accessor on the instance **calls `getSlots()`** internally; selection math, **`Commander.delete`** at block boundaries, **paste**, and **`transform`** all read child slots in **`slots`** order.

**Convention**: if you implement **`removeSlot`** so it can return **`true`**, or **`removeSlot` / `separate`** cause the kernel to **`splice`** the **`slots` array**, **`getSlots()` should keep returning the same array reference** (e.g. hold **`Slot[]`** on **`state`** and return it from **`getSlots()`**). Otherwise **`splice`** hits a **temporary** array and **`state`** drifts from what the kernel sees.

```ts
import { Component, ContentType, Slot } from '@textbus/core'

type RowState = { cells: Slot[] }

abstract class RowLike extends Component<RowState> {
  override getSlots(): Slot[] {
    return this.state.cells
  }
}
```

## `separate(start?, end?): Component`

**Role**: cut a **contiguous range of child `Slot`**s from **this** component into a **new instance of the same class**; after split, **this** instance no longer owns those slots—you move **`state`** / references in your implementation.

**Parameters** ( **`Slot` references**, not numeric indices):

- **`start`**: first child **`Slot`** to peel off (**inclusive**).
- **`end`**: last child **`Slot`** (**inclusive**). If omitted, meaning depends on the **`Commander`** call site (often same as **`start`** or single-slot split).

**Returns**: new **`Component`** instance of the **same** type; the kernel **`insertAfter`**s it following the original block. **`paste`** and **`transform`** use this when trailing slots must become a sibling block (see **When it runs** below).

**When it runs**:

- **`paste`**: when pasted content cannot **`insert`** directly into the selection, if the parent implements **`separate`**, the kernel takes **`nextSlot`** after the selection’s slot and calls **`parentComponent.separate(nextSlot)`** to peel trailing structure into a new block, then continues insertion.
- **`transform`**: when a multi-slot parent must promote **trailing child slots** to a sibling, it **`splice`s **`parentComponent.slots`**, then **`separate(deletedSlots[0], deletedSlots[deletedSlots.length - 1])`** and **`insertAfter`** the returned component.

Without **`separate`**, those paths often degrade to **partial insert** or **odd leftover structure**; implement it—aligned with **`getSlots()`**—when you need **new peers from the middle or tail** (lists, table rows, …).

```ts
import { Component, ContentType, Slot } from '@textbus/core'

type GridState = { rows: Slot[] }

declare class GridRow extends Component<GridState> {
  static componentName = 'GridRow'
  static type = ContentType.BlockComponent
}

// Illustrative: peel cells from slot `start` through `end` into a new row
function exampleSeparate(row: GridRow, start: Slot, end: Slot) {
  const idx = row.state.rows.indexOf(start)
  const endIdx = row.state.rows.indexOf(end)
  const moved = row.state.rows.splice(idx, endIdx - idx + 1)
  return new GridRow({ rows: moved })
}
```

(**`GridRow`** / **`state`** are placeholders—match **`fromJSON`**, view, **`schema`** in real code.)

## `removeSlot(slot): boolean`

**Role**: when **`Commander.delete`** with a **collapsed** caret deletes backward from a **non-first** child slot and must **remove the whole child slot**, the kernel asks **`parentComponent.removeSlot(slot)`** first.

**Parameter**: **`slot`** — the **`Slot`** about to leave the parent’s child-slot list.

**Returns**:

- **`true`**: **you** removed it (updated **`state`**, dropped references, …). The kernel then **`splice`s **`parentComponent.slots`** (from **`getSlots()`**) to drop that slot entry.
- **`false`** or missing implementation: kernel **does not** mutate **`state`**; delete falls back to default (caret may stay on the old **`Slot`**).

So **`true`** must match **`getSlots()`**’s backing array—or you get “kernel **`splice`**d but **`state`** still holds the old **`Slot`**.”

```ts
import { Component, ContentType, Slot } from '@textbus/core'

type RowState = { cells: Slot[] }

class TableRow extends Component<RowState> {
  static componentName = 'TableRow'
  static type = ContentType.BlockComponent

  getSlots(): Slot[] {
    return this.state.cells
  }

  removeSlot(slot: Slot): boolean {
    const i = this.state.cells.indexOf(slot)
    if (i <= 0) {
      return false
    }
    this.state.cells.splice(i, 1)
    return true
  }
}
```

## `deleteAsWhole?: boolean`

**Role**: optional **boolean field** on the instance (not a method). When **`Commander.delete`** with **collapsed** selection has a **`Component`** adjacent on one side:

- If that component **`type === BlockComponent`** **or** **`deleteAsWhole === true`**: delete **`removeComponent`s the whole block**—caret does **not** enter the block first.
- Otherwise: default **“drill into children”** rules apply.

**`false`** or omit: inline blocks or blocks where caret should enter—keep default.

```ts
import { Component, ContentType, Slot } from '@textbus/core'

class Card extends Component<{ body: Slot }> {
  static componentName = 'Card'
  static type = ContentType.BlockComponent

  constructor(init: { body: Slot }) {
    super(init)
    this.deleteAsWhole = true
  }
}
```

## Static `zenCoding`

**`static zenCoding`** on the class, plus **`TextbusConfig.zenCoding`** and **`keyboard.addZenCodingInterceptor`**, implement **Zen Coding**. **`match` / `key` / `createState`**, timing, parent **`Slot.schema`**, and the runnable **Todolist** sample live in [Shortcuts & grammar](./shortcuts-and-grammar) under **“Static `zenCoding` on component classes”**—not duplicated here.

## Relation to `Commander` and events

- **`transform`**, **`paste`**, **`delete`** invoke **`separate` / `removeSlot` / `deleteAsWhole`** from selection and common ancestor—parameters and failure modes: [Query & operations](./operations-and-query).
- **`onPaste`**, **`onBreak`**, **`onContentDelete`**, … apply to the **same** document tree; order and **`preventDefault`**: [Component events & lifecycle](./component-events-and-lifecycle).

## What's next

- [Component basics](./component-basics)  
- [Slot](./slot)  
- [Component events & lifecycle](./component-events-and-lifecycle)  
- [Shortcuts & grammar](./shortcuts-and-grammar)  
- [Query & operations](./operations-and-query)  
- [Concepts](./concepts)  
- [Viewfly adapter](./adapter-viewfly), [Vue adapter](./adapter-vue), [React adapter](./adapter-react)  
- [Modules & extensions](./editor-and-modules)
