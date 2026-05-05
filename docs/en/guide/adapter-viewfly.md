---
title: Viewfly adapter
description: ViewflyAdapter with BrowserModule, ViewComponentProps, slotRender, rootRef, teardown.
---

# Viewfly adapter

**`@textbus/adapter-viewfly`** renders the **`Component`** tree from the document model as a **Viewfly** component tree, and together with **`BrowserModule`** from **`@textbus/platform-browser`** handles **mounting, selection, and input** in the browser.

If you have not wired a minimal app yet, follow [Getting started](./getting-started) for **deps, TypeScript / Vite, and Viewfly JSX**. This page assumes you can already define **`RootComponent` / `ParagraphComponent`** and block views like **`RootComponentView`**.

**`Component` / `Slot` DOM query APIs**: [Adapter](./adapter).

## Dependencies

Besides **`@textbus/core`** and **`@textbus/platform-browser`**, install at least **`@textbus/adapter-viewfly`**, **`@viewfly/core`**, **`@viewfly/platform-browser`**, and **`reflect-metadata`** (must run **before** any **`@textbus/*`** imports—[Getting started](./getting-started)).

Configure **Viewfly JSX** with **`jsx: "react-jsx"`** and **`jsxImportSource: "@viewfly/core"`**, and mirror **`jsxImportSource`** in Vite **`esbuild`** / **`optimizeDeps.esbuildOptions`**.

## Combining with **`BrowserModule`** (browser)

**`BrowserModule`** owns the editor chrome, places **`adapter.host`** on the page, and wires **`Input` / `SelectionBridge`**, …; **`ViewflyAdapter`** **renders document blocks as Viewfly**. Join them via **`Textbus`** **`imports`**.

Recommended order (same as the embedded playground in [Getting started](./getting-started)):

1. Provide a **container DOM** (e.g. **`#editor-host`**) and obtain **`HTMLElement`** in code (below uses **`createRef`**).
2. **`new ViewflyAdapter(componentMap, mount)`**: in **`mount`**, **`createApp(root, { context })`** mounts the kernel’s **root Viewfly node** on **`host`**; pass **`context`** (**`Injector`**) through so block views can **`useContext(Selection)`**, ….
3. **`new BrowserModule({ adapter, renderTo })`**: **`renderTo`** returns the **step 1 container**; **do not** return **`adapter.host`** from **`renderTo`**—the kernel inserts **`adapter.host`** into **`BrowserModule`**’s layout, then mounts that into your container.
4. **`new Textbus({ components, imports: [browserModule, …] })`**, then **`await editor.render(rootComponent)`** in **`onMounted`** (or equivalent).
5. On teardown call **`editor.destroy()`** and run the teardown returned from **`mount`** (e.g. **`app.destroy()`**).

The sample below uses **two models, two block views, one entry** across **5 files** (e.g. four files under **`src/components/`**, **`src/App.tsx`** entry).

::: code-group

```tsx [App.tsx]
import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted, onUnmounted } from '@viewfly/core'
import { BrowserModule } from '@textbus/platform-browser'
import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { ParagraphComponent } from './components/paragraph.component'
import { ParagraphComponentView } from './components/paragraph.view'
import { RootComponent } from './components/root.component'
import { RootComponentView } from './components/root.view'

function App() {
  const editorRef = createRef<HTMLDivElement>()
  let editor: Textbus | null = null

  onMounted(() => {
    const adapter = new ViewflyAdapter(
      {
        [RootComponent.componentName]: RootComponentView,
        [ParagraphComponent.componentName]: ParagraphComponentView,
      },
      (mountHost, root, context) => {
        const vf = createApp(root, { context })
        vf.mount(mountHost)
        return () => vf.destroy()
      }
    )

    const browserModule = new BrowserModule({
      adapter,
      renderTo: () => editorRef.current as HTMLElement,
    })

    editor = new Textbus({
      components: [RootComponent, ParagraphComponent],
      imports: [browserModule],
    })

    const docRoot = new RootComponent({
      slot: new Slot([ContentType.BlockComponent]),
    })

    void editor.render(docRoot)
  })

  onUnmounted(() => {
    editor?.destroy()
    editor = null
  })

  return () => (
    <div>
      <div ref={editorRef} id="editor-host" class="tb-editor-host" />
    </div>
  )
}

createApp(<App />).mount(document.getElementById('root') as HTMLElement)
```

```ts [components/paragraph.component.ts]
import {
  Commander,
  Component,
  type ComponentStateLiteral,
  ContentType,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf,
} from '@textbus/core'

export interface ParagraphComponentState {
  slot: Slot
}

export class ParagraphComponent extends Component<ParagraphComponentState> {
  static componentName = 'ParagraphComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: ComponentStateLiteral<ParagraphComponentState>) {
    const slot = textbus.get(Registry).createSlot(state.slot)
    return new ParagraphComponent({ slot })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    const self = useSelf()

    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = new ParagraphComponent({ slot: nextContent })
      commander.insertAfter(p, self)
      selection.setPosition(nextContent, 0)
    })
  }
}
```

