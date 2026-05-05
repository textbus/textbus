---
title: Getting started
description: Minimal Vite + TypeScript + Viewfly editor with core, platform-browser, and ViewflyAdapter.
---

# Getting started

If you have not read the product overview and package split yet, start with [Introduction](./introduction).

This guide builds a minimal editor with **Vite + TypeScript + Viewfly** where you can type and press Enter for new lines: **`@textbus/core`** supplies the model and kernel, **`@textbus/platform-browser`** handles browser mounting and input, and **`@textbus/adapter-viewfly`** renders the document as a Viewfly tree. If you use **Vue** or **React**, you do not need Viewfly—see the [Vue adapter](./adapter-vue) and [React adapter](./adapter-react).

## What you'll learn

- Install the smallest useful set of npm packages  
- Configure decorators and JSX for this stack  
- Wire **`ViewflyAdapter`** and **`BrowserModule`**, create an instance with **`new Textbus`**, then **`render`**

## 1. Scaffold the project and install dependencies

Create a Vite project locally (**Vanilla + TypeScript** template):

```bash
# Vanilla + TypeScript template — easy to add Viewfly JSX
npm create vite@latest my-textbus-editor -- --template vanilla-ts
cd my-textbus-editor
npm install
```

Install Textbus and Viewfly packages (pin versions to the current **5.x** line on npm; ranges below are illustrative):

```bash
# reflect-metadata: decorator metadata; the rest are core, browser layer, Viewfly adapter, and runtime
npm install reflect-metadata @textbus/core @textbus/platform-browser @textbus/adapter-viewfly @viewfly/core @viewfly/platform-browser
npm install -D vite typescript @types/node
```

Point the entry file to **`src/App.tsx`** (if it is still `main.ts`, rename it and update **`index.html`** so the script loads `/src/App.tsx`).

## 2. Configure TypeScript and Vite

The kernel relies on **decorator metadata**, and this walkthrough uses **Viewfly JSX**. Set **`tsconfig.json`** to at least:

::: code-group

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    // Viewfly: react-jsx automatic runtime, resolve via @viewfly/core
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core",
    // Decorators + emitDecoratorMetadata: required for Textbus DI
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // Matches decorator field init order (same as this repo’s examples)
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

```ts [vite.config.ts]
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    // Match tsconfig jsxImportSource
    jsx: 'automatic',
    jsxImportSource: '@viewfly/core'
  },
  optimizeDeps: {
    esbuildOptions: {
      // Pre-bundle deps with the same Viewfly JSX settings
      jsx: 'automatic',
      jsxImportSource: '@viewfly/core'
    }
  }
})
```

:::

Setting **`useDefineForClassFields`** to **`false`** avoids odd interactions between some decorators and class fields (aligned with the examples in this repository).

## 3. Page HTML

Root **`index.html`** exposes the Viewfly mount **`#root`**; **`App.tsx`** renders **`#editor-host`** (**`.tb-editor-host`** needs enough **`min-height`**—`240px` in this sample—or the editing surface is hard to click or focus:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Textbus minimal sample</title>
    <style>
      body {
        margin: 0;
        padding: 1rem;
      }
      /* Editor host needs height so it is easy to click and focus */
      .tb-editor-host {
        min-height: 240px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <!-- Viewfly mount -->
    <div id="root"></div>
    <!-- Entry: first line of App.tsx must be import 'reflect-metadata' -->
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>
```

## 4. Components, adapter, and entry

This example uses three files: **`App.tsx`**, **`components/root.component.tsx`**, and **`components/paragraph.component.tsx`** (place them under `src/` or your preferred layout). In the view: **only the slot render factory** (the **second argument** passed to **`adapter.slotRender`**) must wrap kernel children with **`createVNode`**; **DOM outside slots** can use **Viewfly JSX** (see **`TodoRowView`** in [Component basics](./component-basics)).

You can edit the sample below and switch to **Preview** to try it; for a project identical to the steps above, still copy the code into your own repo and install/configure TypeScript and Vite as described.

<TextbusPlayground />

## 5. Run and verify

```bash
# Open the dev URL printed in the terminal; confirm typing works and Enter inserts a new line
npm run dev
```

Open the local URL in a browser and click the editing area—you should be able to type; **Enter** inserts a new paragraph (handled by **`onBreak`** in `ParagraphComponent`; see [Component events & lifecycle](./component-events-and-lifecycle) for hooks overview).

## FAQ

- **`reflect-metadata` must load first in the entry**: otherwise decorator metadata may be incomplete and dependency injection can fail at runtime. Keep **`import 'reflect-metadata'`** as the **first statement** in **`App.tsx`** (before other **`@textbus/*`** imports).
- **JSX and `jsxImportSource`**: **`tsconfig.json`** and **`vite.config.ts`** should both point **`jsxImportSource`** at **`@viewfly/core`**, or view components will not compile correctly.
- **Destroying the instance**: if you need to tear down the editor when the page unmounts, call **`destroy()`** on the **`Textbus`** instance (this sample does not show routing; wire this up when integrating into an SPA).

## What's next

- Grow from this project: read the **Basics** section in order from [Component basics](./component-basics) through [Document parsing & compatibility](./document-parse-compat)  
- Terminology: [Concepts](./concepts)  
- Plugins and kernel extension: [Modules & extensions](./editor-and-modules)  
- Collaboration: [Collaboration](./collaborate)
