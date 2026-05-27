---
title: Introduction
description: What Textbus is, model-driven editing, and package overview.
---

# Introduction

Textbus is a component-centric, data-driven rich text editor development framework! To solve the various problems encountered in traditional rich text development, we independently designed a component system and a format system for rich text from the ground up. Our goal is to lower the development cost of rich text and help you more easily extend rich editing features. Whether you are a veteran of rich text development or a frontend beginner, you will find an exceptional development experience and powerful extensibility in Textbus.

**Since 4.0**, Textbus fully embraces the frontend ecosystem, supporting rendering rich text content directly with [Viewfly](https://viewfly.org), Vue, and React. This means you can use open-source component libraries at zero cost, making it simpler to implement all kinds of interactive features in rich text.

Textbus also delivers outstanding performance. When using [Viewfly](https://viewfly.org) as the rendering layer, tested with the full text of *Dream of the Red Chamber* as a sample, Textbus can handle **50,000 paragraphs with smooth editing — equivalent to 15 copies of the novel totaling 17 million Chinese characters in a single document** (<span style=”font-size:14px”>one copy of Dream of the Red Chamber is approximately 3,100 paragraphs; test machine: MacBook M1 Pro, 32GB RAM</span>). This was unimaginable in the past.

::: info Note
Since 4.0, the Textbus repository <strong>no longer provides a default editor</strong>. However, we have rebuilt the XNote rich text editor. Repository: <a href=”https://github.com/textbus/xnote” target=”_blank”>https://github.com/textbus/xnote</a>.
:::

If you are ready to set up your environment, go to [Getting started](./getting-started), then follow the **Basics** section in order (from [Component basics](./component-basics) through [Document parsing & compatibility](./document-parse-compat)).

## Model-driven editing

- **Consistent behavior**: Input and output share one data model, reducing divergence caused by browser differences.
- **Sugar and input rules**: You can configure live transforms (for example Markdown-like heading triggers) or fully customize them.
- **Parsing and paste**: You can tailor how content is parsed and cleaned from the web, Office, and other sources.
- **Collaboration**: The model can integrate with solutions such as Yjs (see [Collaboration](./collaborate)).
- **Selection and commands**: The core abstracts selection and command flow so you write less browser-specific selection code.

## Packages and roles

| Package | Role |
| ------- | ---- |
| `@textbus/core` | Models for components, slots, formats, and attributes, plus core capabilities such as selection, commands, history, scheduling, and registration |
| `@textbus/platform-browser` | Browser platform capabilities (input, selection bridge, DOM, and more) |
| `@textbus/adapter-viewfly` | Render the document view with Viewfly |
| `@textbus/adapter-vue` | Render the document view with Vue |
| `@textbus/adapter-react` | Render the document view with React |
| `@textbus/collaborate` | Collaboration features and integration |
| `@textbus/platform-node` | Tools and adapters for Node |