```ts [components/root.component.ts]
import {
  Component,
  type ComponentStateLiteral,
  ContentType,
  onContentInsert,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
} from '@textbus/core'

import { ParagraphComponent } from './paragraph.component'

export interface RootComponentState {
  slot: Slot
}

export class RootComponent extends Component<RootComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: ComponentStateLiteral<RootComponentState>) {
    const slot = textbus.get(Registry).createSlot(state.slot)
    return new RootComponent({ slot })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const selection = useContext(Selection)
    onContentInsert(ev => {
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        const slot = new Slot([ContentType.Text])
        const p = new ParagraphComponent({ slot })
        slot.insert(ev.data.content)
        ev.target.insert(p)
        selection.setPosition(slot, slot.index)
        ev.preventDefault()
      }
    })
  }
}
```

```tsx [components/paragraph.view.tsx]
import { createVNode } from '@textbus/core'
import { inject } from '@viewfly/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import type { Adapter } from '@textbus/core'

import type { ParagraphComponent } from './paragraph.component'

export function ParagraphComponentView(props: ViewComponentProps<ParagraphComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children =>
      createVNode('p', { ref: props.rootRef }, children)
    )
  }
}
```

```tsx [components/root.view.tsx]
import { createVNode } from '@textbus/core'
import { inject } from '@viewfly/core'
import type { ViewComponentProps } from '@textbus/adapter-viewfly'
import type { Adapter } from '@textbus/core'

import type { RootComponent } from './root.component'

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const adapter = inject(Adapter)
  return () => {
    const slot = props.component.state.slot
    return adapter.slotRender(slot, children =>
      createVNode('div', { 'textbus-document': 'true', ref: props.rootRef }, children)
    )
  }
}
```

:::

**`ViewflyAdapter`** extends **`DomAdapter`** and implements **`slotRender`**, composition underlines, …—it **is** the **`adapter`** type **`BrowserModule`** expects, not a generic UI widget.

## **`ViewflyAdapter`** constructor args

**First argument**: **`ViewflyAdapterComponents`** — **`Record<string, ComponentSetup<ViewComponentProps<any>>>`**. Keys are **`Component.componentName`**; values are the block’s Viewfly view. The kernel looks up by document node **`name`**; missing views (no **`'*'`** fallback) throw an error like **`cannot found view component \`…\`!`** (ellipsis = **`component.name`**).

**Second argument**: **`ViewMount`**. The kernel passes **`adapter.host`** as **`host`**, the root block’s **Viewfly root** as **`root`**; **`context`** is **`Textbus`**’s **`Injector`**—**must** pass to **`createApp(root, { context })`** so **`useContext`** works for **`Selection`**, **`Commander`**, ….

## Block views: **`ViewComponentProps`**

Each block view is a Viewfly component setup; props type **`ViewComponentProps<T>`** (**`T`** = your **`Component`** subclass):

- **`props.component`**: current document node—read **`state`**; kernel services in model **`setup()`** still come from **`useContext`**.
- **`props.rootRef`**: **`DynamicRef<Element>`**—**must** attach to the block’s **root DOM** (e.g. **`<div ref={props.rootRef}>`**). **`DomAdapter`** caches model ↔ root DOM for selection, IME, and **`slotRender`** hosts. Missing binding throws **`Component \`…\` is not bound to rootRef`**.

## Rendering slots: **`adapter.slotRender`**

Body content lives in **`Slot`** in the model; in the view use **`Adapter.slotRender`** to bridge to vdom. In Viewfly the factory callback returns **`VElement` / `VTextNode` / child `Component`**—wrap with **`createVNode`** (from **`@textbus/core`**) when you need a host element Viewfly can render.

Single-slot paragraphs: see **`paragraph.view.tsx`**. For multi-slot or custom chrome, keep **`ref={props.rootRef}`** on **one** root element per block; slot regions can use child components (e.g. subscribe **`slot.__changeMarker__`** and **`markAsDirtied`**—[Getting started](./getting-started) **`SlotRender`** pattern, [Slot](./slot)).

## **`ViewflyVDomAdapter`**

The package also exports **`ViewflyVDomAdapter`** (extends **`NodeViewAdapter`** from **`@textbus/platform-node`**) for **non-browser / string views**, …—not the main **`ViewflyAdapter` + `BrowserModule`** browser path. Most apps only need **`ViewflyAdapter`**.

## FAQ

- **Decorator metadata**: missing **`emitDecoratorMetadata`** or **`reflect-metadata`** can break **`Textbus`** DI at startup.
- **`rootRef` on root DOM**: block view outermost node must be **real DOM** with **`rootRef`**; **`Fragment`** or wrappers without **`ref`** cause **`rootRef`** errors.
- **Teardown**: on route/modal unload call **`Textbus`** **`destroy()`** and run **`mount`** teardown (**`app.destroy()`**).

## What's next

- [Vue adapter](./adapter-vue), [React adapter](./adapter-react)  
- [Browser module](./platform-browser)  
- [Component basics](./component-basics), [Slot](./slot)
