---
title: Query & operations
description: Query for toolbar state, Commander for edits, write/insert/delete/transform, merge rules.
---

# Query & operations

Rich-text toolbars need two things: **what is happening in the current selection** (is this range bold, is it a paragraph, what is alignment), and **how to change the document when the user clicks** (bold, delete, line break). In Textbus the first is **`Query`** (read-only), the second **`Commander`** (writes). Both tie to **[Selection](./selection)**: when the selection changes, query results change; after commands run, the document and selection update.

Before this page, finish [Getting started](./getting-started) and understand **`Formatter`** / **`Attribute`** ([Text styles](./text-styles), [Block styles](./block-styles)). Below, **`editor`** is assumed **`render`**-ready.

---

## Getting `Query` and `Commander`

The kernel exposes **`Commander`** and **`Query`** on **`Textbus`**—use the same **`editor`**. In component **`setup`**, **`useContext(Commander)`** is common for commands (as in [Component basics](./component-basics)); **`Query`** is often taken with **`editor.get(Query)`** in the editor shell or outer UI.

```ts
import { Commander, Query } from '@textbus/core'

const query = editor.get(Query)
const commander = editor.get(Commander)
```

With **no selection** (**`selection.isSelected === false`**), built-in **`Query`** surfaces **`QueryStateType.Normal`** and **`value`** **`null`**. **`Commander`** writes that need a selection typically **`return false`** or bare **`return`** without changing content.

Typical toolbar wiring: **selection changed → re-run queries → refresh buttons**. Minimal example below (**`BoldFormatter`** → your registered **`Formatter`**).

```ts
import { Selection, QueryStateType } from '@textbus/core'

const selection = editor.get(Selection)

selection.onChange.subscribe(() => {
  const bold = query.queryFormat(BoldFormatter)
  boldButton.dataset.active =
    bold.state === QueryStateType.Enabled ? 'true' : ''
})
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">Button state vs <code>QueryStateType</code></div>
<p style="font-size: 12px; margin: 0 0 12px; color: #6e6e73;">Left: query result <strong>Enabled</strong> (format uniform and active in range)—button can look “pressed”. Right: <strong>Normal</strong> (mixed, not fully covered, or no selection)—inactive or a separate “mixed” affordance.</p>
<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center;">
<div style="display: flex; align-items: center; gap: 8px;">
<span style="font-size: 12px; color: #6e6e73;">Enabled</span>
<button type="button" disabled style="padding: 6px 12px; border-radius: 6px; border: 1px solid #07baf3; background: rgba(7,186,243,0.2); color: #0596c8; font-weight: 700; cursor: default;">B</button>
</div>
<div style="display: flex; align-items: center; gap: 8px;">
<span style="font-size: 12px; color: #6e6e73;">Normal</span>
<button type="button" disabled style="padding: 6px 12px; border-radius: 6px; border: 1px solid #c7c7cc; background: #fff; color: #3c3c43; font-weight: 700; opacity: 0.55; cursor: default;">B</button>
</div>
</div>
</div>

---

## `Query`: reading formats, attributes, and components

**`Query`** never edits the document; it returns **`QueryState<T>`**: **`state`** is **`QueryStateType`**; when **`state === Enabled`**, **`value`** is **`T`** (format value, attribute value, component instance, …); otherwise **`value`** is **`null`**.

```ts
import { Query, QueryStateType } from '@textbus/core'

interface QueryState<V, S = QueryStateType, K = S extends QueryStateType.Enabled ? V : null> {
  state: S
  value: K
}

enum QueryStateType {
  Normal = 'Normal',
  Disabled = 'Disabled',
  Enabled = 'Enabled',
}
```

Built-in **`Query`** on implemented paths returns only **`Normal`** and **`Enabled`**. **`Disabled`** remains for custom **`Query`** extensions (“operation unavailable”, …).

### Format: `queryFormat` / `queryFormatByRange`

Whether a **`Formatter`** is **fully covered with one consistent value** in the range. **Collapsed caret**: check **to the left** of the caret. **Range**: if any unformatted span, mixed values for the same format, or subtree inconsistency after crossing components → **`Normal`**. Uniform coverage → **`Enabled`** with **`value`**.

```ts
const bold = query.queryFormat(BoldFormatter)

