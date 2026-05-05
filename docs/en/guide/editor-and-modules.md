---
title: Modules & extensions
description: TextbusConfig, Module, imports merge order, lifecycle hooks, Plugin vs Module, Registry, providers.
---

# Modules & extensions

Once you know [Concepts](./concepts), [Component basics](./component-basics), and the [Browser module](./platform-browser), this page explains how **`BrowserModule`**, collaboration, custom **`providers`**, and more **fit into one `Textbus` instance**: **`Module` / `imports` / `Plugin`** responsibilities, **startup and teardown order**, and practical rules for **`Registry` name clashes** and **`providers` overrides**.

If you only need more block types, formats, or attributes, start with the getting-started material and [Advanced components](./component-advanced); here the focus is **config merging and extension timing**.

## `TextbusConfig` and `Module`

**`TextbusConfig`** (the type of **`new Textbus({ ... })`** args) **extends `Module`**: the root config may itself carry **`components` / `formatters` / `attributes` / `providers` / `plugins`** plus **`Module`** lifecycle hooks. **`imports?: Module[]`** merges packaged modules such as **`BrowserModule`** and **`CollaborateModule`** into the same editor instance.

**`Module`** is a **plain object** (class instance or literal)—“a bundle of registrations + optional hooks”; you **do not** have to extend a base class.

## Common config fields

| Field | Role |
|-------|------|
| **`components`** | **Component classes** that may appear in the document (**`componentName`** must be unique). |
| **`formatters`** / **`attributes`** | **Formats** / **attributes** available in the editor; pass **instances** or **`(textbus) => instance`** factories for lazy creation. |
| **`imports`** | Merge multiple **`Module`**s into this editor in order. |
| **`providers`** | **`Provider[]`** from **`@viewfly/core`**—register or **override** implementations in the IoC container (e.g. replacing **`Adapter`** requires the correct **`provide`** token). |
| **`plugins`** | After the main view **`render`** completes, run each **`setup`** (see **`Plugin`** below). |
| **`readonly` / `historyStackSize` / `zenCoding` / `additionalAdapters`** | Read-only, history stack, Zen Coding sugar, extra **`Adapter`**s, and other globals. |

In the browser you must end up with a usable **`Adapter`** and **`NativeSelectionBridge`** (usually from **`BrowserModule`**); otherwise **`render`** fails.

## `imports` and list merging

**Rough rules** (components / formats / attributes behave differently from **`providers` / `plugins`**):

- **`components` / `formatters` / `attributes`**: items from the **root** config merge **before** each **`import` module**; **on name clash, the root wins**; if the clash is **only between `imports`**, **earlier entries in the `imports` array win**.
- **`providers`**: root and each module’s **`providers`** merge as **root first, then `imports` order**; **the same token provided multiple times is usually overridden by later ones** (if that surprises you, trim the config or **`imports` order**).
- **`plugins`**: root and modules’ **`plugins`** are **concatenated in order** and each **`setup`** runs **after the main view is ready**.

When **`formatters` / `attributes`** use **`(textbus) => instance`**, factories run **after** binding to the current editor so the final instance list is resolved.

## `Module` lifecycle (order)

### `beforeEach`

Runs when **creating the editor**: first each imported module’s **`beforeEach`** in **`imports` order**, then **root `config.beforeEach`** if present. Use for **light prep before registration**.

### `setup`

**`await`**ed during **`render`**: each module’s **`setup`** in **`imports` order**, then **root `config.setup`**. May return a **teardown function** (or a **`Promise`** that resolves to one); **`destroy()`** runs these to release resources you attached in **`setup`**.

Multiple **`setup`** hooks are waited with **`Promise.all`**—**no guaranteed order among them** (only that all finish before later startup steps).

### `onAfterStartup`

After **initialization finishes and the main view is ready**: first **`imports` order**, then root **`onAfterStartup`**. Use when you need **DOM present or the edit loop running** (auto-focus, analytics, …).

