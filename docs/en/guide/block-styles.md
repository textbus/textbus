---
title: Block styles
description: Attributes on whole slots (textAlign), Attribute.render, applyAttribute, toolbar + Query.
---

# Block styles

This page explains how to use **Attributes** to style **an entire slot**—metadata attached to the **`Slot`** that **`Attribute.render`** applies to the **virtual node that hosts the slot’s content** (often the **`p`** wrapping a paragraph). You should already have the minimal editor from [Getting started](./getting-started); if you have **paragraph** or **Todolist** from [Component basics](./component-basics), attributes apply to their **body slots** the same way (any **`Slot`** that holds document flow can use **`applyAttribute`**).

Division of labor with [Text styles](./text-styles): **Formatters** mark **continuous text ranges** (bold a few characters); **Attributes** target the **whole slot** (align a block, business flags on a slot, …). See [Concepts](./concepts) for the mapping.

## What attributes solve

If every block look were a separate component type, the tree fragments and collaboration merges get heavier. Textbus uses **`Attribute`** for “**whole-slot** settings”:

- **`name`** (string) is **unique** in this editor instance and matches keys in **`slotLiteral.attributes`**; **load and paste** must resolve **`new Textbus({ attributes: [...] })`** by the same names.
- **`render(node, formatValue, renderEnv)`** adjusts the **host `VElement`** on the virtual tree—often **`node.styles`** with **`text-align`**, **`paddingLeft`**, …; **do not replace children**; children still come from **`slot.toTree`** and the format tree.
- At runtime **`Commander.applyAttribute(attribute, value)`** writes using the **selection**; **`unApplyAttribute`** removes one attribute; **`Commander.cleanAttributes`** can drop several at once—the first argument may be an **array of attribute instances to keep**, or **`(attribute) => boolean`** returning **`true`** to **keep**; omitting it behaves like an **empty array** and **clears every attribute** on slots touched by the selection.

## Formatter vs attribute (short table)

| | **Formatter** | **Attribute** |
| --- | --- | --- |
| Scope | A **text range** inside a slot | The **entire slot** |
| Typical use | Bold, font size, links | Alignment, indent, slot-wide flags |
| Write API | **`applyFormat` / `unApplyFormat`** | **`applyAttribute` / `unApplyAttribute`** |
| Read API | **`Query.queryFormat`** | **`Query.queryAttribute`** |

## `Attribute` configuration: `render`

