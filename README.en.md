**[中文](README.md)**

<h1 align="center">Textbus</h1>

🚀 Textbus is a component-based, cross-platform, data-driven rich text framework. You can render rich text with [Viewfly](https://github.com/viewfly/viewfly), Vue, or React, with first-class support for **real-time multi-user collaboration**. It lets you build fully custom editors similar to DingTalk Docs, Shimo Docs, Feishu Docs, and more.

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green">
  <img src="https://img.shields.io/npm/v/%40textbus%2Fcore">
  <img src="https://img.shields.io/npm/dm/%40textbus/core">
</p>

## Documentation

[Textbus documentation](https://textbus.io) · [English docs](https://textbus.io/en/)

### XNote editor

XNote is an official, headless, high-performance open-source rich text editor from the Textbus team, built on Textbus 4.x. It ships with most features out of the box and serves as hands-on reference if you build your own editor. Repository: [https://github.com/textbus/xnote](https://github.com/textbus/xnote).

Try the live demo: [Playground](https://textbus.io/playground)

Introduction
-------------------------------------------------------------

We aim to make rich text development feel like everyday frontend work: small APIs, light conventions, and smooth, interactive editors.

To tackle classic pain points, Textbus brings **components** into the rich text model so building an editor is more like stacking blocks—not an uncrossable gap. Whether you are experienced with editors or new to frontend work, Textbus helps you ship better rich text.

### Highlights

+ **Component-based**: A component system tailored to rich text—complex layouts and custom widgets are as straightforward as in modern UI frameworks.
+ **Fully controlled**: Data-driven I/O through the core yields consistent behavior across browsers.
+ **Easy to extend**: Hook-style APIs make it simple to customize the same events in different contexts. Multiple UI stacks are supported so complex interactions stay manageable.
+ **Shortcut / grammar sugar**: Flexible input transforms—e.g. Markdown-style `#` + space to headings—or your own rules.
+ **Paste compatibility**: Pluggable parsing helps preserve content pasted from the web, Word, and other sources.
+ **Schema constraints**: Deep nesting or strict block-only structures—your choice.
+ **Powerful transforms**: Built-in structural transforms—hard for tree-shaped editors, included here.
+ **Collaboration**: Official Yjs-based collaboration is available; you can also wire your own sync layer.
+ **High-level selection**: Cursor and selection are abstracted—you rarely fight raw browser selection APIs.

### Packages

| Package | Role |
|:--------------------------|:--------------------------------------------------------------------------------------|
| @textbus/core | Core model: components, slots, formats, attributes; selection; transforms; rendering; lifecycle; editing commands; history; shortcuts; grammar sugar; export/serialization. |
| @textbus/platform-browser | Browser layer: view integration, selection bridge, caret, and DOM rendering. |
| @textbus/collaborate | Collaboration module with Yjs-oriented connectors. |
| @textbus/adapter-viewfly | View adapter for **Viewfly** to render rich text. |
| @textbus/adapter-vue | View adapter for **Vue**. |
| @textbus/adapter-react | View adapter for **React**. |
| @textbus/platform-node | Utilities for running Textbus on **Node.js**. |


## Local development

This repo uses **pnpm** workspaces. Install pnpm globally:

```
npm install pnpm -g
```

Clone the repo and install dependencies:

```
git clone git@github.com:textbus/textbus.git
cd textbus
pnpm install
```

Start the dev environment:

```
npm start
```

## Sponsorship

Textbus grows with community support. If it helped you and you would like to say thanks, you can use the QR codes below.

![](./_source/wx.jpg) ![](./_source/alipay.jpg)

## License

Textbus and its subpackages use the [MIT License](./LICENSE).
