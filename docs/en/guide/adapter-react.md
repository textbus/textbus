---
title: React adapter
description: ReactAdapter with BrowserModule, ViewComponentProps, AdapterContext, slotRender, createVNode.
---

# React adapter

**`@textbus/adapter-react`** implements block views in **React** and, with **`BrowserModule`**, runs in the browser. The examples below match the **`ReactAdapter` + `BrowserModule` + `Textbus`** order from [Getting started](./getting-started), written for **5.x** (**`ReactAdapter`**, **`new RootComponent({ slot })`**, etc.).

**`Component` / `Slot` DOM query APIs**: [Adapter](./adapter).

For a full project and build setup, see [textbus/react-demo](https://github.com/textbus/react-demo).

::: warning React and performance

Because of how **React** schedules updates, very large documents often get lower frame rates than the **Viewfly** path; that is not always the same as “Textbus usage” or “how simple the adapter is.” If you have an enormous number of blocks and typing smoothness is the top priority, consider the [Viewfly adapter](./adapter-viewfly) first.

:::

## Dependencies

```bash
npm install @textbus/adapter-react
```

You also need **`react`**, **`react-dom`** (**18+** with **`createRoot`**), **`@textbus/core`**, **`@textbus/platform-browser`**, **`reflect-metadata`**.

## View conventions

- Block views are **function components** with **`ViewComponentProps<YourModel>`**; call **`useContext(AdapterContext)`** to get **`ReactAdapter`**, then **`slotRender`**.
- Inside the **`slotRender`** factory, use **`createVNode`** from **`@textbus/core`** (same as the [Vue adapter](./adapter-vue)); do **not** wrap **`children`** with **`React.createElement`** directly.
- **Root block view**: wrap the outer real DOM (**`<div ref={props.rootRef} …>`**), and in the **`slotRender`** factory use **`createVNode('div', null, children)`** for the slot subtree.
- **Paragraph block view**: you can **`return adapter.slotRender(slot, children => createVNode('p', { ref: props.rootRef, … }, children))`** so **`rootRef`** sits on the **`p`**.

## **`ReactAdapter` + `BrowserModule` + `Textbus`**

In **`mount`**, use **`createRoot(host)`** to render **`<AdapterContext.Provider value={adapter}>{root}</AdapterContext.Provider>`**; block views read the adapter with **`useContext(AdapterContext)`**—no module-level **`ref`** needed.

The example splits into **two models, two block views, `adapter-context`, and a main entry**; model code is **5.x**. Keep files in one directory and use the tabs.

::: code-group

```tsx [main.tsx]
import 'reflect-metadata'
import { createRoot } from 'react-dom/client'
import { BrowserModule } from '@textbus/platform-browser'
import { ReactAdapter } from '@textbus/adapter-react'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { AdapterContext } from './adapter-context'
import { ParagraphComponent } from './components/paragraph.component'
import { ParagraphView } from './components/paragraph.view'
import { RootComponent } from './components/root.component'
import { RootComponentView } from './components/root.view'

let editor!: Textbus

const adapter = new ReactAdapter(
  {
    [RootComponent.componentName]: RootComponentView,
    [ParagraphComponent.componentName]: ParagraphView,
  },
  (host, root) => {
    const app = createRoot(host)
    app.render(
      <AdapterContext.Provider value={adapter}>{root}</AdapterContext.Provider>
    )
    return () => {
      app.unmount()
    }
  }
)

const browserModule = new BrowserModule({
  adapter,
  renderTo() {
    return document.getElementById('editor') as HTMLElement
  },
})

editor = new Textbus({
  imports: [browserModule],
  components: [RootComponent, ParagraphComponent],
})

const rootModel = new RootComponent({
  slot: new Slot([ContentType.BlockComponent]),
})

void editor.render(rootModel)
```

```ts [adapter-context.ts]
import { createContext } from 'react'
import type { ReactAdapter } from '@textbus/adapter-react'

export const AdapterContext = createContext<ReactAdapter>(null as any)
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
import type { ViewComponentProps } from '@textbus/adapter-react'
import { createVNode } from '@textbus/core'
import { useContext } from 'react'

import { AdapterContext } from '../adapter-context'
import { ParagraphComponent } from './paragraph.component'

export function ParagraphView(props: ViewComponentProps<ParagraphComponent>) {
  const slot = props.component.state.slot
  const adapter = useContext(AdapterContext)
  return adapter.slotRender(slot, children =>
    createVNode('p', {
      ref: props.rootRef,
      'data-component': ParagraphComponent.componentName,
    }, children)
  )
}
```

```tsx [components/root.view.tsx]
import type { ViewComponentProps } from '@textbus/adapter-react'
import { createVNode } from '@textbus/core'
import { useContext } from 'react'

import { AdapterContext } from '../adapter-context'
import { RootComponent } from './root.component'

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const slot = props.component.state.slot
  const adapter = useContext(AdapterContext)
  return (
    <div ref={props.rootRef as any} data-component={RootComponent.componentName}>
      {adapter.slotRender(slot, children => createVNode('div', null, children))}
    </div>
  )
}
```

:::

**`renderTo`** returns an outer container such as **`#editor`**; **do not** return **`adapter.host`**. On teardown call **`editor.destroy()`** so the **`unmount`** returned from **`mount`** runs.

## **`slotRender` and `AdapterContext`**

The sample wraps the kernel **`root`** with **`AdapterContext.Provider`** in **`mount`**; **`RootComponentView`** / **`ParagraphView`** call **`useContext(AdapterContext)`** and then **`slotRender`**. To expose **`Textbus`** in the React tree, add **`createContext<Textbus | null>(null)`** and nest another **`Provider`** in the same **`mount`**.

## What’s next

- [Viewfly adapter](./adapter-viewfly), [Vue adapter](./adapter-vue)  
- [Browser module](./platform-browser)
