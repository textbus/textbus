---
title: Selection
description: Caret and ranges, Selection API, paths, native sync, scopes, and table-style ranges.
---

# Selection

The editor’s **caret** or **highlighted span** is modeled as a **selection**: which **slot** it sits in, and **from which offset to which**. Insertion, deletion, bold, toolbar state, IME, and collaboration cursors all depend on it.

The **method names and field names** below match the public **`Selection`**, **`Range`**, … APIs. Slots and document flow: [Component basics](./component-basics); block attributes vs selection: [Block styles](./block-styles); queries and commands: [Query & operations](./operations-and-query).

## Intuition: what is an offset?

Treat slot contents as a sequence: **strings** use one cell per character, **components** use one cell per node. An offset is where you draw the **caret line to the left** of an item: for **`hello`** (length 5), valid offsets are **`0`–`5`** (**`5`** means **after** the last letter—the usual “caret at end of word”).

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">Index diagram (single line)</div>
<p style="font-family: ui-monospace, monospace; font-size: 13px; margin: 0.5em 0 0;">
  <span style="opacity:0.75">0</span>&nbsp;<span style="opacity:0.75">1</span>&nbsp;<span style="opacity:0.75">2</span>&nbsp;<span style="opacity:0.75">3</span>&nbsp;<span style="opacity:0.75">4</span>&nbsp;<span style="opacity:0.75">5</span><br />
  h&nbsp;e&nbsp;l&nbsp;l&nbsp;o<br />
  <span style="border-left: 2px solid var(--vp-c-brand-1); padding-left: 2px;">Caret at 2: to the left of <code>l</code></span>
</p>
</div>

**Collapsed** means **start** and **end** coincide—one caret; **non-collapsed** is a dragged range (**anchor** vs **focus**, see table below).

## Getting the selection and subscribing to changes

After the editor **`render`** is ready, read from the **`Textbus`** instance; inside a component **`setup`** you can also **`useContext(Selection)`** (same system as placing the caret on a paragraph in Getting started).

```ts
import { Selection } from '@textbus/core'

const selection = editor.get(Selection)

selection.onChange.subscribe(() => {
  // Selection changed: refresh toolbar, persist caret for drafts, etc.
})
```

**`onChange`** emits a snapshot with **anchor** and **focus** when there **is** a selection, and **`null`** when there is **none**. Toolbars often combine with **`Query`**: in the **`subscribe`** callback, branch on **`null`** before refreshing queries.

## Reading current state

These **read-only** properties are for logging and UI logic—do **not** treat them as writable fields.

| Idea | Meaning |
| --- | --- |
| Whether there is a selection | You have a selection only when **start slot**, **start offset**, **end slot**, and **end offset** are all defined; if any is missing, APIs behave like **no selection**. |
| Single caret vs highlight | With a selection, if **start** and **end** share the **same slot and offset** → **collapsed** (caret); otherwise it is a range. |
| Start / end | The selection is **normalized** along document flow: **start** is **not after** **end** (even if you dragged right-to-left on screen). |
| Anchor / focus | **Anchor** is the slot + offset where the drag **began**; **focus** is where it **ended**. When you extend the range without moving the start, **focus** moves. Use these when you care which end grows. |
| Common “shell” | **Common ancestor slot** and **common ancestor component**: the first slot or component that contains both ends—useful for bubble menus or “am I inside this table?”. |

Collapsed still counts as **having** a selection; range-based commands treat it as **length 0** at one point.

## Setting caret and range

When the document is **read-only**, methods that **change the selection** do nothing.

**Place the caret** (collapsed):

```ts
selection.setPosition(slot, offset)
```

**Highlight from A to B** (may cross slots): set **anchor** then **focus**, or both at once. Below: inside **one** slot, select the middle three letters of **`hello`** (**`1`–`4`** covering **`ell`**):

```ts
selection.setBaseAndExtent(slot, 1, slot, 4)
selection.setAnchor(slot, 1)
selection.setFocus(slot, 4)
```

**Start / end** land on the earlier / later ends in **document order**; **anchor** and **focus** keep **drag direction** for “extend focus only” later.

**Select everything in one slot** (non-collapsed, **`0`** to **`slot.length`**):

```ts
selection.selectSlot(slot)
```

## Positioning by component

These take a **component instance** (e.g. a **`ParagraphComponent`**). The instance must **already be in the current tree**—use the same reference as after **`editor.render`**.

