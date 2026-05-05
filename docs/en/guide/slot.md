---
title: Slot
description: Slot API — schema, retain, insert/write/delete, formats, attributes, delta, cut, toTree.
---

# Slot

A **Slot** (type **`Slot`**) is the container in a component’s **`state`** that holds a document fragment: text and child components in order, constrained by **`schema`** (**allowed `ContentType`**), with **formats** (text ranges) and **attributes** (whole slot) layered on top. Cross-references: [Component basics](./component-basics), [Text styles](./text-styles), [Block styles](./block-styles), [Concepts](./concepts), [Advanced components](./component-advanced).

## Construction and static members

### `new Slot(schema, state?)`

- **`schema`**: **`ContentType[]`**—which of **`ContentType.Text` / `InlineComponent` / `BlockComponent`** may be inserted.
- **`state`**: optional, default **`{}`**, wrapped with **`observe`**; mutating **`state`** marks the slot dirty for views.
- After creation the slot already has **placeholder** content; use **`isEmpty`** for “no user-visible body text”.

```ts
import { ContentType, Slot } from '@textbus/core'

const plain = new Slot([ContentType.Text])

type CaptionState = { label: string }
const caption = new Slot<CaptionState>([ContentType.Text], { label: '' })
caption.state.label = 'Fig 1'
```

### `Slot.placeholder`

Zero-width character **`'\u200b'`**. **`insert`** next to the placeholder segment merges/replaces it before writing real content; **`Slot.placeholder`** is just the constant for that character.

```ts
import { Slot } from '@textbus/core'

console.log(Slot.placeholder === '\u200b')
```

### `Slot.emptyPlaceholder`

Static getter—currently **`'\n'`**, paired with “empty slot still keeps one cell”; **`isEmpty`** compares content against **`Slot.emptyPlaceholder`**.

```ts
import { Slot } from '@textbus/core'

console.log(Slot.emptyPlaceholder === '\n')
```

## Read-only members and accessors

### `schema`

Allowed content types; **`insert`** validates **`content`** against it.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text, ContentType.InlineComponent])
console.log(slot.schema.includes(ContentType.BlockComponent)) // false
```

### `state`

Business data on the slot (constructor’s second arg); reactive—field writes mark the slot dirty.

```ts
import { ContentType, Slot } from '@textbus/core'

type S = { hint: string }
const slot = new Slot<S>([ContentType.Text], { hint: 'Placeholder' })
slot.state.hint = 'Title'
```

### `changeMarker`

**`ChangeMarker`** on the **`Slot`** tracks modifications (**`dirty` / `changed`**, …). **`markAsDirtied` / `markAsChanged`**, … emit **`Operation` / `Action[]`** on **`onChange`**, **`onSelfChange`**, **`onChangeBefore`**, … and bubble via **`parentModel`**. App code rarely touches this directly—the **`Slot`** updates it on insert/delete/format changes.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
console.log(slot.changeMarker != null)
```

### `onContentChange`

**`Observable<Action[]>`**: after content or format changes, emits **`Action[]`** for this update. Subscribe on the **`Slot`** side; relation to **`History`**: [Query & operations](./operations-and-query).

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
const sub = slot.onContentChange.subscribe(actions => {
  console.log(actions.map(a => a.type))
})
slot.retain(0)
slot.insert('a')
sub.unsubscribe()
```

### `parent`

The **`Component`** that owns this **`Slot`** in the tree—“who holds this **`Slot`** instance.” **`null`** until mounted under a component.

```ts
import { ContentType, Slot } from '@textbus/core'

const orphan = new Slot([ContentType.Text])
console.log(orphan.parent) // null
```

### `parentSlot`

When **`parent`** exists, **`parent`** sits as content inside **`parentSlot`**—the **`Slot`** one level **outside** **`parent`** relative to this **`Slot`**. Walk outward with **`parentSlot`** / **`parent`** alternately. **`null`** when **`parent`** is **`null`**.

```ts
import type { Slot } from '@textbus/core'

declare const attached: Slot
console.log(attached.parentSlot)
```

### `length`

Counts **character cells + one cell per child component**. Use **`isEmpty`** for “empty document,” not **`length === 0`** alone.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hi')
console.log(slot.length) // after placeholder handling
```

### `isEmpty`

**`true`** means only placeholder, no substantive editable content—not the same as **`length === 0`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
console.log(slot.isEmpty) // true
slot.retain(0)
slot.insert('x')
console.log(slot.isEmpty) // false
```

### `index`

Current **write caret** offset. When **`isEmpty`**, **`index`** is always **`0`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
console.log(slot.index) // 3
slot.retain(1)
console.log(slot.index) // 1
```

## Attributes: `Attribute`

### `setAttribute(attribute, value, canSet?)`

