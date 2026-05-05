---
title: Adapter & DOM query
description: DomAdapter maps Component/Slot to DOM; query APIs from model to pixels and back.
---

# Adapter

In the browser, the **view adapter** (**`ViewflyAdapter` / `VueAdapter` / `ReactAdapter`**) extends **`DomAdapter`**, which extends **`Adapter`** from **`@textbus/core`**. While rendering, it keeps two maps in memory: **`Component` / `Slot`** in the document, and the **real DOM** already mounted on the page. With that mapping you can jump between **model** and **pixels** when building **bubble menus, floating toolbars, collaboration cursors**, and similar features.

This page only covers these **queries** on **`Adapter`**: from a component or slot to DOM, or from DOM back to component, slot, and position in the document. For **`mount`**, **`slotRender`**, **`BrowserModule`**, see:

- [Viewfly adapter](./adapter-viewfly)
- [Vue adapter](./adapter-vue)
- [React adapter](./adapter-react)
- [Browser module](./platform-browser)

## What the adapter remembers

Think of two **registries**.

The **first** maps each **document block (`Component`)**: the outermost real DOM of the block view must be registered with the adapter via **`rootRef`** on the block view props—only then is the block “on the books.” The **second** maps each **`Slot`**: the root container you wrap with **`slotRender`** in the view is that slot’s **DOM entry**.

Queries below only work for **registered** roots; if something is not rendered, **`rootRef`** is missing, or the node you pass is not the **root** but an inner child, you get **`null`** or an empty array.

## Getting the adapter in block views

Query methods live on the **`Adapter`** instance. In **block views** (or subtrees mounted from **`mount`**), obtain that instance first.

In **Viewfly**, dependency injection is typical:

```tsx
import { Adapter } from '@textbus/core'
import { inject } from '@viewfly/core'

// Inside the block view setup
const adapter = inject(Adapter)
```

**Vue / React** do not use a global **`inject(Adapter)`** convention; usual pattern is **`provide` / `Context.Provider`** in **`mount`** for **`Adapter`** (or **`VueAdapter` / `ReactAdapter`**), then **`inject` / `useContext`** in block views. See **`AdapterContext`**-style examples in each adapter guide.

In the sections below, **`adapter`** means the instance obtained this way.

## From component to root DOM element

When you already hold a **`Component`** instance (e.g. **`props.component`** in a block view) and need its on-screen bounds—for **scrolling the block into view** or **anchoring a overlay**—use **`getNativeNodeByComponent`**. It returns the **outermost** layer of the block view, i.e. the **`Element`** bound with **`rootRef`**; if not mounted or **`rootRef`** is wrong, you get **`null`**.

```tsx
import type { Adapter, Component } from '@textbus/core'

function scrollBlockIntoView(adapter: Adapter, block: Component) {
  const root = adapter.getNativeNodeByComponent(block)
  if (root) {
    root.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}
```

## From root DOM to document component

The opposite case: **`event.target`** is an **`Element`** and you want to know if it is a **document block root**, then read the **`Component`**. Use **`getComponentByNativeNode`**.

**Important:** the component is returned **only** when the node you pass **is** a registered block root; clicks on inner **`span` / `p`** nodes return **`null`**—the adapter does **not** walk up the tree for you.

```tsx
import type { Adapter, Component } from '@textbus/core'

function findBlockIfClickedRoot(adapter: Adapter, target: Element | null): Component | null {
  if (!target) {
    return null
  }
  return adapter.getComponentByNativeNode(target)
}
```

## From slot to root DOM element

A **`Slot`** is a content container nested inside a block. Given a **`Slot`** reference (e.g. **`component.state.slot`**), **`getNativeNodeBySlot`** returns the **element** for the root container produced by **`slotHostRender`** inside **`slotRender`**. If that slot has not been painted yet, you get **`null`**.

```tsx
import type { Adapter } from '@textbus/core'
import type { Slot } from '@textbus/core'

function measureSlotWidth(adapter: Adapter, slot: Slot): number | null {
  const root = adapter.getNativeNodeBySlot(slot)
  if (!root) {
    return null
  }
  return root.getBoundingClientRect().width
}
```

## From root DOM to slot

Similarly: given an **`Element`**, **`getSlotByNativeNode`** tells you if it is a **slot content root** (the **root** layer from **`slotRender`**). If yes, returns the **`Slot`**; otherwise **`null`**.

```tsx
import type { Adapter } from '@textbus/core'
import type { Slot } from '@textbus/core'

function slotFromSlotRootElement(adapter: Adapter, el: Element): Slot | null {
  return adapter.getSlotByNativeNode(el)
}
```

## Listing native nodes inside a slot

**`getNodesBySlot`**, **once the slot has a root DOM**, walks **this level’s content** in **the same order as children in the document**, yielding matching **`Element`** and **`Text`** nodes (text nodes appear as their own entries). Use this to align with **browser selection / `Range`** instead of **`querySelectorAll`** and guessing order.

If the slot has no root DOM yet, the result is an **empty array `[]`**.

```tsx
import type { Adapter } from '@textbus/core'
import type { Slot } from '@textbus/core'

function logSlotNativeOrder(adapter: Adapter, slot: Slot): void {
  const nodes = adapter.getNodesBySlot(slot)
  for (const node of nodes) {
    const kind = node instanceof Element ? node.tagName : '#text'
    console.log(kind, node)
  }
}
```

## From any node back to a document position

**`getLocationByNativeNode`** is the most general: you can pass **any deep** **`Element` or `Text`** inside a slot root; it **walks up** to the owning slot root and computes **`NodeLocation`** (includes **`slot`** and index range in the document—see **`@textbus/core`** exports). That turns a **browser hit** into a **model position**.

If the node is not under any registered slot subtree, returns **`null`**.

```tsx
import type { Adapter } from '@textbus/core'

function hitToModel(adapter: Adapter, node: Element | Text) {
  const loc = adapter.getLocationByNativeNode(node)
  if (!loc) {
    return
  }
  // loc.slot is the owning Slot; fields follow NodeLocation
  console.log('position in document', loc)
}
```

## Further reading

Wiring, **`rootRef`**, **`slotRender`**, **`BrowserModule`**: [Viewfly](./adapter-viewfly) / [Vue](./adapter-vue) / [React](./adapter-react). Input and selection bridge behavior: [Browser module](./platform-browser).