### Caret at the first / last place you can type

Collapsed caret at the **first editable position** (usually first child slot, earliest offset):

```ts
selection.selectFirstPosition(paragraph)
```

With nested structure, go **all the way down** first—pass **`true`** for the third argument **`deep`**:

```ts
selection.selectFirstPosition(paragraph, false, true)
```

Collapsed caret at the **last editable position** (usually last slot, after the last character):

```ts
selection.selectLastPosition(paragraph)
```

Also supports **`deep`**:

```ts
selection.selectLastPosition(paragraph, false, true)
```

**`selectLastPosition`** and **`selectFirstPosition`** share the same signature: **`(instance, isRestore?, deep?)`**.

### Caret before or after a whole component

Without entering the block—caret in the **parent slot** in the gap **before** or **after** this component—good for “insert after this block” or “caret before the heading”:

```ts
selection.selectComponentFront(paragraph)
selection.selectComponentEnd(paragraph)
```

### Select the whole block

Range covers **only this block** (parent slot from this item to the next)—for “align whole block”, delete block, or queries that “wrap the component” in [Query & operations](./operations-and-query):

```ts
selection.selectComponent(paragraph)
```

### From first child slot through last child slot

When a component has **several child slots** (columns, table cells, …), select from the **start of the first** to the **end of the last**:

```ts
selection.selectChildSlots(blockWithManySlots)
```

If there are **no** child slots, behaves like **`selectComponent`**.

### After changing selection, sync the blue highlight on screen

When the second argument **`isRestore`** is **`true`**, the **native** selection is updated immediately (same as **“Sync with the browser highlight”** below):

```ts
selection.selectFirstPosition(paragraph, true)
selection.selectLastPosition(paragraph, true)
selection.selectComponent(paragraph, true)
```

## Moving the caret and collapsing the range

**Collapse** and **move by character / line** share this API—typical for **arrow keys** or toolbar buttons.

### Collapse range to a caret: `collapse`

From a **non-empty** range to **collapsed**, keeping either **start** or **end**:

```ts
selection.collapse()
selection.collapse(true)
```

### Move one step forward / backward in flow: `toPrevious` / `toNext`

When **collapsed**, move the caret **one position** along content order (crossing component boundaries follows editor rules):

```ts
selection.toPrevious()
selection.toNext()
```

If there is a **range**, it **collapses** first (similar to **`collapse()`** then move). When crossing a **fully selected block**, the component may **intercept** the move (**`preventDefault`** on selection hooks—see [Component events & lifecycle](./component-events-and-lifecycle)).

### Move to visual previous / next line: `toPreviousLine` / `toNextLine`

Move a **collapsed** caret to the **visual** line above or below (column roughly preserved). “Line” means **wrapped line** in layout, not a newline character in the slot; needs **DOM line geometry** (browser)—if the target line cannot be resolved, **selection unchanged**.

```ts
selection.toPreviousLine()
selection.toNextLine()
```

### After programmatic moves, sync the highlight

**`collapse`**, **`toNext`**, **`toPreviousLine`**, … update **kernel selection only**. If the **page highlight** does not update (e.g. after a button click), call **`restore()`** at the end (**`nativeSelectionDelegate`** must be on—see **“Sync with the browser highlight”**):

```ts
selection.toNext()
selection.restore()
```

## Extending the selection: move focus only

After a drag, to **fix the anchor** and only **extend or shrink the focus end**, use:

### Same visual line, extend left / right

```ts
selection.wrapToAfter()
selection.wrapToBefore()
```

### Move focus to previous / next line

```ts
selection.wrapToPreviousLine()
selection.wrapToNextLine()
```

“Previous/next line” matches **`toPreviousLine` / `toNextLine`**—**wrapped lines** on screen; **`wrapTo*Line`** moves **focus** to **grow the range**, not a collapsed caret.

To bind keys, see [Shortcuts & grammar](./shortcuts-and-grammar).

## Select all, clear selection

### Select the whole document: `selectAll`

From the **start of the first root-level slot** to the **end of the last**; multiple root slots follow **root slot list order**.

```ts
selection.selectAll()
```

### Clear selection: `unSelect`

Clears the current selection; with browser sync, the **page highlight** disappears too.

```ts
selection.unSelect()
```

Same effect as **`setSelectedRanges([])`** (see **Custom selected ranges**).

