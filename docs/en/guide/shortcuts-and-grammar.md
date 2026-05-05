---
title: Shortcuts & grammar
description: Keyboard global and dynamic shortcuts, Zen Coding, zenCoding config, execShortcut.
---

# Shortcuts & grammar

**Shortcuts** are handled by **`Keyboard`**: **`addShortcut`** registers global shortcuts; in component **`setup`**, **`useDynamicShortcut`** attaches shortcuts to the **current block instance**. **Zen Coding** turns a short typed prefix plus a terminating key into a structural change (e.g. paragraph → todo). Wiring uses **`TextbusConfig.zenCoding`** as the master switch, **`static zenCoding`** on component classes (Todolist below), and optional **`addZenCodingInterceptor`**. Parent **`schema`** and multi-slot rules: [Advanced components](./component-advanced).

Finish [Getting started](./getting-started) and know **`Commander`** / **`Selection`** ([Query & operations](./operations-and-query), [Selection](./selection)). **`editor`** means a **`render`**-ready **`Textbus`** instance.

## Getting `Keyboard`

```ts
import { Keyboard } from '@textbus/core'

const keyboard = editor.get(Keyboard)
```

## `Shortcut` and `Keymap`

**`Shortcut`** (exported from **`@textbus/core`**) has **`keymap`** and **`action`**:

- **`keymap`**: **`Keymap`**
  - **`key`**: **`string`**, **`string[]`**, or **`Key`** (**`match`**, **`name`** for richer matching).
  - **`modKey`**, **`shiftKey`**, **`altKey`**: optional; omitted means **`false`**. **`modKey`** is usually **Ctrl** (Windows/Linux) or **Command** (macOS)—see [Browser module](./platform-browser).
- **`action`**: **`(key: string) => boolean | void`**. Return **`false`** to leave the event available for other shortcuts.

Interfaces below mirror **`@textbus/core`** (abbreviated):

```ts
interface RawKeyAgent {
  key: string
  code: string
  keyCode: number
}

interface Key {
  match: RegExp | ((key: string, agent: RawKeyAgent) => boolean)
  name: string | string[]
}

interface Keymap {
  modKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  key: string | string[] | Key
}

interface Shortcut {
  keymap: Keymap
  action(key: string): boolean | void
}
```

## `keyboard.addShortcut(shortcut)`

Registers a **global** shortcut (relative to shortcuts on the common-ancestor component of the selection; **later** registrations take precedence).

**Returns**: **`{ remove: () => void }`** to unregister.

```ts
const off = keyboard.addShortcut({
  keymap: {
    key: 'd',
    modKey: true,
  },
  action() {
    // Commander / Selection / …
  },
})

off.remove()
```

## In-component shortcuts: `useDynamicShortcut`

Only in component **`setup`**: pushes **`Shortcut`** instances onto **this component instance**’s **`shortcutList`**. When the selection is valid and the common-ancestor block **is** this component, these run **before** **`addShortcut`** globals; within the list, **later** registrations match **first** (reverse iteration order).

```ts
import { useDynamicShortcut } from '@textbus/core'

override setup() {
  useDynamicShortcut({
    keymap: { key: 'Enter', shiftKey: true },
    action(key) {
      void key
      // ...
    },
  })
}
```

## Default shortcuts (reference)

Unless overridden, **`Textbus`** registers defaults for **`Keyboard`** (**`modKey`** as above):

| Keys | Behavior |
| --- | --- |
| **Mod+S** | Fires **`editor`** save notification (**`onSave`**) |
| **Enter** | **`commander.break()`** (semantics from current block) |
| **Delete** / **Backspace** | **`commander.delete(...)`** |
| **Arrow keys** | Move caret (**`selection.toPrevious`** / **`toNext`** / **`toPreviousLine`** / **`toNextLine`**) |
| **Shift + arrows** | Extend selection (**`selection.wrapTo*`** family) |
| **Tab** | Inserts four spaces **`'    '`** |
| **Mod+A** | Select all |
| **Mod+C** | Copy |
| **Mod+X** | Cut |
| **Mod+Z** | Undo (**`History`**—[History](./history)) |
| **Mod+Shift+Z** / **Mod+Y** | Redo |

