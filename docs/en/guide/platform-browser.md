---
title: Browser module
description: BrowserModule, ViewOptions, MagicInput vs NativeInput, SelectionBridge, Parser, CollaborateCursor.
---

# Browser module

**`@textbus/platform-browser`** connects **`@textbus/core`** to the browser: **editable surface**, **keyboard and composition input**, **keeping document selection aligned with the page selection**, **paste and HTML parsing**, and in collaboration scenarios **remote selections / carets**. You supply **`DomAdapter`** via **`@textbus/adapter-*`** (e.g. **`ViewflyAdapter`** extends **`DomAdapter`**); **`BrowserModule`** wires **`Adapter`**, **`NativeSelectionBridge`**, **`Input`**, and related browser capabilities to the current editor instance.

End-to-end wiring is in [Getting started](./getting-started) and the [view adapters](./adapter-viewfly) (**[Vue](./adapter-vue)**, **[React](./adapter-react)**). This page covers **`BrowserModule`** options, how responsibilities split with the kernel, and common pitfalls.

## Install

```bash
npm install @textbus/platform-browser
```

You also need **`@textbus/core`**, one **`@textbus/adapter-*`**, and **`reflect-metadata`** (must run **once** before any **`@textbus/*`** import).

## `BrowserModule` and `ViewOptions`

With **`BrowserModule`** added, **`render`** **mounts the document view** to your container and **waits for the input layer**; optionally **auto-focus** after startup; on **`destroy`** it releases **input, selection bridge, collaboration carets**, and other browser-side resources.

**`ViewOptions`** (**`BrowserModule`** constructor args) common fields:

| Field | Role |
|-------|------|
| **`adapter`** | **`DomAdapter`** from **`@textbus/adapter-*`**; its **`host`** is the view root DOM. |
| **`renderTo()`** | Returns the **outer mount point** (**`HTMLElement`**); the editor chrome mounts under it. |
| **`autoFocus`** | Optional; when **`true`**, calls **`textbus.focus()`** after startup. |
| **`minHeight`** | Optional; **minimum height** for the editing area (applied to the view root styles). |
| **`useContentEditable`** | Optional; **`true`** uses the **`contenteditable`** path (**`NativeInput`**), otherwise default **`MagicInput`**. |
| **`componentLoaders` / `formatLoaders` / `attributeLoaders`** | Optional; extend **HTML → document** parsing—see [Document parsing & compatibility](./document-parse-compat). |

With [Collaboration](./collaborate), **`MessageBus`** payloads and **remote caret** data must **match across clients**.

## Split with `@textbus/core`

| Layer | Responsibility |
|-------|----------------|
| **`@textbus/core`** | Components / slots / formats / attributes, **`Registry`**, **`Selection`**, **`Commander`**, **`Scheduler`**, **`History`**, …—the DOM-agnostic editing kernel. |
| **`@textbus/platform-browser`** | **Input**, **selection bridge**, **parse & paste pipeline**, **focus-related events**, **collaboration carets**, … |
| **`@textbus/adapter-*`** | Renders the **`Component`** tree as **Viewfly, Vue, or React**, and supplies an **`Adapter`** that satisfies **`DomAdapter`**. |

Without a usable **`Adapter`** and **`NativeSelectionBridge`**, **`Textbus`** cannot finish **`render`**; with **`BrowserModule`**, **`SelectionBridge`** plus **`config.adapter`** satisfy that.

## Input: `MagicInput` and `NativeInput`

The default is **`MagicInput`** (non-**`contenteditable`** main path). **`useContentEditable: true`** switches to **`NativeInput`**. **Feel, IME behavior, and selection coupling** differ—pick per product needs and regression-test.

## Selection and `NativeSelectionBridge`

**`SelectionBridge`** implements **`NativeSelectionBridge`**: when native selection is allowed, **document selection** stays consistent with **the page selection**. Selection APIs: [Selection](./selection).

## `Parser` and loaders

**`Parser`** and **loaders** define how **HTML, paste**, … become the document tree—see [Document parsing & compatibility](./document-parse-compat). Loaders from **`ViewOptions`** participate **together** with defaults.

## Building a document from HTML / literals

After **`Textbus`** exists and this module is in config, call on the **`BrowserModule`** instance:

- **`readDocumentByHTML(html, rootComponentLoader, textbus)`**: parse an **HTML string** into a **root `Component`** (**`rootComponentLoader`** picks root type and content).
- **`readDocumentByComponentLiteral(data, rootComponent, textbus)`**: restore a **JSON literal** with a **root component class** into a **root `Component`**.

Use for importing external HTML, server-delivered JSON, etc.

## `CollaborateCursor` and collaboration UI

With **`BrowserModule`**, use **`CollaborateCursor`** to **draw other users’ selections or carets** over the editing surface. Data contracts with **`MessageBus`**: [Collaboration · `MessageBus`](./collaborate#message-bus).

## DOM hooks for automation

For **E2E tests or outer layout**, **`@textbus/platform-browser`** exports **named field constants**—see package types and export list.

## FAQ

- **`renderTo` does not return an `HTMLElement`:** **`render`** fails; return a real DOM node.
- **No input or broken selection:** ensure **`render`** finished, and check whether **native selection sync** is disabled ([Selection](./selection)).
- **Paste loses formatting:** verify **parsers and loaders** cover your **`Formatter` / `Attribute`** names ([Document parsing & compatibility](./document-parse-compat)).

## What’s next

- Module merging & **`providers`**: [Modules & extensions](./editor-and-modules)
- Parsing & paste: [Document parsing & compatibility](./document-parse-compat)
