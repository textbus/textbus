---
title: Vue adapter
description: VueAdapter with BrowserModule, ViewComponentProps, slotRender, rootRef, provide/inject.
---

# Vue adapter

**`@textbus/adapter-vue`** renders **`Component`** block views with **Vue 3** **`defineComponent` + `setup`** (or equivalent), and together with **`BrowserModule`** wires up the browser. The examples below match the **`VueAdapter` + `BrowserModule` + `Textbus`** wiring order from [Getting started](./getting-started), written for **current 5.x** (e.g. **`new RootComponent({ slot })`** only passes initial data; **`fromJSON`** uses **`Registry.createSlot`**).

**`Component` / `Slot` DOM query APIs**: [Adapter](./adapter).

For a full project layout and build setup, see [textbus/vue-demo](https://github.com/textbus/vue-demo).

## Dependencies

```bash
npm install @textbus/adapter-vue
```

You also need **`vue@3`**, **`@textbus/core`**, **`@textbus/platform-browser`**, **`reflect-metadata`**, and a bundler that can resolve **`@viewfly/core`** (used internally by the adapter for **`ReflectiveInjector`**).

## View conventions

- Block views are **`.vue` SFCs**: bind **`rootRef`** on the outer real DOM (**`:ref="rootRef"`**), render the slot subtree with **`<component :is="slotRender()" />`**; inside **`slotRender`**, **`inject(AdapterInjectToken)`** then call **`adapter.slotRender`**. In the factory, wrap **`children`** with **`createVNode`** from **`@textbus/core`** (same as the [Viewfly adapter](./adapter-viewfly)). Do **not** wrap **`children`** with **`h`**.
- **`import`** paths below are relative (replace with your **`@/`** alias if configured).

## **`VueAdapter` + `BrowserModule` + `Textbus`**

The **`mount`** passed to **`new VueAdapter`** runs only when **`editor.render(...)`** runs, so you can **`provide`** **`Textbus`** and **`VueAdapter`** inside **`mount`**—by then **`editor`** is assigned (see **`let editor`** below). The **`adapter`** referenced in the **`mount`** closure is fully constructed on the first **`render`**.

Recommended order: **`tokens.ts` (`InjectionKey`) → `inject(AdapterInjectToken)` in block views → `let editor` → `const adapter = new VueAdapter(...)` → inside `mount`, `createApp(root).provide(..., editor).provide(..., adapter)` → `new BrowserModule` → `editor = new Textbus(...)` → `void editor.render(root model)`**.

The example splits into **two models, two `.vue` block views, tokens, and a main entry**; keep them in one directory and use the tabs to browse.

::: code-group

```ts [main.ts]
import 'reflect-metadata'
import { createApp } from 'vue'
import { BrowserModule } from '@textbus/platform-browser'
import { VueAdapter } from '@textbus/adapter-vue'
import { ContentType, Slot, Textbus } from '@textbus/core'

import { AdapterInjectToken, TextbusInjectToken } from './tokens'
import { ParagraphComponent } from './components/paragraph.component'
import ParagraphView from './components/paragraph.view.vue'
import { RootComponent } from './components/root.component'
import RootView from './components/root.view.vue'

let editor!: Textbus

const adapter = new VueAdapter(
  {
    [RootComponent.componentName]: RootView as any,
    [ParagraphComponent.componentName]: ParagraphView as any,
  },
  (host, root) => {
    const app = createApp(root)
      .provide(TextbusInjectToken, editor)
      .provide(AdapterInjectToken, adapter)
    app.mount(host)
    return () => app.unmount()
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

```ts [tokens.ts]
import { InjectionKey } from 'vue'
import { Textbus } from '@textbus/core'
import { VueAdapter } from '@textbus/adapter-vue'

export const TextbusInjectToken: InjectionKey<Textbus> = Symbol('Textbus')
export const AdapterInjectToken: InjectionKey<VueAdapter> = Symbol('Adapter')
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

```vue [components/paragraph.view.vue]
<template>
  <div :ref="rootRef" data-component="paragraph">
    <component :is="slotRender()" />
  </div>
</template>
<script lang="ts" setup>
import { inject, defineProps } from 'vue'
import { ViewComponentProps } from '@textbus/adapter-vue'
import { createVNode } from '@textbus/core'
import { AdapterInjectToken } from '../tokens'
import { ParagraphComponent } from './paragraph.component'

const props = defineProps<ViewComponentProps<ParagraphComponent>>()
const adapter = inject(AdapterInjectToken)!

function slotRender() {
  const slot = props.component.state.slot
  return adapter.slotRender(slot, children => {
    return createVNode('p', null, children)
  })
}
</script>
```

```vue [components/root.view.vue]
<template>
  <div data-component="root" :ref="rootRef">
    <component :is="slotRender()" />
  </div>
</template>
<script lang="ts">
import { defineComponent, inject } from 'vue'
import { ViewComponentProps } from '@textbus/adapter-vue'
import { createVNode } from '@textbus/core'
import { AdapterInjectToken } from '../tokens'
import { RootComponent } from './root.component'

export default defineComponent({
  props: ['component', 'rootRef'],
  setup(props: ViewComponentProps<RootComponent>) {
    const adapter = inject(AdapterInjectToken)!
    return {
      slotRender() {
        const slot = props.component.state.slot
        return adapter.slotRender(slot, children => {
          return createVNode('div', null, children)
        })
      },
    }
  },
})
</script>
```

:::

**`renderTo`** must return the **outer page container** (e.g. **`#editor`**); **do not** return **`adapter.host`**. On page teardown call **`editor.destroy()`** so the teardown returned from **`mount`** runs (**`app.unmount()`**).

## **`slotRender` and `provide` / `inject`**

- **`AdapterInjectToken`**: **`provide(AdapterInjectToken, adapter)`** in **`mount`**, then **`inject(AdapterInjectToken)!`** in block view **`setup`** before calling **`slotRender`**—no module-level **`ref`** or a predeclared **`let adapter`**.
- **`TextbusInjectToken`**: lets you **`inject(TextbusInjectToken)`** in the Vue subtree for toolbars, status panels, etc.; **`Selection`**, **`Commander`**, and other kernel services are still accessed from **`Component.setup()`** via **`useContext`** (**`@textbus/core`**).

## **`ViewMount` third argument**

The current **`ViewMount`** signature is **`(host, root, context)`** where **`context`** is an **`Injector`**. The sample ignores the third parameter; to expose kernel **`Injector`** services to the Vue subtree, **`provide`** custom **`InjectionKey`**s in **`mount`** with values from **`context.get(...)`** (types per **`@textbus/adapter-vue`** and **`@textbus/core`** exports).

## What’s next

- [Viewfly adapter](./adapter-viewfly), [React adapter](./adapter-react)  
- [Browser module](./platform-browser)