When constructing **`new Attribute<T>(name, config)`**, **`T`** is the value type (alignment often **`string`**, toggles **`boolean`**, …). **`AttributeConfig<T>`** looks like this (verify in **`@textbus/core`** after upgrades); **`onlySelf`** and **`checkHost`** are in **[Optional fields](#optional-attribute-fields)**.

```ts
import type { Slot, VElement } from '@textbus/core'

interface AttributeConfig<T> {
  onlySelf?: boolean
  checkHost?(host: Slot, value: T): boolean
  render(node: VElement, formatValue: T, renderEnv: unknown): void
}
```

**`render`** receives the host **`VElement` before this attribute’s effect**; set styles or other fields on that node. **`renderEnv`** is like the formatter’s render context from **`slot.toTree`**; many custom attributes ignore it.

## Example: `attributes.ts` (`textAlign`)

Write CSS **`text-align`** on the host; values are browser strings (**`'left'`**, **`'center'`**, **`'right'`**, …).

```ts
import { Attribute, VElement } from '@textbus/core'

export const textAlignAttribute = new Attribute<string>('textAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('textAlign', formatValue)
  },
})
```

## Register on `Textbus`

Each attribute belongs in **`new Textbus({ attributes: [...] })`** (or merged from a **`Module`**) so **deserialize** and **paste** can restore **`textAlign`**, etc., by **`name`**.

```ts
const editor = new Textbus({
  components: [/* ... */],
  attributes: [textAlignAttribute],
  imports: [browserModule],
})
```

If **`name`** does not match what was stored, attributes may fail to restore.

## `Commander.applyAttribute` and `unApplyAttribute`

**`applyAttribute(attribute, value)`** chooses **`Slot`** targets from the **selection**:

- **Collapsed caret**: applies via **`selection.commonAncestorSlot`** (**`slot.setAttribute`** internally fires **`onSlotSetAttribute`**, etc.—may be cancelled; see [Component events & lifecycle](./component-events-and-lifecycle)).
- **Expanded selection**: for each **selected scope** (**`getSelectedScopes()`**)—if the range contains **text or inline components**, the attribute is set on the **host slot** of that range; if the range contains **only block children**, **`setAttribute`** runs on **each slot on those child components**.

**`value`** must match **`Attribute<T>`**’s **`T`**.

```ts
import { Commander } from '@textbus/core'
import { textAlignAttribute } from './attributes'

const commander = editor.get(Commander)

commander.applyAttribute(textAlignAttribute, 'center')
```

Clear **one** attribute:

```ts
commander.unApplyAttribute(textAlignAttribute)
```

**`unApplyAttribute`** follows the same selection branches as **`applyAttribute`**, but calls **`removeAttribute`**. To clear **many** attributes at once, use **`Commander.cleanAttributes`** as described above.

## Toolbar: `Query.queryAttribute`

Like **`queryFormat`** in [Text styles](./text-styles), bind after **`editor.render`**: **`editor.get(Commander)`** writes, **`editor.get(Query)`** **`queryAttribute(attribute)`** reads whether the attribute applies and its **`value`**. On **`editor.get(Selection).onChange`**, refresh buttons.

When **`QueryStateType.Enabled`** and **`value`** matches an alignment, set **`data-active`** (styles in **`style.css`**). The sandbox below edits source and uses **Preview** for **left / center / right** and **Clear**.

<TextbusPlayground preset="block-styles" />

In a standalone app, mounting toolbar markup from **`index.html`** and wiring after **`render`** is equivalent. More **`Commander` / `Query`** patterns: [Query & operations](./operations-and-query).

## Working with component structure

- **Attributes decorate the host that wraps the slot**: in a paragraph view that is often the **`p`** in **`adapter.slotRender(slot, children => createVNode('p', …))`**; **`text-align`** needs the **`p`** to be **block-level and full width** for alignment to be visible—narrow **`span`**-like hosts will not show it.
- The **same slot** can carry **multiple format ranges** and **several attributes** (if your rules allow); rendering applies both.
- **Lists, table cells**, etc. behave similarly per slot; **multi-block selections** apply **`applyAttribute`** across blocks—**`queryAttribute`** across mixed values may report **`Normal`** or a partial merge per **`Query`** rules; products often add an “indeterminate” UI.

## Optional fields {#optional-attribute-fields}

These two flags can be added to **`Attribute`** when needed.

### `onlySelf`

**Default `false`.** When **`setAttribute`** runs on a **`Slot`** and **`onlySelf` is `false`**, the kernel **recursively `setAttribute`s nested block slots** under that slot so nested structure carries the same attribute (e.g. keep **emphasis blocks inside a heading** aligned with the outer block).

**`onlySelf: true`** updates **only this slot**, without copying down.

### `checkHost`

Optional; **omit** for no extra guard. **`checkHost(host, value)`** runs **before** apply; **`host`** is the **`Slot`**; return **`false`** to **skip** this apply. Restrict **which schemas** accept the attribute or validate **`value`**.

```ts
import { ContentType } from '@textbus/core'

checkHost(host, value) {
  return host.schema.includes(ContentType.Text)
}
```

## FAQ

- **Button does nothing**: confirm **`attributes`** registered and **`name`** matches stored data; selection must be in **editable flow**, not only the block chrome.
- **Alignment invisible**: ensure the host is **block-level and full width**; **`float`** / **`flex`** on children can change perceived alignment.
- **Clear alignment only**: **`unApplyAttribute`** on that **`Attribute`**; use **`cleanAttributes`** for bulk clears.
- **Child blocks did not update**: use **`onlySelf: true`** when you **do not** want cascading; if cascade **should** happen but does not, check fragments or **`checkHost`** rejecting.

## What's next

- **Selection**: [Selection](./selection)  
- [Query & operations](./operations-and-query)  
- **Text styles (formatters)**: [Text styles](./text-styles)  
- **Component sample**: [Component basics](./component-basics)  
- **Glossary**: [Concepts](./concepts)
