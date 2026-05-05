---
title: Introduction
description: What Textbus is, model-driven editing, and package overview.
---

# Introduction

Textbus is a **component-centric, data-driven** framework for building rich text editors. To address common pain points in traditional rich text development, we **designed our own component system and format system for rich text**, aiming to **lower the cost of extension** so you can ship richer editing features more easily. Whether you are an experienced developer in rich text or a frontend newcomer, Textbus offers a smooth development path and room to grow.

**Since 4.0**, Textbus **embraces the frontend ecosystem**: you can render the same document model with **Viewfly**, **Vue**, or **React**. That means you can **wire in popular open-source component libraries with almost no extra adapter work**, and build rich interactions inside the editor more simply—without reinventing wheels between “rich text” and “business UI.”

For performance, with **Viewfly** as the rendering layer we once stress-tested using the full text of *Dream of the Red Chamber*: editing stayed smooth at **roughly 50,000 paragraphs**—on the order of **15 copies of the novel** and about **17 million Chinese characters** in one document (one full copy is about **3,100 paragraphs**; test machine: **MacBook M1 Pro, 32 GB RAM**). At that scale, an editable document was once hard to imagine.

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