Use **`addShortcut`** for custom behavior, or return **`false`** from **`action`** to decline handling.

## Zen Coding master switch: `TextbusConfig.zenCoding`

**Type**: `boolean | undefined`

**Meaning**: when **`true`**, Zen Coding interceptors run during typing (**`static zenCoding`** on components and **`addZenCodingInterceptor`**). When **`false`**, those rules are inactive.

```ts
const editor = new Textbus({
  zenCoding: true,
  // ...
})
```

## Static `zenCoding` on component classes

Declare **`static zenCoding`** on the **class**: one **`ZenCodingGrammarInterceptor<ComponentState>`** or an **array** (exported from **`@textbus/core`**). With **`zenCoding: true`**, **`Keyboard`** reads these from classes passed to **`new Textbus({ components: [...] })`** at startup.

Three fields describe one rule: **`key`** checks this keystroke; **`match`** inspects existing slot text **before** that key is applied; both pass → **`createState`** builds **`state`** and **`new CurrentComponent`** replaces the block. **`RawKeyAgent`** describes the key event (**`key`**, **`code`**, …).

### `match`

Runs **before** the trigger key is committed—does slot text match your prefix (or custom logic)? Use **`RegExp`** over the full slot text, or **`(content: string, textbus: Textbus) => boolean`** (access **`Registry`**, etc.). **`content`** matches **`createState`**’s first argument.

### `key`

Which key completes the rule: **`string`**, **`string[]`** (any match), **`RegExp`**, or **`(key: string, agent: RawKeyAgent) => boolean`**.

### `createState`

**`(content: string, textbus: Textbus) => ComponentState`**: initial **`state`** for **`new ThisComponent(...)`**. **`content`** is text **before** the trigger key; **`textbus`** for **`Registry`**, **`Slot`**, ….

Multiple rules → **`static zenCoding`** as an **array**—same shape as the Todolist sandbox below.

### Example: **`TodolistComponent`** (same shape as [Component basics](./component-basics))

**`Todolist`** is **`ContentType.BlockComponent`**; **`state`** has **`checked`** and body **`Slot`** (**`schema`** **`ContentType.Text`**). With **`static zenCoding`**, typing **`-`** in a **plain paragraph** then **Space** turns the **whole paragraph** into an **empty todo** (unchecked, empty body; caret moves into the todo body).

**Class config (excerpt)**—full file in sandbox **`todolist.component.tsx`**:

```ts
export class TodolistComponent extends Component<TodolistState> {
  static componentName = 'Todolist'
  static type = ContentType.BlockComponent

  static zenCoding = {
    match: /^-$/,
    key: ' ',
    createState(_content: string, _textbus: Textbus): TodolistState {
      const slot = new Slot([ContentType.Text])
      return { checked: false, slot }
    },
  }

  // … fromJSON, getSlots, setup same as component basics
}
```

**Why `/^-$/` and Space for `match` + `key`**

Flow: **first** check whether this key is **`key`** (Space), **then** read slot text—the **Space has not been inserted yet**. So on Space the slot still contains **`"-"`** only → **`/^-$/`** fits.

```ts
// Matches timing: match sees "-"
static zenCoding = { match: /^-$/, key: ' ', /* … */ }

// Avoid: /^-\s$/ assumes "-" and space are both in text—wrong order vs “key first, then match”
```

**`createState`** seeds **`new TodolistComponent(...)`**

Returns an empty todo. To keep prefix text in the body, parse **`content`** and **`slot.insert(...)`**.

