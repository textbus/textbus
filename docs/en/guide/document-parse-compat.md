---
title: Document parsing & compatibility
description: Parser, ComponentLoader, FormatLoader, AttributeLoader, paste pipeline, and Loader authoring tips.
---

# Document parsing & compatibility

To turn clipboard HTML, HTML copied from the web, or a saved **HTML string** into Textbus **components / slots**, use **`Parser`** from **`@textbus/platform-browser`** together with **`ComponentLoader`**, **`FormatLoader`**, and **`AttributeLoader`** to map DOM nodes to registered **`Component`**, **`Formatter`**, and **`Attribute`** instances.

This page assumes **`new Textbus({ … })`** already registers **`components` / `formatters` / `attributes`** ([Text styles](./text-styles), [Block styles](./block-styles)), and that you know **`Commander.paste`** and **`onPaste`** ([Query & operations](./operations-and-query), [Component events & lifecycle](./component-events-and-lifecycle)).

## End-to-end flow (paste)

Whenever **HTML** is restored to **`Component` / `Formatter` / `Attribute`** (typically **paste**), the pipeline centers on **`Parser`** and the **`ComponentLoader` / `FormatLoader` / `AttributeLoader`** arrays on **`ViewOptions`**: **without a Loader, or if `match` fails, that slice of HTML does not enter your document model as those extensions**.

```ts
const slot = parser.parse(html, new Slot([
  ContentType.BlockComponent,
  ContentType.InlineComponent,
  ContentType.Text,
]))
```

On the default paste path the parsed **`Slot`** goes into the current selection; if **`onPaste`** calls **`preventDefault()`**, nothing is inserted automatically—you decide how to use **`Slot`**. **`PasteEventData.text`** is plain-text fallback or validation ([Query & operations](./operations-and-query), [Component events & lifecycle](./component-events-and-lifecycle)).

## Where to configure loaders

**`ViewOptions`** passed to **`BrowserModule`** (exported from **`@textbus/platform-browser`**) has three optional arrays:

- **`componentLoaders`**: **`ComponentLoader[]`**—recognize custom block tags (tables, cards, …), yield **`Component`** or **`Slot`** fragments.
- **`formatLoaders`**: **`FormatLoader[]`**—map **`<strong>`**, styled **`<span>`**, … to **`Formatter`** + value.
- **`attributeLoaders`**: **`AttributeLoader[]`**—read “slot shell” DOM for alignment, indent, … → **`Attribute`**.

These lists are injected into **`Parser`**’s constructor; **only loaders that appear here and pass `match`** participate. **`Formatter.name` / `Attribute.name` / component classes** registered on the editor must line up with what Loader **`read`** returns—otherwise **`Registry`** cannot restore.

```ts
import { BrowserModule } from '@textbus/platform-browser'
import type { ViewOptions } from '@textbus/platform-browser'

const viewOptions: ViewOptions = {
  adapter: /* … */,
  renderTo: () => document.getElementById('editor')!,
  componentLoaders: [/* … */],
  formatLoaders: [/* … */],
  attributeLoaders: [/* … */],
}

new Textbus({
  imports: [new BrowserModule(viewOptions)],
  components: [/* … */],
  formatters: [/* … */],
  attributes: [/* … */],
})
```

## `Parser`: three common entry points

### `Parser.parseHTML(html: string)`

Static helper: uses the browser **`DOMParser`** to parse a string into a **`document.body`** node (**`parseFromString(..., 'text/html')`**). Use it when you need an **`HTMLElement`** before **`parse` / `parseDoc`**.

```ts
import { Parser } from '@textbus/platform-browser'

const body = Parser.parseHTML('<p>Hello</p>')
// body is the parsed body; children are <p>…
```

### `parse(html, rootSlot)`

Parses an HTML string or existing **`HTMLElement`** **into** **`rootSlot`** (appends to that **`Slot`**) and returns **`Slot`**.

**Args**:

- **`html`**: **`string | HTMLElement`**. Strings go through **`parseHTML`** and iterate **`body`’s children** (same shape as full-page paste DOM).
- **`rootSlot`**: target **`Slot`**. Paste often uses **`new Slot([BlockComponent, InlineComponent, Text])`** for mixed content; if you only allow paragraph-level text, align **`schema`** **`ContentType[]`** with the real document slot—or **`Commander.insert`** may reject node types.

Rough order: **element** → try **`componentLoaders`** (array order, **`match`**), **`read`**; else wrap with **`formatLoaders`** and recurse children; **`<br>`** → newline character; text nodes **`insert`** (whitespace-only / ZWSP-only may be skipped).