## Snapshots: temporary changes then restore

Paste or open overlays often need to **remember** the user’s selection:

```ts
const snapshot = selection.createSnapshot()
// ... change selection, insert content ...
snapshot.restore()
```

**`restore(true)`** restores the model **and** pushes the **page highlight**; no-arg restores **kernel selection only**.

If **slots** or nodes in the snapshot were **deleted**, **`restore()`** cannot land safely—handle in app code.

## How the selection is split into pieces

[Query & operations](./operations-and-query): delete, bold, clear format, etc. first split the selection into **slot spans**. These APIs **read the same splits** or **preview** a range **without** changing the current highlight.

### `getRanges`: spans with start/end slot + offset

```ts
const ranges = selection.getRanges()
```

Each item has **`startSlot`**, **`endSlot`**, **`startOffset`**, **`endOffset`** for one continuous piece.

**Typical shape**: one paragraph, one highlight → **`ranges`** often has **one** item—both ends in that text slot. **Multiple disjoint** regions (e.g. table) → **multiple** items.

### `getSelectedScopes`: per-slot start/end index

```ts
const scopes = selection.getSelectedScopes()
const scopesFiner = selection.getSelectedScopes(true)
```

Each item: **`slot`**, **`startIndex`**, **`endIndex`**.

**Typical shape**: highlight only in **one** text slot → often **one** scope; **`startIndex`–`endIndex`** matches the range. **Collapsed** caret often **`startIndex === endIndex`**. Second argument **`true`**: split further at **block child boundaries** when a span spans several block siblings—**usually a longer array** than **`false`**.

### `getScopes`: fixed endpoints without changing selection

Does **not** change current selection; same decomposition as **`getSelectedScopes()`** would give for that range.

```ts
const pieces = selection.getScopes(
  startSlot,
  startOffset,
  endSlot,
  endOffset,
  false,
)
```

Optional fifth **`discardEmptyScope`**: **`true`** drops segments where **`startIndex === endIndex`**; default **`false`** keeps zero-length segments.

**Typical use**: you know **start slot/offset** and **end slot/offset** (same info as one **`getRanges()`** item) but **don’t** want to move the caret—**`pieces`** is what **`getSelectedScopes()`** would return **if** that were the selection.

## Custom selected ranges

**`setSelectedRanges(ranges)`** registers each **`{ slot, startIndex, endIndex }`** as a logical **selected chunk**; afterward **`getRanges()`** / **`getSelectedScopes()`** follow these chunks instead of only the single normalized anchor–focus span. **Empty array** equals **`unSelect()`** and clears that registration.

**Rectangular table selection** (Excel-style corner drag) is **not** the same as the **single continuous range** from anchor to focus along **document order**. Diagonal corners can be **far apart in flow**, pulling in cells that are **not** in the visual rectangle—so **default selection** cannot express box selection; tables usually **customize** with **`setSelectedRanges`** and/or **`onGetRanges`**.

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">Rectangular box vs document-flow selection (same diagonal start/end cells)</div>
<p style="font-size: 12px; margin: 0 0 12px; color: #6e6e73;">Grid **7** columns × **3** rows; cells numbered **1–21** row-major. Drag from **10** to **18** (diagonal corners). Excel-style hull is cells **10, 11, 17, 18**; document-order selection from **10** through **18** includes **nine** cells (**12–16** lie outside the rectangle).</p>
<div style="display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start;">
<div>
<p style="font-size: 13px; font-weight: 600; margin: 0 0 8px;">Rectangular box (table semantics)</p>
<table style="border-collapse: collapse; font-family: ui-monospace, monospace; font-size: 12px;">
<tr>
<td style="border:1px solid #c7c7cc;width:44px;height:44px;text-align:center;vertical-align:middle;">1</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">2</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">3</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">4</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">5</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">6</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">7</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">8</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">9</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;line-height:1.25;padding:3px;">10<br /><span style="font-size:10px;font-weight:700;color:#0596c8;">Start</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;">11</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">12</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">13</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">14</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">15</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">16</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;">17</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(7,186,243,0.28) !important;line-height:1.25;padding:3px;">18<br /><span style="font-size:10px;font-weight:700;color:#0596c8;">End</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">19</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">20</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">21</td>
</tr>
</table>
<p style="font-size: 12px; margin: 8px 0 0; color: #6e6e73;">Light blue: cells **10, 11, 17, 18** (**Start** / **End** at diagonal **10** and **18**).</p>
</div>
<div>
<p style="font-size: 13px; font-weight: 600; margin: 0 0 8px;">Default document-flow selection</p>
<table style="border-collapse: collapse; font-family: ui-monospace, monospace; font-size: 12px;">
<tr>
<td style="border:1px solid #c7c7cc;width:44px;height:44px;text-align:center;vertical-align:middle;">1</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">2</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">3</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">4</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">5</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">6</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">7</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">8</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">9</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;line-height:1.25;padding:3px;">10<br /><span style="font-size:10px;font-weight:700;color:#b45309;">Start</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">11</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">12</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">13</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">14</td>
</tr>
<tr>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">15</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">16</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;">17</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;background:rgba(255,149,0,0.35) !important;line-height:1.25;padding:3px;">18<br /><span style="font-size:10px;font-weight:700;color:#b45309;">End</span></td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">19</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">20</td>
<td style="border:1px solid #c7c7cc;text-align:center;vertical-align:middle;">21</td>
</tr>
</table>
<p style="font-size: 12px; margin: 8px 0 0; color: #6e6e73;">Orange: **10–18** as nine contiguous cells in order; **12–16** are outside the left rectangle.</p>
</div>
</div>
</div>