if (bold.state === QueryStateType.Enabled && bold.value) {
  // Selection treated as uniformly bold with consistent value
}
```

### Attribute: `queryAttribute` / `queryAttributeByRange`

**Slot attributes**. Collapsed: judged on the **common-ancestor slot** as a **whole slot**. Expanded: merges **`getSelectedScopes`** segments—rules in [Block styles](./block-styles). Merge failure → **`Normal`**; uniform → **`Enabled`** with **`value`**.

```ts
const align = query.queryAttribute(TextAlignAttribute)
```

### Component: `queryComponent` / `queryWrappedComponent`

**`queryComponent`**: from each **`Range`**’s start/end **`Slot`**, walk ancestors for the **first** **`Component`** matching the constructor; multiple ranges → **`mergeState`**. **`queryWrappedComponent`**: requires **non-collapsed** selection that **exactly wraps** one component (whole paragraph selected → often **`Enabled`**; caret inside paragraph → **`queryComponent`** is usually better).

```ts
const para = query.queryComponent(ParagraphComponent)
const wrapped = query.queryWrappedComponent(ParagraphComponent)
```

### Snapshot ranges: `*ByRange`

**`queryFormatByRange`**, **`queryAttributeByRange`**, **`queryComponentByRange`**, **`queryWrappedComponentByRange`** take an explicit **`Range`** (**`startSlot` / `startOffset` / `endSlot` / `endOffset`**) for intervals other than the current **`Selection`** (e.g. plugin cached a preview range).

```ts
const q = query.queryFormatByRange(BoldFormatter, {
  startSlot,
  startOffset: 0,
  endSlot,
  endOffset: endSlot.length,
})
```

---

## Merge rules and toolbar feedback

With multi-range selections, **`Query`** feeds segment results into **`mergeState`**: if **any** segment is **`Normal`**, merged result is **`{ state: Normal, value: null }`**.

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">After merge becomes Normal</div>
<p style="font-size: 12px; margin: 0; color: #6e6e73;">Multiple disjoint selections with inconsistent format values merge to <strong>Normal</strong>; toolbar can stay inactive or show a “mixed” state instead of implying all-on / all-off.</p>
</div>

- **Format**: same **`Formatter`** must be **continuous per segment with one value** across the selection → **`Enabled`**; else **`Normal`**.
- **Attribute / component**: multiple blocks with **different values** or **different instances** → **`Normal`**. To highlight when **any** block matches (e.g. alignment), **walk **`Selection`** / **`Slot`** yourself**—do not rely on built-in **`mergeState`** alone.

---

## `Commander`: changing the document

**`Commander`** exposes high-level writes: methods update data while the kernel keeps **selection and document in sync** and **emits change events**, without wiring low-level steps yourself.

## `write`: insert content with neighborhood formats

Writes **`content`** (string or **`Component`**) at the selection. **Non-collapsed**: deletes the selection first. If the slot accepts insertion, **inheritable** formats from the **left neighborhood** that match the **right** side of the insertion point are **merged** into this write; then your explicit formats apply. Returns **`true`** on success, **`false`** otherwise.

**Overloads** (distinguished by 2nd/3rd args):

1. **`write(content, formats?)`**: second arg is **`Formats`**; omit → neighborhood merge only.
2. **`write(content, formatter, value?)`**: second arg is one **`Formatter`**, third is **`value`**. If the second arg is actually an array, it is treated as **`Formats`** plus neighborhood merge—same as passing a full **`Formats`** object.

**`write(content)`** (no explicit formats, neighborhood merge only):

```ts
commander.write('Hello')
```

**`write(content, formats)`** (explicit **`Formats`** + neighborhood merge):

```ts
commander.write('mixed', [
  [BoldFormatter, true],
  [ItalicFormatter, true],
])
```

**`write(content, formatter, value?)`** (single formatter):

```ts
commander.write('Title', headingFormatter, true)
```

## `insert`: insert content

Inserts **`content`** at the selection. **Non-collapsed**: deletes selection first. Unlike **`write`**: **no** neighborhood merge—only formats you pass. Returns **`boolean`**.

**Overloads**:

1. **`insert(content, formats?)`**: second is **`Formats`** (**`[Formatter, value][]`**); omit → no extra formats.
2. **`insert(content, formatter, value?)`**: second is one **`Formatter`**, third **`value`**; if second is an array → parsed as **`Formats`** (same as **`write`**).

**`insert(content)`**:

```ts
commander.insert('plain text')
```

**`insert(content, formats)`**:

```ts
commander.insert('mixed', [
  [BoldFormatter, true],
  [ItalicFormatter, true],
])
```

**`insert(content, formatter, value?)`**:

```ts
commander.insert('plain text', plainFormatter, value)
```

## `delete`: delete

**Non-collapsed**: deletes the range. **Collapsed**: direction from **`deleteBefore`**—**`true`** (default) deletes **backward** (Backspace-like); **`false`** deletes **forward** (Delete-like). Optional **`receiver`** receives **`Slot`** snapshots from **`slot.cut`** during deletion. Returns **`boolean`** if something was deleted.

**Overloads**:

1. **`delete(deleteBefore?)`**: direction only.
2. **`delete(receiver, deleteBefore?)`**: first arg **`(slot: Slot) => void`** called with cut **`Slot`** fragments; second **`deleteBefore`** (defaults **`true`**).

Note: a **single boolean** uses overload **1** (no **`receiver`**).

**`delete(deleteBefore?)`**:

```ts
commander.delete()
```

```ts
commander.delete(false)
```

**`delete(receiver, deleteBefore?)`**:

```ts
commander.delete(cutSlot => {
  // handle Slot fragments cut during this delete
})
```

```ts
commander.delete(cutSlot => {
  /* ... */
}, false)
```

## `break`: line break

Simulates **Enter**. **Non-collapsed**: clears selection first; then parent **`onBreak`** (see [Component events & lifecycle](./component-events-and-lifecycle)). Default path may **`write`** a newline; how paragraphs split depends on **`ParagraphComponent`**, etc. Returns **`boolean`**: **`true`** if **`onBreak`** was not **`preventDefault`**.

```ts
commander.break()
```

## `applyFormat`: apply text format

Applies a text format to the **current selection**. Collapsed caret, **`Slot.placeholder`**, overlap with **`Formatter`**, …—[Text styles](./text-styles). Parent **`onSlotApplyFormat`** may **`preventDefault`** ([Component events & lifecycle](./component-events-and-lifecycle)).

```ts
commander.applyFormat(BoldFormatter, true)
```

## `unApplyFormat`: remove text format

Removes the given **`Formatter`** from the **current selection**.

```ts
commander.unApplyFormat(BoldFormatter)
```

## `cleanFormats`: clear text formats

Clears formats in the current selection. Optional **`remainFormats`** defaults **`[]`**: **formats listed are kept** (not cleared). Two forms:

- Array of **`Formatter`** instances: those formats **stay**.
- Predicate **`(formatter: Formatter) => boolean`**: **`true`** means **keep** that format.

**No args** (clear everything in scope):

```ts
commander.cleanFormats()
```

**Keep list**:

```ts
commander.cleanFormats([BoldFormatter])
```

**Keep predicate**:

```ts
commander.cleanFormats(f => f === BoldFormatter)
```

## `applyAttribute`: set slot attribute

Sets **slot attributes** from the **current selection**—semantics in [Block styles](./block-styles). **`onSlotSetAttribute`** may block ([Component events & lifecycle](./component-events-and-lifecycle)).

```ts
commander.applyAttribute(TextAlignAttribute, 'center')
```

## `unApplyAttribute`: remove slot attribute

Removes the given **`Attribute`** from the **current selection**.

```ts
commander.unApplyAttribute(TextAlignAttribute)
```

## `cleanAttributes`: clear slot attributes

Clears attributes on slots touched by the selection. Optional **`remainAttributes`** mirrors **`cleanFormats`**: array of **`Attribute`** instances or **`(attribute: Attribute) => boolean`** predicate listing **what to keep**.

**No args**:

```ts
commander.cleanAttributes()
```

**Keep list**:

```ts
commander.cleanAttributes([TextAlignAttribute])
```

**Keep predicate**:

```ts
commander.cleanAttributes(a => a === TextAlignAttribute)
```

## `copy`: copy

Passes current selection content to **`adapter.copy()`** and the **system clipboard** (depends on **`Adapter`**). **No return value** (success not represented here).

```ts
commander.copy()
```

## `cut`: cut

Runs **`copy`**; if selection is **not collapsed**, then **`delete`** on the range. **Collapsed**: does not delete body text, returns **`false`**; otherwise returns **`delete`**’s **`boolean`**.

```ts
const ok = commander.cut()
```

## `paste`: paste

**`pasteSlot`** is structured content to insert; **`text`** is parallel plain text for **`onPaste`**, etc. **Non-collapsed**: **`delete`** first. Dispatches **`onPaste`** on **`commonAncestorComponent`** ([Component events & lifecycle](./component-events-and-lifecycle)); if not prevented, incremental write. **`false`** if **`pasteSlot.isEmpty`**, no selection, or insert fails; **`true`** on success.

```ts
const ok = commander.paste(pasteSlot, plainText)
```

## `insertBefore`: insert before a reference component

In the **parent slot** of **`ref`**, inserts **`newChild`** **before** **`ref`**.

```ts
commander.insertBefore(newChild, refComponent)
```

## `insertAfter`: insert after a reference component

In the **parent slot** of **`ref`**, inserts **`newChild`** **after** **`ref`**.

```ts
commander.insertAfter(newChild, refComponent)
```

## `replaceComponent`: replace a component

Removes **`oldComponent`** and inserts **`newComponent`** **at the same index** (swap card types, …).

```ts
commander.replaceComponent(oldCard, newCard)
```

## `removeComponent`: delete a component

Deletes **`component`** wholesale—like selecting that block cell in the parent slot and deleting.

```ts
commander.removeComponent(card)
```

## `transform`: transform selection structure

**`transform`** applies a **structural edit** to the **current selection** using **`TransformRule`**: moves selected text and nested content into **new slots**, then builds **new block components** and writes them back. Typical: **paragraph ↔ list item**, **one span → several blocks**. Complex blocks (multi-slot, tables, splittable lists) need clear contracts on **what slots accept** and **how to split blocks**—see [Advanced components](./component-advanced) (**`getSlots()`**, **`separate`**), or you get “half updated” or overly fragmented output.

Unlike chained **`cut` / `replaceComponent`**, **`transform`** does “read selection → build slots → emit components” in **one** call.

### Preconditions and return value

- **No selection**: **`transform`** returns **`false`**, document unchanged.
- **With selection**: usually returns **`true`** when the **`transform`** pipeline finishes—**not** a guarantee the tree matches your intent; verify in the UI / tree.
- **Multiple disjoint ranges**: tries each segment in order; if one segment cannot transform, later segments may be skipped while the call still **`return true`**. **Do not rely on the return value alone** as success.

### `TransformRule` fields

| Field | Meaning |
| --- | --- |
| **`targetType`** | **`ContentType`**—use the target component’s **`static type`** from **`stateFactory`**. E.g. **`ParagraphComponent`** blocks use **`ContentType.BlockComponent`**; inline components use **`ContentType.InlineComponent`**. Child **`Slot`** **`schema`** (e.g. **`ContentType.Text`**) comes from **`slotFactory`**, distinct from **`targetType`**. |
| **`slotFactory(from)`** | Creates an **empty slot** for body content when needed; **`from`** is the **parent component** so you can create list-item slots, table cells, … at the right level. **Slot-level styling (attributes)** on moved fragments is generally preserved on new slots (see runtime behavior). |
| **`stateFactory(slots, textbus)`** | Given prepared slots, produce the block instances to insert (e.g. one **`ParagraphComponent`** per slot). Return values are written back in order. |

**`TransformRule`** = **`targetType`** + **`slotFactory`** + **`stateFactory`**.

Transforms rewrite the tree near the selection and may move the caret. Mismatches with parent **`schema`**, **`separate`**, … often show as partial updates or shards—hooks on the same pipeline: [Component events & lifecycle](./component-events-and-lifecycle).

### Example: selection → multiple paragraphs

Assume **`ParagraphComponent`** is registered ([Getting started](./getting-started), [Component basics](./component-basics)), **`static type`** **`ContentType.BlockComponent`**. **`targetType`** → **`ContentType.BlockComponent`**; body **`Slot`** with text only via **`slotFactory`** → **`new Slot([ContentType.Text])`**.

```ts
import type { TransformRule } from '@textbus/core'
import { ContentType, Slot, Textbus } from '@textbus/core'
// ParagraphComponent: your registered paragraph block

