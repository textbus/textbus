---
title: Text styles
description: Formatter-based inline styles (bold, font size), registration, Commander.applyFormat, toolbar + Query, optional fields.
---

# Text styles

This page explains how to layer styles onto **a run of text inside one slot**—what the kernel calls a **Formatter**. You should already have the minimal editor from [Getting started](./getting-started); if you built the **Todolist** from [Component basics](./component-basics), formatters apply to its **body slot** the same way as in a paragraph (any slot whose schema includes **`ContentType.Text`**).

## What formatters solve

Common rich-text needs: **bold a few characters**, **make a span larger**, **without** a separate component node per style. Textbus models “marks on continuous text ranges” as **`Formatter`**:

- **`name`** (string) is **unique** within this editor instance so saved documents, **paste**, etc. can match the **`Formatter`** you registered on **`Textbus`**.
- **`render`** decides **how that span appears**—e.g. wrap with **`strong`**, or use **`FormatHostBindingRender`** to attach styles to an outer node and **avoid extra nested tags**.
- At runtime, **`Commander.applyFormat(formatter, value)`** toggles or applies a format on the **current selection**; **`unApplyFormat`** removes one formatter.

This differs from **Attributes** that affect **the whole slot** (alignment, indent, …)—see [Block styles](./block-styles).

## `Formatter` configuration: `render`