```ts
import { Parser } from '@textbus/platform-browser'
import { ContentType, Slot, Textbus } from '@textbus/core'

declare const textbus: Textbus

const parser = textbus.get(Parser)
const slot = new Slot([ContentType.Text])

parser.parse('<p>a<strong>b</strong></p>', slot)
// slot holds parsed structure and formats (depends on loaders)
```

### `parseDoc(html, rootComponentLoader)`

Whole-document entry: not filling an existing **`Slot`**—delegates to **`rootComponentLoader.read`** so you choose the root (**`RootComponent`** or another shell). **`read`** should return a **`Component`** as document root (returning **`Slot`** or **`void`** is wrong for “whole HTML → root component”—adjust the loader or use **`parse`** into an existing **`Slot`**).

**Args**:

- **`html`**: same as above.
- **`rootComponentLoader`**: **`ComponentLoader`**. Internally passes **`SlotParser`** so **`read`** can recurse into regions.

```ts
import { Parser } from '@textbus/platform-browser'
import type { ComponentLoader } from '@textbus/platform-browser'
import { Textbus } from '@textbus/core'

declare const textbus: Textbus
declare const rootLoader: ComponentLoader

const parser = textbus.get(Parser)
const root = parser.parseDoc('<div class="doc">…</div>', rootLoader)
```

## `ComponentLoader`

**Role**: decide whether a **DOM element** is “your” block; if so, **`read`** returns **`Component`**, **`Slot`** (flattened via **`delta`** into the parent), or **`void`** (skip).

**`match(element, returnableContentTypes)`**

- **`element`**: current DOM node.
- **`returnableContentTypes`**: copy of outer **`Slot.schema`**—which **`ContentType`** values this slot still accepts. Combine tag name, **`dataset`**, **`class`**, … and ensure the produced type fits **`schema`** or **`insert`** may fail.

**`read(element, textbus, slotParser)`**

- **`element`**: matched DOM node.
- **`textbus`**: current **`Textbus`** (**`Registry`**, **`Commander`**, …).
- **`slotParser`**: **`SlotParser`**—fill a child **`Slot`** from a DOM subtree.

Return:

- **`Component`**: insert as one block in context.
- **`Slot`**: kernel flattens **`slot.toDelta()`** into the outer **`Slot`**.
- **`void`**: treat as unmatched; next **`ComponentLoader`**; if none match, generic **`FormatLoader` + children** path.

```ts
import type { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { ContentType, Slot, Textbus } from '@textbus/core'

declare class TableComponent {
  constructor(state: unknown)
}

const MyTableLoader: ComponentLoader = {
  match(el, schema) {
    return el.tagName === 'TABLE' && schema.includes(ContentType.BlockComponent)
  },
  read(el, _textbus: Textbus, slotParser: SlotParser) {
    const cellSlot = new Slot([ContentType.Text])
    const td = el.querySelector('td')!
    slotParser(cellSlot, td, td)
    return new TableComponent({ cells: cellSlot })
  },
}
```

(**`TableComponent`** / **`state`** are placeholders—use your real component.)

## `SlotParser` (callback shape)

Not a class—a function **`Parser`** passes into **`ComponentLoader.read`**:

```ts
(childSlot, slotRootElement, slotContentHostElement?) => childSlot
```

**Args**:

- **`childSlot`**: target **`Slot`** you **`new Slot(schema)`**—parsed output goes here.
- **`slotRootElement`**: DOM “shell” for **`AttributeLoader`** (alignment, indent on the container).
- **`slotContentHostElement`**: optional; defaults same as root. If wrapper is **`<div class="wrap">`** and body is **`<div class="inner">`**, pass **`wrap`** as root and **`inner`** as content host—attributes on shell, formats on inner body.

The kernel runs **`attributeLoaders`** on the shell first, then **`formatLoaders` + subtree** on the content host.

## `FormatLoader`

**Role**: decide whether an element represents an **inline format**; **`read`** returns **`Formatter` instance + value**.

**`match(element)`**: **`true`** means this loader owns the element.

**`read(element)`**: **`{ formatter, value }`** (**`FormatLoaderReadResult`**). **`formatter`** must match what **`Textbus`** registered (**`name`** resolution); **`value`** matches **`Formatter<T>`**.

**Several `FormatLoader`s may match one element**: all matching loaders **`read`** and formats **stack** on the inserted range (interval from **`slot.index`** around parsed children).