const paragraphTransform: TransformRule = {
  targetType: ContentType.BlockComponent,
  slotFactory() {
    return new Slot([ContentType.Text])
  },
  stateFactory(slots: Slot[], _textbus: Textbus) {
    return slots.map(body => new ParagraphComponent({ slot: body }))
  },
}

commander.transform(paragraphTransform)
```

**`ParagraphComponent`** must appear in **`new Textbus({ components: [...] })`**. For list ↔ paragraph, **`stateFactory`** emits list-item components; **`targetType`** is usually still **`ContentType.BlockComponent`**; body **`schema`** still from **`slotFactory`**.

### Failure modes

- **`targetType`**, **`slotFactory`**, and **`schema`** disagree → partial rewrites or shattered blocks.
- **Tables / multi-slot lists**: **`separate`**, **`getSlots()`** order—[Advanced components](./component-advanced); align with product first.
- **Hooks**: paste, break, … share the editing pipeline—[Component events & lifecycle](./component-events-and-lifecycle).

---

## Quick reference

**`Commander`**

| Method | Summary |
| --- | --- |
| **`transform(rule)`** | **`TransformRule`** (**`targetType` / `slotFactory` / `stateFactory`**) |
| **`write`** | **`write(content)` / `write(content, formats)` / `write(content, formatter, value?)`**—neighborhood inheritable merge |
| **`insert`** | **`insert(content)` / `insert(content, formats)` / `insert(content, formatter, value?)`**—explicit formats only |
| **`delete`** | **`delete(deleteBefore?)`** or **`delete(receiver, deleteBefore?)`** |
| **`break`** | Enter |
| **`insertBefore`** | Before reference component |
| **`insertAfter`** | After reference component |
| **`replaceComponent`** | Replace block at same index |
| **`removeComponent`** | Delete whole block |
| **`copy`** | Clipboard |
| **`cut`** | **`copy`** then **`delete`** if not collapsed; **`boolean`** |
| **`paste`** | **`paste(pasteSlot, text)`**; **`boolean`** |
| **`cleanFormats`** | Clear formats; optional keep list or predicate |
| **`applyFormat`** | Apply format |
| **`unApplyFormat`** | Remove format |
| **`cleanAttributes`** | Clear attributes; optional keep list or predicate |
| **`applyAttribute`** | Set attribute |
| **`unApplyAttribute`** | Remove attribute |

**`Query`**

| Method | Summary |
| --- | --- |
| **`queryFormat` / `queryFormatByRange`** | Uniform format coverage |
| **`queryAttribute` / `queryAttributeByRange`** | Slot attributes |
| **`queryComponent` / `queryComponentByRange`** | Component along ancestors |
| **`queryWrappedComponent` / `queryWrappedComponentByRange`** | Selection wraps one component |

---

## FAQ

- **Command always `false`**: check **`selection.isSelected`**; hooks **`onContentInsert` / `onBreak` / `onPaste`** **`preventDefault`**? ([Component events & lifecycle](./component-events-and-lifecycle))
- **`queryFormat` bold but `Normal`**: cross-format boundaries or mixed values? collapsed caret position? ([Selection](./selection))
- **`queryWrappedComponent` always `Normal`**: collapsed selection or not whole-block—use **`queryComponent`** or **`selectComponent`**.
- **`paste` no-op**: **`pasteSlot.isEmpty`**, **`onPaste`** cancelled ([Component events & lifecycle](./component-events-and-lifecycle)); clipboard needs **`Adapter`** / **`BrowserModule`**.

## What's next

- **Undo / redo**: [History](./history)  
- **Shortcuts**: [Shortcuts & grammar](./shortcuts-and-grammar)  
- **Component hooks**: [Component events & lifecycle](./component-events-and-lifecycle)  
- **Glossary**: [Concepts](./concepts)