### `onDestroy`

Inside **`textbus.destroy()`**: root config and plugins **`onDestroy`** first, then **`import` modules**, then **`setup` teardowns**, then **document view and kernel services** shut down. In **`onDestroy`**, **do not assume plugins still work**; release custom resources **outside-in**.

**Always call `destroy()` on page unload** to avoid leaking input handlers and subscriptions.

## `Plugin` and `Module.plugins`

**`Plugin`** only has **`setup(textbus)`** and optional **`onDestroy()`**—**no** **`components` / `providers`**, etc.

**When it runs:** **`Plugin.setup`** runs **after** the main **`Adapter`** has rendered—**after** all **`Module.setup`** hooks. Use for extensions that **only** need **ready DOM / mounted views** (toolbars, debug overlays). Division of labor: **`Module`** registers **model + platform wiring and shell**; **`Plugin`** attaches **UI or side effects after the view is ready**.

## `Registry` and name resolution

**`textbus.get(Registry)`** resolves literals by **`componentName`**, format name, and attribute name **into components or slots**. **Which registration wins** follows the **merge order** for **`components` / `formatters` / `attributes`** above: to **override** a built-in block or format, put **your class or instance** on the **`new Textbus` root config**, or place the **`Module` earlier in `imports`** (when **only** reordering **`imports`**).

## `providers` customization and overrides

**`providers`** matches **`Provider`** from **`@viewfly/core`** used by **`@textbus/core`** (**`provide` / `useClass` / `useFactory` / `useValue` / `deps`**, …). Used for:

- **`BrowserModule`** supplying **`Adapter`**, **`NativeSelectionBridge`**, …;
- Collaboration (or other modules) **replacing** tokens such as **`History`**;
- App code registering **`MessageBus`**, **`CustomUndoManagerConfig`**, … (see [Collaboration](./collaborate)).

When overriding, **`provide` must match the target token exactly**; when unsure, follow **types** or the **`provide` patterns** in topic docs like [Collaboration](./collaborate).

## Example: custom `Module` and `Plugin`

::: code-group

```ts [feature-module.ts]
import type { Module, Textbus } from '@textbus/core'

export const featureModule: Module = {
  setup(textbus: Textbus) {
    const sub = textbus.onReady.subscribe(() => {
      // Safe to touch DOM / Commander after ready
    })
    return () => sub.unsubscribe()
  },
}
```

```ts [plugin-toolbar.ts]
import type { Plugin, Textbus } from '@textbus/core'

export const toolbarPlugin: Plugin = {
  setup(textbus: Textbus) {
    // Main view mounted; safe for querySelector, external UI
    void textbus
  },
  onDestroy() {},
}
```

```ts [main.ts]
import { Textbus } from '@textbus/core'
import { featureModule } from './feature-module'
import { toolbarPlugin } from './plugin-toolbar'

const editor = new Textbus({
  imports: [featureModule],
  plugins: [toolbarPlugin],
})
```

In a real app you still merge **`BrowserModule`** (or supply **`Adapter`** + **`NativeSelectionBridge`** yourself)—see [Browser module](./platform-browser).

:::

## Troubleshooting

- **No `BrowserModule` (or equivalent `Adapter` + `NativeSelectionBridge`):** **`render`** fails with missing **`NativeSelectionBridge`** / **`Adapter`**.
- **Same-named component override ignored:** check **`components` merge order** (root vs **`imports`**), and that **`componentName`** matches serialized data.
- **`providers` override wrong:** check whether a **later `Module`** overrides the same **`provide`**; reorder **`imports`** or move the binding to the **last-loaded module**.
- **Forgot `destroy()`:** listeners and **`setup` teardowns** may not run → leaks or double-mount issues.

## What’s next

- Selection & commands: [Selection](./selection), [Query & operations](./operations-and-query)
- Browser integration: [Browser module](./platform-browser)
- Collaboration & **`providers`**: [Collaboration](./collaborate)
