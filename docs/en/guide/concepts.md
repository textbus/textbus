---
title: Concepts
description: Document tree, Component, Slot, Formatter vs Attribute, kernel vs platform vs adapters.
---

# Concepts

Finish [Getting started](./getting-started) and the Basics guides ([Component basics](./component-basics), [Text styles](./text-styles), [Block styles](./block-styles), [Selection](./selection)) before this page—it aligns vocabulary for the **data model**. If you already know tree-shaped docs and format/attribute usage, treat it as a glossary.

## The document is a tree

Textbus models editor content as a **component tree**: a **root component**, **block children** (paragraphs, headings, todos, …), and **slots** inside blocks that hold text or smaller **inline** structure. Typing, paste, and collaboration updates all land on this tree plus attached **format** data; the view **renders** the model—it does **not** treat the DOM as the single source of truth.

Each block is rendered by a **view function**: a **table** is often **one table component** drawing a **`table`** with **`slotRender`** per cell; **lists / todos** are often **one block per row**, with chrome (checkbox + body slot) in the view. Data stays component tree + slots; appearance is up to the view—see [Component basics](./component-basics).

## Components

A **Component** is a node type in the tree with:

- **`componentName`**: registered name in the kernel and the key for **component ↔ view** in the adapter map.
- **`type`**: **block** vs **inline**—**`ContentType`** controls what can sit side by side in a slot and default rules for breaks, delete, ….
- **`state`**: plain object for business data; often includes one or more **`Slot`** children.
- **`setup`**: register **hooks** (**`onContentInsert`**, **`onBreak`**, …) for edit events—index in [Component events & lifecycle](./component-events-and-lifecycle).

For serialization, implement **`fromJSON`** to rebuild instances from literal state (see Getting started).

## Slots

A **Slot** (`Slot`) holds content inside a component: **text spans**, nested **block or inline components**, constrained by **`schema`** (**allowed `ContentType` list**).

- Text and components sit in **linear order** in the slot; block components usually occupy distinct paragraph-like positions.
- Slots carry **formats** and **attributes** (below): formats mark **text ranges** (e.g. bold a few characters); attributes apply to the **whole slot** (often block chrome or slot-wide flags) without adding a component per effect.

In the view you typically use injected **`Adapter.slotRender`** to render a slot into a host **virtual node** (the **`p`** / root **`div`** in Getting started).

**Details (`schema`, caret, `insert` / `cut` / `toDelta`, …)**—dedicated page [Slot](./slot).

## Formats and attributes

- **Formatter**: applies to **any contiguous text range** inside a slot—**inline** styling or marking **part** of slot content (bold, color, links, …). Registered on the editor; the kernel merges overlaps, inheritance, render order.
- **Attribute**: applies to the **entire slot**—often **block-level** look (alignment, list indent, …) or **whole-slot** business flags; **`Attribute.render`** writes onto the **virtual node** that hosts the slot. By default attributes also cascade to **nested components’ slots** inside (**`onlySelf: true`** limits to the current slot).

Both **decouple** styling from “plain text + tree”: ranges → formats; whole-slot / block chrome → attributes—fewer unnecessary components and simpler collaboration merges.

## Model vs view

- **Kernel** (**`@textbus/core`**): component tree, slots, formats, selection, commands, history.
- **`@textbus/platform-browser`**: browser wiring—input, selection bridge, ….
- **View adapters** (Viewfly / Vue / React): given component instances, call your **view functions** and **`slotRender`** slots from **`state`**.

The same model can swap adapters; changing frameworks usually means rewriting views while **data** and **editing logic** stay largely shared.

## What's next

- **Basics**: [Component basics](./component-basics) · [Text styles](./text-styles) · [Block styles](./block-styles) · [Selection](./selection) · [Query & operations](./operations-and-query) · [History](./history) · [Shortcuts & grammar](./shortcuts-and-grammar) · [Component events & lifecycle](./component-events-and-lifecycle) · [Document parsing & compatibility](./document-parse-compat)  
- **Slot model**: [Slot](./slot) (**`schema`**, **`index` / `retain`**, **`insert`**, formats & attributes, **`cut` / `delta`**)  
- **Advanced components**: [Advanced components](./component-advanced) (**`separate`**, **`removeSlot`**, **`deleteAsWhole`**, **`getSlots()`** order, …)  
- **Adapters**: [Viewfly](./adapter-viewfly), [Vue](./adapter-vue), [React](./adapter-react); **collaboration**: [Collaboration](./collaborate)  
- Plugins, providers, duplicate-name debugging: [Modules & extensions](./editor-and-modules)