When you construct **`new Formatter<T>(name, config)`**, the second argument is **`FormatterConfig<T>`**; **`T`** is the value type (**`boolean`** for bold, **`string`** for font size, …). Below is the overall shape (confirm against **`@textbus/core`** after upgrades); **`render`** is required; **`priority`**, **`inheritable`**, **`segmented`**, **`checkHost`** are optional—see **[Optional fields](#optional-formatter-fields)**. For **stackable** annotations (multiple values on the same span), use **`StackableFormatter`**—see that section below.

```ts
import type { Component, Slot, VElement, VTextNode } from '@textbus/core'

/** Besides wrapping a tag, render may return this “attach to host” shape */
interface FormatHostBindingRender {
  fallbackTagName: string
  attach(host: VElement): void
}

/** Second argument to Formatter constructor */
interface FormatterConfig<T> {
  priority?: number
  inheritable?: boolean
  segmented?: boolean
  checkHost?(host: Slot, value: T): boolean
  render(
    children: Array<VElement | VTextNode | Component>,
    formatValue: T,
    renderEnv: unknown,
  ): VElement | FormatHostBindingRender
}
```

### Two kinds of `render` return values

**`render(children, formatValue, renderEnv)`** may return:

1. **`VElement`**: the usual “wrap one tag”, e.g. bold → **`createVNode('strong', null, children)`**.
2. **`FormatHostBindingRender`**: **`fallbackTagName`** plus **`attach(host)`**. Prefer **`attach`** to merge styles onto **an existing outer node** and cut down **`span`** nesting; fall back to **`fallbackTagName`** when you cannot. The font-size sample uses **`attach`** + **`host.styles.set('fontSize', …)`**.

The third argument **`renderEnv`** carries render context—branch when needed; many custom formatters ignore it.

## Example: `formatters.ts` (bold + font size)

Assume **`src/formatters.ts`** (path up to you), **`import`** it where you register formatters.

### Bold (`strong`)

Value type **`boolean`**; **`true`** means on. This **`render`** ignores **`formatValue`** in the DOM and only wraps **`strong`**.

```ts
import { Component, createVNode, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'

// Name must match Textbus registration so load/paste resolve; true enables bold
export const boldFormatter = new Formatter<boolean>('bold', {
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('strong', null, children)
  }
})
```

### Font size (merge onto host)

Font size needs a concrete CSS value, so **`Formatter<string>`**. **`font-size`** is applied on the host from **`attach`** so it can **share an outer wrapper** with neighbors (e.g. bold) with **fewer tags**.

```ts
// attach: merge onto host when possible to reduce span nesting; else fallbackTagName
export const fontSizeFormatter = new Formatter<string>('fontSize', {
  render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
    return {
      fallbackTagName: 'span',
      attach(host: VElement) {
        host.styles.set('fontSize', formatValue)
      }
    }
  }
})
```

## Register on `Textbus`

Every formatter belongs in **`new Textbus({ formatters: [...] })`** (or **`formatters`** merged from a **`Module`**) so **saved content** and **paste** can resolve **`bold`**, **`fontSize`**, etc. by **`name`**.

```ts
// Names not listed in formatters cannot be restored on load or paste
const editor = new Textbus({
  components: [/* ... */],
  formatters: [boldFormatter, fontSizeFormatter],
  imports: [browserModule]
})
```

If **`name`** does not match what was stored, styles may fail to restore—keep names aligned with your product contract.

## `Commander.applyFormat` and `unApplyFormat`

**`applyFormat(formatter, value)`**:

- **Non-collapsed selection**: applies the formatter to each affected **text range** inside slots; spans multiple slots when needed.
- **Collapsed caret**: typing after the caret can **carry the formatter** for new characters—details in [Selection](./selection).

**`value`** must match **`Formatter<T>`**’s **`T`** (**`boolean`** for bold, **`string`** for font size).

```ts
import { Commander } from '@textbus/core'
import { boldFormatter, fontSizeFormatter } from './formatters'

const commander = editor.get(Commander)

commander.applyFormat(boldFormatter, true)
commander.applyFormat(fontSizeFormatter, '18px')
```

Clear one formatter:

```ts
commander.unApplyFormat(boldFormatter)
```

**`unApplyFormat`** uses the current selection and removes **only that** formatter; other formatters on the same text stay. An optional second argument is **`PendingErasure<T>`** (e.g. **`new PendingErasure(false, id)`** drops only ranges whose value is **deep-equal** to **`id`**), matching **`Slot.retain`** erase semantics—see [Query & operations](./operations-and-query).

## Toolbar: apply formats and sync `Query`

Usually bind the toolbar **after** **`editor.render(docRoot)`**: **`editor.get(Commander)`** for **`applyFormat` / `unApplyFormat`**, **`editor.get(Query)`** with **`queryFormat`** to see if the selection has a format; on **`editor.get(Selection).onChange`**, re-run queries and refresh **`data-active`** on buttons (styles live in **`style.css`**).

The sandbox below edits source and switches to **Preview** for **Bold** and **Large**; clicking again clears that format.

<TextbusPlayground preset="text-styles" />

In a standalone app, putting the toolbar markup in **`index.html`** and wiring from **`App.tsx`** is equivalent—only where the DOM lives changes. More **`Commander` / `Query`** patterns: [Query & operations](./operations-and-query).

## Working with component structure

- **Formatters apply only where there is a text flow**: Todolist body with **`[ContentType.Text]`** supports **`applyFormat`** like a paragraph.
- **Block component nodes themselves** are not “wrapped” by **`Formatter`**—that is what **components** are for; formatters target **string ranges inside a slot**.

## Optional fields {#optional-formatter-fields}

You can add these four on the **`Formatter`** config when needed.

### `priority`

**Default `0`. Lower numbers wrap earlier.** When **multiple formatters overlap** on the same text, **`priority`** orders **`render`** nesting (e.g. whether the outer tag is link vs bold). Default **`0`** is still stable; bump by **`1`** when product needs a different wrap order.

### `inheritable`

**Default `true`.** When the caret **sits on the edge** of a formatted span, whether **new typing** **inherits** that format. **`false`** tends to stop the format from “growing” with the caret—good for one-shot marks. Behavior with **`applyFormat`** and collapsed carets ties to [Selection](./selection).

### `segmented`

**Default `false`.** Textbus usually merges DOM with **minimal structure**: bold + large font can be combined — the font size is attached directly onto the bold `strong` tag via `attach`, merging into a single node instead of wrapping a separate tag per formatter.

**Minimal structure** (bold + larger size)—markup and result:

```html
<p>I write with <strong>Textbus <span style="font-size: 30px">rich text</span></strong>.</p>
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">Preview</div>
<p>I write with <strong>Textbus <span style="font-size: 30px">rich text</span></strong>.</p>
</div>

When a style must **line up per character** with strict visuals, minimal merging can look “off.” A common case is **text background color**: merged tags may not align highlight rectangles with glyph bounds.

The blocks below use **inline styles** like **`background-color`** (typical Formatter output). Previews sit on a **fixed light canvas** so contrast stays clear even when the docs site uses dark theme.

**Same content with an outer background** (still minimal merge, equivalent to **`segmented: false`**):

```html
<p>I write with <strong style="background-color: #8ad9f5">Textbus <span style="font-size: 30px">rich text</span></strong>.</p>
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">Preview (merged background)</div>
<p>I write with <strong style="background-color: #8ad9f5">Textbus <span style="font-size: 30px">rich text</span></strong>.</p>
</div>

Set **`segmented: true`** on that **`Formatter`** (e.g. background): rendering **splits ranges** and **emits separate tags per segment** so backgrounds hug text. Roughly:

```html
<p>I write with <strong><span style="background-color: #8ad9f5">Textbus </span><span style="font-size: 30px; background-color: #8ad9f5">rich text</span></strong>.</p>
```

<div class="tb-doc-html-demo">
<div class="tb-doc-html-demo__label">Preview (split background, segmented)</div>
<p>I write with <strong><span style="background-color: #8ad9f5">Textbus </span><span style="font-size: 30px; background-color: #8ad9f5">rich text</span></strong>.</p>
</div>

For everyday **bold / font size**, keep **`segmented: false`**; turn **`segmented`** on for per-segment alignment (often background, underline, …).

### `StackableFormatter`

**Subclass of `Formatter`.** Multiple ranges of the **same formatter name** can coexist on the **same text** with **different values**; ranges merge only when values are **deep-equal** (objects and arrays compared recursively). The kernel treats **`instanceof StackableFormatter`** differently from plain **`Formatter`** for merge rules; **`Query.queryFormat`** returns **`value: T[]`** for these. Use for **annotations**, **multi-user marks**, or any case where one run needs **several independent payloads**.

```ts
import { createVNode, StackableFormatter } from '@textbus/core'

interface AnnotationValue {
  id: string
  author: string
}

export const annotationFormatter = new StackableFormatter<AnnotationValue>('annotation', {
  inheritable: false,
  render(children, formatValue) {
    return createVNode('mark', {
      attrs: { 'data-annotation-id': formatValue.id, title: formatValue.author }
    }, children)
  }
})
```

For **`StackableFormatter`**, removing **one value** without wiping every range uses **`unApplyFormat(formatter, new PendingErasure(false, value))`**; finer-grained clears use **`Slot.cleanFormatter` / `cleanFormats`** (**`canApply`**, **`PendingErasure`**, …)—[Slot](./slot).

### `checkHost`

Optional; **omit** to allow application always. **`checkHost(host, value)`** runs **before** writing the format: **`host`** is the **`Slot`**, **`value`** is this application’s value; return **`false`** to **skip** (command effectively no-ops). Use to **restrict which slots** accept a formatter or to validate **`value`**.

```ts
import { ContentType } from '@textbus/core'

// Example: only slots whose schema includes text (adapt to your rules)
checkHost(host, value) {
  return host.schema.includes(ContentType.Text)
}
```

If **`checkHost`** lives **inside** the **`Formatter`** config, import **`ContentType`** and **`Formatter`** from **`@textbus/core`** as usual.

## FAQ

- **Button does nothing**: confirm **`formatters`** are registered and **`name`** matches stored/pasted ids; check the selection is in an **editable text slot**, not a whole-block selection.
- **Paste drops styles**: mapping external styles to your **`Formatter`** names depends on **`platform-browser`** and **`Parser`**—unmapped formats are dropped. See [Document parsing & compatibility](./document-parse-compat).
- **Odd overlap nesting**: tune **`Formatter.priority`** (**smaller → wraps outer first**); use **`segmented: true`** for per-segment alignment (backgrounds, …).
- **Multiple annotations on the same text**: define that format with **`StackableFormatter`** and give each mark a **distinct value** (e.g. different **`id`** fields).
- **Typing after caret doesn’t inherit bold**: check **`inheritable`** is not **`false`**; collapsed-caret rules in [Selection](./selection).

## What's next

- **Block-level styles (alignment, …)**: [Block styles](./block-styles)  
- **Selection**: [Selection](./selection)  
- [Query & operations](./operations-and-query)  
- **Component sample**: [Component basics](./component-basics)  
- **Glossary**: [Concepts](./concepts)