Writes **`Attribute`** on **this slot**; unless **`attribute.onlySelf`** is **`true`**, also propagates to **child components’ slots**. No-op if **`canSet`** returns **`false`** or **`attribute.checkHost`** fails.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'right')
```

If **`canSet(slot, attribute, value)`** returns **`false`**, **`setAttribute`** aborts—no write, no child propagation.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])

let allowAlign = false
slot.setAttribute(align, 'left', () => allowAlign)
console.log(slot.hasAttribute(align)) // false

allowAlign = true
slot.setAttribute(align, 'left', () => allowAlign)
console.log(slot.hasAttribute(align)) // true
```

### `getAttribute(attribute)`

Returns the value for this **`Attribute`**, or **`null`** if unset.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
console.log(slot.getAttribute(align)) // 'left'
```

### `hasAttribute(attribute)`

Whether this **`Attribute`** is set.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
console.log(slot.hasAttribute(align)) // false
slot.setAttribute(align, 'left')
console.log(slot.hasAttribute(align)) // true
```

### `getAttributes()`

Returns **`[Attribute, value][]`** for all slot-level attributes.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
for (const [attr, value] of slot.getAttributes()) {
  console.log(attr.name, value)
}
```

### `removeAttribute(attribute, canRemove?)`

Removes **`Attribute`**; follows **`onlySelf`** for child slots. **`canRemove`** can intercept.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
slot.removeAttribute(align)
console.log(slot.hasAttribute(align)) // false
```

If **`canRemove(slot, attribute)`** returns **`false`**, this call does **nothing on this slot**—no removal here and **no** cascaded removal to children. (Child removals without **`canRemove`** still run.)

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')

slot.removeAttribute(align, () => false)
console.log(slot.hasAttribute(align)) // true

slot.removeAttribute(align, () => true)
console.log(slot.hasAttribute(align)) // false
```

## Caret: `retain`

### `retain(offset)` (move caret only)

Moves the internal caret to **`offset`** (clamped to **`[0, length]`**). Subsequent **`insert` / `delete`** start there.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
slot.retain(1)
slot.delete(1) // removes 'b'
```

### `retain(offset, formatter, value, canApply?)`

From the **current caret**, apply format over the next **`offset`** cells; **`value === null`** clears that **`Formatter`** on the range. Or pass **`Formats`** (**`[Formatter, value][]`**) for multiple formats at once.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.retain(0)
slot.retain(5, bold, true)
slot.retain(0)
slot.retain(5, bold, null) // clear bold (illustrative)
```

### `canApply` (optional callback)

Last argument to **`insert` / `write`**, formatted **`retain`**, **`applyFormat`**, **`cleanFormats`**, **`insertDelta`**, …—**`(slot, formatter, value) => boolean`**. **`false`** skips merging **that** formatter for **this** round (**text/component still inserts**).

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>

const denied = new Slot([ContentType.Text])
denied.retain(0)
denied.insert('hi', bold, true, () => false)

const allowed = new Slot([ContentType.Text])
allowed.retain(0)
allowed.insert('hi', bold, true, () => true)

console.log(denied.extractFormatsByIndex(0).some(([f]) => f === bold)) // false
console.log(allowed.extractFormatsByIndex(0).some(([f]) => f === bold)) // true
```

Same for formatted **`retain`**: **`false`** skips that format merge.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.retain(0)
slot.retain(5, bold, true, () => false)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === bold)) // false
```

## Write and delete

### `insert(content, formats?, canApply?)`

Inserts string or **`Component`** at **current `index`**. **`schema`** mismatch → **`false`**. If the component is mounted elsewhere, **`removeComponent`** first. Optional **`formats`** apply **`Formatter`** only to **non-block** text content. **`canApply`**: see above.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hi', bold, true)
```

### `write(content, formatter?, value?, canApply?)`

Before **`insert`**, **inherits formats from the caret neighborhood** (continuous typing). For “clean” inserts without inheritance use **`retain` + `insert`**. **`canApply`** is forwarded to inner **`insert`**.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('a', bold, true)
slot.retain(1)
slot.write('bc') // 'bc' picks up adjacent formats (illustrative)
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('a', bold, true)
slot.retain(1)
slot.write('b', bold, true, () => false) // bold merge denied; text still writes
console.log(slot.toString().includes('ab'))
```

### `delete(count)`

Deletes **`count`** cells **forward from current `index`**; when empty, placeholder is restored and format skeleton kept when possible. **`count <= 0`** → **`false`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
slot.retain(1)
slot.delete(2)
```

### `removeComponent(component)`

Finds the child by instance, **`retain`s to that cell, `delete(1)`**; **`false`** if not found.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Component } from '@textbus/core'