```ts
createState(content: string, _textbus: Textbus): TodolistState {
  const slot = new Slot([ContentType.Text])
  // e.g. characters after the dash → body
  // if (content.length > 1) slot.insert(content.slice(1))
  return { checked: false, slot }
}
```

**Paragraph text slot vs block todo**

Inner paragraph layer is **text**; **`Todolist`** is a **block** and cannot live inside that text slot. The kernel **selects the whole paragraph → removes it → inserts the todo** in the **parent block slot** (here the root **`BlockComponent`** slot), then moves the caret into the todo **`Slot`**. Complex multi-slot parents may need extra rules—[Advanced components](./component-advanced).

**Master switch**: **`new Textbus`** must pass **`zenCoding: true`** or **`static zenCoding`** never runs:

```ts
const editor = new Textbus({
  zenCoding: true,
  components: [RootComponent, ParagraphComponent, TodolistComponent],
  imports: [browserModule],
})
```

The sandbox below wires both; initial doc is **one empty paragraph**. Steps: **focus body → type `-` → Space** → empty todo; undo/redo with [History](./history).

<TextbusPlayground preset="zen-coding-todolist" />

Open **`todolist.component.tsx`** (**`static zenCoding`**) and **`App.tsx`** (**`zenCoding: true`**); **`ParagraphComponent`** / **`RootComponent`** match [Component basics](./component-basics).

Richer **`schema`** and multi-slot parents: [Advanced components](./component-advanced).

## `keyboard.addZenCodingInterceptor(interceptor)`

Runtime Zen rule **without** putting it on a class. **`interceptor`** is **`ZenCodingInterceptor`**: **`match(content)`**, **`try(key, agent)`**, **`action(content)`** returns **`boolean`** (handled or not).

**Returns**: **`{ remove: () => void }`**.

```ts
import type { Keyboard, ZenCodingInterceptor } from '@textbus/core'

declare const keyboard: Keyboard

const off = keyboard.addZenCodingInterceptor({
  match(content) {
    return content.length > 0
  },
  try(key) {
    return key === ' '
  },
  action(_content) {
    return true
  },
})

off.remove()
```

## `keyboard.execShortcut(keymapState)`

Runs Zen Coding (when enabled) and registered shortcuts from **`keymapState`**.

**`KeymapState`**:

- **`key`**: key name (**`Enter`**, **`d`**, …)—same convention as **`keymap.key`**.
- **`modKey`**: primary modifier pressed—often **`ev.ctrlKey`** vs **`ev.metaKey`** per product.
- **`altKey`**, **`shiftKey`**: align with **`Shortcut.keymap`** optional flags (unset → **`false`**).
- **`agent`**: **`RawKeyAgent`** (**`key`**, **`code`**, **`keyCode`**) for regex/function **`key`** matching—usually mirror **`KeyboardEvent`**.

**Returns**: **`true`** if something handled the input; **`false`** otherwise.

```ts
import { Keyboard } from '@textbus/core'

const keyboard = editor.get(Keyboard)

// ev: keydown KeyboardEvent
keyboard.execShortcut({
  key: ev.key,
  modKey: ev.ctrlKey,
  altKey: ev.altKey,
  shiftKey: ev.shiftKey,
  agent: {
    key: ev.key,
    code: ev.code,
    keyCode: ev.keyCode,
  },
})
```

## FAQ

- **`action` never runs**: ensure there is a valid selection; dynamic shortcuts need the common ancestor to be that component.
- **Zen never fires**: **`zenCoding: true`**; **`match`** uses text **before** the trigger key—compare Todolist sandbox. Parent **`schema`** / slots: [Advanced components](./component-advanced).

## What's next

- **Static `zenCoding` & block structure**: [Advanced components](./component-advanced)  
- **Hooks & input**: [Component events & lifecycle](./component-events-and-lifecycle)  
- **Undo / redo**: [History](./history)  
- **Browser input & bridge**: [Browser module](./platform-browser)  
- **Modules & merge**: [Modules & extensions](./editor-and-modules)