**API difference vs default selection**: normal drag or **`setBaseAndExtent`** still yields **one continuous** span from normalized start to end; commands that only understand that span assume “everything between counts.” Box selection needs **multiple body spans**—**`getRanges()`** as one long chunk won’t match **per-cell** highlights. Implementations usually use **`setSelectedRanges`** and/or **`onGetRanges`** so **`getRanges()`** returns **multiple** pieces.

Example: **`slotA`** and **`slotB`** are body slots in **two different cells**:

```ts
selection.setSelectedRanges([
  { slot: slotA, startIndex: 0, endIndex: slotA.length },
  { slot: slotB, startIndex: 2, endIndex: 7 },
])
```

Clear multi-range registration:

```ts
selection.setSelectedRanges([])
```

## Paths: `getPaths` and `usePaths`

A **position** (slot + offset) can be encoded as **numbers**: walk from the **root**, alternating **which child slot index** under the parent and **which child (component or string)** inside the current slot, until you reach the **target slot**; one more number is the **offset inside that slot**—same scale as **`setBaseAndExtent`**.

**`anchor` / `focus`** paths packaged as **`SelectionPaths`** describe **both ends** of the highlight (**anchor** and **focus**, **not** normalized start/end).

### `getPaths`

Serialize the current selection. With **no** selection, **`anchor`** and **`focus`** are **empty arrays**; with a selection, each path is **indices from root to slot**, **last number = offset inside that slot**.

```ts
const paths = selection.getPaths()
// paths.anchor / paths.focus: last item is offset in slot; earlier items locate the slot from root
```

### `usePaths`

Restore a saved highlight from **`paths.anchor`** / **`paths.focus`** via **`setBaseAndExtent`**. If **either** end fails to resolve on the current tree, **selection is unchanged**.

```ts
selection.usePaths(paths)
```

### `getPathsBySlot`

When you already hold a **`Slot`**, get **only** the path **root → slot** (**no** offset). Returns **`null`** if the slot is not under the current root.

```ts
const slotOnly = selection.getPathsBySlot(someSlot)
```

### `findSlotByPaths` and `findComponentByPaths`

Reverse lookup: argument is indices that describe **walking to a slot only**—**do not** include the **trailing offset** like **`getPaths()`**. **`findSlotByPaths`** returns the **`Slot`** if the walk succeeds; **`findComponentByPaths`** with **`[]`** returns the **root component**; with a non-empty path returns a **`Component`** if the endpoint is a component, **`null`** if it stops on a slot—**complementary** to **`findSlotByPaths`**.

These methods **mutate** the passed array (**`shift`** internally)—**copy** with **`[...paths]`** if you need to keep it.

```ts
const copy = [...(slotOnly ?? [])]
const slotAgain = selection.findSlotByPaths(copy)

const root = selection.findComponentByPaths([])
```

## Sync with the browser highlight

On the browser platform, kernel anchor/focus map to the **native** selection. **`nativeSelectionDelegate`** controls whether sync runs; startup usually sets it **`true`**.

### `nativeSelectionDelegate`