declare const child: Component
const slot = new Slot([ContentType.InlineComponent])
slot.retain(0)
slot.insert(child)
slot.removeComponent(child)
```

## Formats: `Formatter`

### `applyFormat(formatter, { startIndex, endIndex, value }, canApply?)`

Same as **`retain(startIndex)`** then **`retain(endIndex - startIndex, formatter, value)`** for **absolute index ranges**. **`canApply`**: see above.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true })
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true }, () => false)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === bold)) // false
```

### `getFormats()`

All **`FormatItem`** entries—**`formatter`**, **`startIndex` / `endIndex`**, **`value`** per span.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab')
console.log(slot.getFormats().length >= 0)
```

### `extractFormatsByIndex(index)`

Formats active at **one character cell**: **`[Formatter, value][]`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('x')
const at0 = slot.extractFormatsByIndex(0)
console.log(Array.isArray(at0))
```

### `getFormatRangesByFormatter(formatter, startIndex, endIndex)`

**`FormatRange[]`** for **`formatter`** within **`[startIndex, endIndex)`**.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
slot.applyFormat(bold, { startIndex: 1, endIndex: 4, value: true })
const ranges = slot.getFormatRangesByFormatter(bold, 0, slot.length)
console.log(ranges.length)
```

### `cleanFormats(remainFormats?, startIndex?, endIndex?, canApply?)`

Clears formats on **`[startIndex, endIndex)`**. First arg **`remainFormats`** (default **`[]`**):

- **`Formatter[]`**: listed formatters **keep** their formatting; others get **`retain(..., formatter, null)`** on the range.
- **`(formatter: Formatter) => boolean`**: for each **`FormatItem`** from **`getFormats()`**, **`true`** keeps, **`false`** clears **`formatter`** on the range.

If **`getFormats()`** is empty on this slot, **recursively** cleans child component slots. Each clear passes **`canApply`**—**`false`** skips clearing **that** formatter this round.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
declare const italic: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab', italic, true)
slot.cleanFormats([bold], 0, slot.length) // italic not in keep list → cleared if present; bold kept if in range
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const italic: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab', italic, true)
slot.cleanFormats([], 0, slot.length, (_s, fmt) => fmt !== italic)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === italic)) // true — blocked clear

slot.cleanFormats([], 0, slot.length, () => true)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === italic)) // false
```

## Reading slices and cutting

### `getContentAtIndex(index)`

String fragment or **`Component`** at **`index`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ab')
const ch = slot.getContentAtIndex(0)
console.log(typeof ch === 'string')
```

### `sliceContent(startIndex?, endIndex?)`

Default **`[0, length)`** → **`Array<string | Component>`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('abc')
const parts = slot.sliceContent(1, 2)
console.log(parts.join(''))
```

### `indexOf(component)`

First index of child **`Component`**; **`-1`** if missing.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Component } from '@textbus/core'

declare const child: Component
const slot = new Slot([ContentType.InlineComponent])
slot.retain(0)
slot.insert(child)
console.log(slot.indexOf(child))
```

### `cut(startIndex?, endIndex?)`

Cuts **`[startIndex, endIndex)`** into a **new `Slot`** (copies **`schema`**, **deep-clones `state`**), removes range from source; cut fragment keeps aligned formats.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
const tail = slot.cut(3, slot.length)
console.log(tail.toString())
```

### `cutTo(targetSlot, startIndex?, endIndex?)`

Cut into a **pre-built** **`targetSlot`** (custom **`state`**, …); range semantics same as **`cut`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const src = new Slot([ContentType.Text])
src.retain(0)
src.insert('abcde')
const dst = new Slot([ContentType.Text])
src.cutTo(dst, 2, src.length)
console.log(dst.toString())
```

## Delta

### `toDelta()`

Returns **`DeltaLite`**: items **`{ insert, formats }`**, **`attributes`** on **`delta.attributes`** for paste merge / custom pipelines.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hi')
const delta = slot.toDelta()
console.log(delta.length, delta.attributes.size)
```

### `insertDelta(delta, canApply?)**

**`setAttribute`** from **`delta.attributes`** on this slot, then **`insert`** each segment in order. If an **`insert`** fails (**`schema`**, …), **stops** and returns **remaining `delta`**. **`canApply`** forwarded per segment.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
const src = new Slot([ContentType.Text])
src.retain(0)
src.insert('ab')
const delta = src.toDelta()
slot.retain(0)
slot.insertDelta(delta)
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const src = new Slot([ContentType.Text])
src.retain(0)
src.insert('z', bold, true)
const delta = src.toDelta()

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insertDelta(delta, () => false)
console.log(slot.extractFormatsByIndex(0).some(([f]) => f === bold)) // false — bold not applied
console.log(slot.toString().includes('z')) // true — text still inserted
```

## Other methods

### `background(fn)`

While **`fn`** runs, **`retain` (with format)**, **`applyFormat`**, … writes use **lowest priority** in **`Format.merge`**: for the **same `Formatter`** where ranges overlap, **existing `value` and intervals win**; only gaps without that formatter receive the new format—background writes do not stomp existing same-format spans.

When **`retain`** targets **nested child slots**, the kernel wraps child slots in **`background`** (**`applyFormatCoverChild`** internally) with the same merge rules.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Formatter } from '@textbus/core'

declare const bold: Formatter<boolean>
const slot = new Slot([ContentType.Text])
slot.background(() => {
  slot.retain(0)
  slot.retain(slot.length, bold, true)
})
```

