---
title: History
description: Undo/redo with History, stack size, readonly, events, and default shortcuts.
---

# History

**`History`** provides **undo** (**`back()`**) and **redo** (**`forward()`**), plus stack state and events. Use **`editor.get(History)`** for the current instance.

Finish [Getting started](./getting-started) first. Below, **`editor`** is a **`Textbus`** instance that has already **`render`**ed.

## Getting `History`

```ts
import { History } from '@textbus/core'

const history = editor.get(History)
```

## `TextbusConfig`: history-related options

Set these on **`new Textbus({ ... })`** or on **`Module`**s merged with **`imports`** (merge order: [Modules & extensions](./editor-and-modules)).

### `historyStackSize`

**Type**: `number | undefined`  

**Meaning**: max number of undo steps; default **`500`** if omitted. Oldest steps fall off the stack and can no longer be undone.

```ts
const editor = new Textbus({
  historyStackSize: 200,
  // ...
})
```

After you undo and then make **new** edits, the **redo** list is cleared (only the current branch remains).

### `readonly`

**Type**: `boolean | undefined`  

**Meaning**: whether the editor starts read-only. The same flag is available at runtime as **`editor.readonly`**.

```ts
const editor = new Textbus({
  readonly: true,
  // ...
})

editor.readonly = false
```

## `History`: methods and properties

Assume **`const history = editor.get(History)`**.

### `listen(): void`

Start history recording. The editor calls this **once** after **`render`** completes; **do not** call **`listen()`** from app code.

### `back(): void`

Undo one step. No-op if **`canBack === false`**.

```ts
history.back()
```

### `forward(): void`

Redo one step. No-op if **`canForward === false`**.

```ts
history.forward()
```

### `clear(): void`

Clear undo and redo stacks; afterwards **`canBack` / `canForward`** are **`false`** until new undoable edits happen.

```ts
history.clear()
```

### `destroy(): void`

Tear down this **`History`**. Called when **`editor`** is destroyed; you rarely call it yourself.

```ts
history.destroy()
```

### `canBack` (read-only)

**Type**: `boolean`  

**Meaning**: whether **`back()`** is allowed.

```ts
undoBtn.disabled = !history.canBack
```

### `canForward` (read-only)

**Type**: `boolean`  

**Meaning**: whether **`forward()`** is allowed.

```ts
redoBtn.disabled = !history.canForward
```

### `onChange`

**Type**: `Observable<void>`  

**Meaning**: fires when undo/redo stacks or **`canBack` / `canForward`** change (e.g. **`clear()`**, new step pushed, **`back()` / `forward()`** run).

```ts
history.onChange.subscribe(() => {
  undoBtn.disabled = !history.canBack
  redoBtn.disabled = !history.canForward
})
```

### `onPush`

**Type**: `Observable<void>`  

**Meaning**: a new undo step was pushed to the stack.

```ts
history.onPush.subscribe(() => {})
```

### `onBack`

**Type**: `Observable<void>`  

**Meaning**: a **`back()`** completed successfully.

```ts
history.onBack.subscribe(() => {})
```

### `onForward`

**Type**: `Observable<void>`  

**Meaning**: a **`forward()`** completed successfully.

```ts
history.onForward.subscribe(() => {})
```

## Default shortcuts

With the default shortcut registration:

- **Undo**: **Mod+Z**
- **Redo**: **Mod+Shift+Z** or **Mod+Y**

Same as **`history.back()`** / **`history.forward()`**. Customization: [Shortcuts & grammar](./shortcuts-and-grammar).

## Read-only and undo

When **`readonly === true`**, users usually cannot make new edits; **`history.back()` / `forward()`** do **not** check **`readonly`**. To block undo/redo in a read-only UI, disable the buttons or avoid calling these methods.

## FAQ

- **Redo disabled**: after undo, new edits replace the old redo branch.
- **Clear history after loading a new document**: call **`history.clear()`**.

## What's next

- **Shortcuts**: [Shortcuts & grammar](./shortcuts-and-grammar)  
- **Writes & selection**: [Query & operations](./operations-and-query), [Selection](./selection)  
- **Collaboration**: [Collaboration](./collaborate)