**`true`**: document selection and page highlight stay in sync; **`false`** disconnects **`@textbus/platform-browser`** bridging—the kernel **does not** push to the page. Use **`false`** only when you temporarily disable sync.

```ts
selection.nativeSelectionDelegate = true
```

### `restore`

Push **kernel selection** to the **native** selection immediately.

```ts
selection.setPosition(slot, offset)
selection.restore()
```

## Cross-block decomposition and ancestor helpers

Used in **tables**, **nested blocks**, and **plugins** to walk **by block**, convert selection in **ancestor coordinates**, or **preview** the next position **without** changing selection.

### `getBlocks` and `getGreedyRanges`

**`getGreedyRanges()`** expands both ends **along lines** as far as allowed without splitting a block child in the middle, yielding **`SlotRange`** pieces. **`getBlocks()`** further **splits by block**—each item **`{ slot, startIndex, endIndex }`** for per-block handling.

```ts
const greedy = selection.getGreedyRanges()
const blocks = selection.getBlocks()
```

### `getCommonAncestorSlotScope` and `getSlotRangeInCommonAncestorComponent`

**`getCommonAncestorSlotScope()`**: under the **common ancestor slot**, maps both ends to **child slots/components** and index ranges (custom geometry). **`getSlotRangeInCommonAncestorComponent()`**: under the **common ancestor component**, span **from child slot index through end** (**`endOffset`** half-open). May be **`null`** with no common ancestor or no selection.

```ts
const scope = selection.getCommonAncestorSlotScope()
const slotSpan = selection.getSlotRangeInCommonAncestorComponent()
```

### `getNextPositionByPosition` / `getPreviousPositionByPosition`

Given **slot + offset**, return the **next / previous** valid **`SelectionPosition`** (**`slot`** + **`offset`**) **without** changing selection.

```ts
const next = selection.getNextPositionByPosition(slot, offset)
const prev = selection.getPreviousPositionByPosition(slot, offset)
```

### `findFirstPosition` / `findLastPosition`

Find **first / last** caret depth inside the **`slot`** subtree; second arg **`toChild`** **`true`** (default) **descends** into child components’ deepest slots.

```ts
const first = selection.findFirstPosition(slot)
const last = selection.findLastPosition(slot, true)
```

## `Selection` static methods

**No current selection needed**: given **`startSlot` / `startOffset` / `endSlot` / `endOffset`**, use **`Selection.getCommonAncestorSlot`**, **`Selection.getCommonAncestorComponent`**, **`Selection.getSelectedScopes`**, **`Selection.getScopes`**, …—same decomposition as instance methods. Args are **`Range`**-shaped.

```ts
import { Selection } from '@textbus/core'

const ancestorSlot = Selection.getCommonAncestorSlot(startSlot, endSlot)

const scopes = Selection.getSelectedScopes(
  { startSlot, startOffset, endSlot, endOffset },
  false,
)
```

## Destroy

**`destroy()`** tears down **`onChange`** subscriptions—call when **`Textbus`** / editor shuts down to avoid leaks. Differs from per-component **`onDetach`**, etc.—see [Component events & lifecycle](./component-events-and-lifecycle).

## FAQ

- **Caret set in code but no highlight**: enable **`nativeSelectionDelegate`**; after changes call **`restore()`**.
- **`restore()` when there is no selection**: kernel **has no** selection → **`restore()`** **clears** the native highlight (still requires **`nativeSelectionDelegate`** **`true`**).
- **`restore(fromLocal)`**: no-arg equals **`restore(true)`**. **`fromLocal`** marks whether this change came from **local** edits vs **remote** collaboration—most apps **don’t** call **`restore(fromLocal)`** manually; selection usually stays aligned automatically. Only unusual pipelines need explicit **`restore`** with **`true`** / **`false`** per your collaboration contract; single-editor apps use **`restore()`** with no args.
- **Read-only nothing moves**: selection mutators no-op; **`restore`** also shows no visible change.
- **`toNextLine` no-op**: when **next line** cannot be resolved (no layout), selection stays unchanged.

## What's next

- [Query & operations](./operations-and-query)  
- **Component hooks**: [Component events & lifecycle](./component-events-and-lifecycle)  
- **Shortcuts & key bindings**: [Shortcuts & grammar](./shortcuts-and-grammar)  
- **Browser & selection bridge**: [Browser module](./platform-browser)  
- **Terms & data model**: [Concepts](./concepts)