### `cleanAttributes(remainAttributes?, canRemove?)`

First arg **`remainAttributes`** (default **`[]`** = remove **all** attributes):

- **`Attribute[]`**: listed instances **keep**; others **`removeAttribute`** on this slot.
- **`(attribute: Attribute) => boolean`**: per attribute on the slot—**`true`** keep, **`false`** **`removeAttribute`**.

After this slot, **recursively** **`cleanAttributes(remainAttributes, canRemove)`** on child component slots. **`canRemove`** matches **`removeAttribute(attribute, canRemove?)`**.

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
slot.cleanAttributes([align])
```

```ts
import { ContentType, Slot } from '@textbus/core'
import type { Attribute } from '@textbus/core'

declare const align: Attribute<'left' | 'right'>
declare const other: Attribute<string>
const slot = new Slot([ContentType.Text])
slot.setAttribute(align, 'left')
slot.setAttribute(other, 'x')
slot.cleanAttributes(attr => attr === align)
console.log(slot.hasAttribute(align), slot.hasAttribute(other)) // true, false
```

### `toJSON()`

**`SlotLiteral`**: **`schema`**, content literal, **`attributes`**, **`formats`**, **`state`**—persistence / **`Registry.createSlot`** round-trip.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('ok')
const json = slot.toJSON()
console.log(Array.isArray(json.schema), json.content.length)
```

### `toString()`

Linear string concatenation; **`Component`** stringification is defined on the **component**, not uniformly by **`Slot`**.

```ts
import { ContentType, Slot } from '@textbus/core'

const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('hello')
console.log(slot.toString())
```

### `toTree(slotRenderFactory, customFormat?, renderEnv?)`

Builds **`VElement`** from formats + content: ranges via each **`Formatter.render`**, slot **`Attribute`** on the root from **`slotRenderFactory`** wrapping children. Browser/view: [Browser module](./platform-browser), [Viewfly adapter](./adapter-viewfly) ([Vue](./adapter-vue), [React](./adapter-react)).

```ts
import { ContentType, Slot } from '@textbus/core'
import type { SlotRenderFactory } from '@textbus/core'

declare const wrapChildren: SlotRenderFactory
const slot = new Slot([ContentType.Text])
slot.retain(0)
slot.insert('x')
console.log(slot.toTree(wrapChildren))
```

### `Slot.toTree` (static)

Lower-level: given **`FormatTree`** + **`Slot`**, produce root **`VElement`** (adapter / render pipeline).

```ts
import { Slot } from '@textbus/core'
import type { FormatTree } from '@textbus/core'
import type { SlotRenderFactory } from '@textbus/core'

declare const slot: Slot
declare const tree: FormatTree
declare const wrapChildren: SlotRenderFactory
console.log(Slot.toTree(slot, wrapChildren, tree))
```

### `Slot.formatsToTree` (static)

Wraps **`children`** with one layer of **`Formats`** for **`Formatter.render`** chaining.

```ts
import { Slot } from '@textbus/core'
import type { Formats } from '@textbus/core'
import type { Component } from '@textbus/core'
import type { VElement, VTextNode } from '@textbus/core'

declare const formats: Formats
declare const children: Array<VElement | VTextNode | Component>
console.log(Slot.formatsToTree(formats, children, /* renderEnv */ {}))
```

## Relation to commands and selection

**`Commander`** and **`Selection`** expose editor-level APIs; most writes eventually call **`Slot`** **`insert` / `delete` / `retain`**, … ([Query & operations](./operations-and-query), [Selection](./selection)). You may also call **`Slot`** methods **directly** from **`setup`**, …—changes on the document tree emit **`Action`**s and **`History`** records, so **undo/redo** remain consistent.

## What's next

- [Text styles](./text-styles), [Block styles](./block-styles): registering and rendering **`Formatter` / `Attribute`**  
- [Document parsing & compatibility](./document-parse-compat): **`Parser`** → **`Slot`**  
- [Advanced components](./component-advanced): **`getSlots()`**, **`separate`**, **`removeSlot`**