```ts
import type { FormatLoader } from '@textbus/platform-browser'

declare const boldFormatter: import('@textbus/core').Formatter<boolean>

const BoldLoader: FormatLoader<boolean> = {
  match(el) {
    return el.tagName === 'STRONG' || el.tagName === 'B'
  },
  read() {
    return { formatter: boldFormatter, value: true }
  },
}
```

## `AttributeLoader`

**Role**: while parsing a **`Slot`**, read **slot-level `Attribute`** from the **shell DOM** (**`SlotParser`**’s **`slotRootElement`**) and apply **`value`**. Typical: pasted **`<p style="text-align:center">`**, **`<div data-indent="1">`** → attributes from [Block styles](./block-styles).

**Vs `FormatLoader`**:

- **`AttributeLoader`** runs **before** **`SlotParser`** fills the child **`Slot`**, against **`slotRootElement`** → **`childSlot.setAttribute(attribute, value)`** on the **whole slot**, not a text range.
- **`FormatLoader`** runs on **`slotContentHostElement`**—**`retain` + `formatter`** on **index ranges** for inserted children.

**`match(element: Element): boolean`**

- **`element`** is the shell passed to **`slotParser(..., slotRootElement, ...)`**. Only **elements** participate.
- **`true`** = this loader claims the shell. **Multiple loaders may match**: kernel **`filter`s all hits**, then **`read`** + **`setAttribute`** **in `attributeLoaders` array order** (all apply—not “first wins only”).

**`read(element: Element): AttributeLoaderReadResult<T>`**

- **`{ attribute, value }`**. **`attribute`** matches **`Textbus`** registration; **`value`** matches **`Attribute<T>`**.
- Read **`style` / `dataset` / `class`** from **`element`** consistently with **`match`**.

```ts
import type { AttributeLoader } from '@textbus/platform-browser'
import type { Attribute } from '@textbus/core'

declare const textAlignAttribute: Attribute<'left' | 'center' | 'right' | 'justify'>

/** Example: restore alignment from inline style (real apps also handle class, Office cruft, …) */
const TextAlignFromStyleLoader: AttributeLoader<'left' | 'center' | 'right' | 'justify'> = {
  match(el) {
    const t = (el as HTMLElement).style.textAlign
    return t === 'left' || t === 'center' || t === 'right' || t === 'justify'
  },
  read(el) {
    const value = (el as HTMLElement).style.textAlign as 'left' | 'center' | 'right' | 'justify'
    return { attribute: textAlignAttribute, value }
  },
}
```

**Note**: with **`slotParser(slot, wrap, inner)`**, **only `wrap`** runs **`AttributeLoader`**—not **`inner`**. Put block metadata on **`wrap`**, or wire **`slotParser`** to the right shell inside **`ComponentLoader.read`**.

## Working with paste and commands

- **Default paste**: platform **`parser.parse`** → **`commander.paste(slot, text)`**—[Query & operations](./operations-and-query) **`paste`**.
- **Intercept paste**: **`onPaste`** **`preventDefault()`** ([Component events & lifecycle](./component-events-and-lifecycle)), then **`parser.parse`** / sanitize and **`insert`** yourself.
- **Copy**: when a whole block is selected, platform may put **`text/html`** + **`text`** on the clipboard; paste elsewhere uses the same **`Parser`**—keep **Loader rules and exported HTML** aligned.

## Loader authoring tips

1. **Stable `match`**: Office/browsers emit noisy **`class` / `style`**—tighten conditions to avoid swallowing huge subtrees.
2. **`componentLoaders` order**: **`parse`** uses **first successful `match` in array order**.
3. **`attributeLoaders`**: **every matching loader `setAttribute`s**, order = array order (**unlike** component loaders “first wins”).
4. **`schema`**: parsed **`Slot`** **`schema`** must match real slots or **`insert`** may fail and fall back to **`getNextInsertPosition`**.
5. **Unmatched nodes**: usually recurse as generic containers; with no loaders you often end with **plain text or lost structure**—consider **`FormatLoader`** fallbacks.
6. **Browser wiring**: [Browser module](./platform-browser); merging **`imports`**: [Modules & extensions](./editor-and-modules).

## What's next

- [Browser module](./platform-browser)  
- [Query & operations](./operations-and-query) (**`paste`**, **`insert`**)  
- [Component events & lifecycle](./component-events-and-lifecycle) (**`onPaste`**)  
- [Text styles](./text-styles), [Block styles](./block-styles)  
- [Modules & extensions](./editor-and-modules)
