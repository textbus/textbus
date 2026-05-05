---
title: Collaboration
description: CollaborateModule, Yjs, SyncConnector, AsyncSlot/AsyncComponent, SubModelLoader, MessageBus.
---

# Collaboration

Before this page, you should already have **Textbus** + **BrowserModule** + a [view adapter](./adapter-viewfly) working per [Getting started](./getting-started) (**Vue** / **React**: see those guides). Below we assume you have an **`editor`** instance you can **`render`**.

**`@textbus/collaborate`** binds Textbus’s document model to a [**Yjs**](https://github.com/yjs/yjs) **`Doc`**: via a **connector** you choose, document and collaboration state sync with other clients. With collaboration enabled, undo/redo still goes through **`editor.get(History)`** **`back()` / `forward()`**, …; differences from a single-editor setup are covered in [History](./history).

The collaboration **transport** (WebSocket server, auth, room listing, …) is **not** implemented in this package: you deploy a server that matches your connector’s protocol (e.g. Node for **`y-websocket`**, or **Hocuspocus**), while this package handles **editor-side** binding and lifecycle.

## Install

Besides **`@textbus/core`**, **`@textbus/platform-browser`**, and your adapter, install:

```bash
npm install @textbus/collaborate
```

**`@textbus/collaborate`** declares dependencies on **`yjs`**, **`y-websocket`**, **`@hocuspocus/provider`**, etc. If you implement **`SyncConnector`** yourself, keep it tied to the same **`Y.Doc`** instance.

## Single-document collaboration: `CollaborateModule`

Add **`CollaborateModule`** to **`new Textbus({ ... })`** **`imports`**, and return a **`SyncConnector`** from **`createConnector`**. The factory receives **`yDoc: Y.Doc`**—pass it through unchanged to the connector (**`YWebsocketConnector`**’s third argument, or **`document`** in **`HocuspocusConnector`** config) so collaboration shares one root document.

Pick **one** of the two patterns below; when **`Textbus`** is destroyed, **`CollaborateModule`** **`disconnect`**s / **`destroy`**s the connector—you do **not** need to call **`onDestroy()`** again from app code.

::: code-group

```ts [y-websocket]
import { Doc as YDoc } from 'yjs'
import { Textbus } from '@textbus/core'
import { BrowserModule } from '@textbus/platform-browser'
import { CollaborateModule, YWebsocketConnector } from '@textbus/collaborate'

const collab = new CollaborateModule({
  createConnector(yDoc: YDoc) {
    return new YWebsocketConnector('wss://your-y-websocket-server', 'unique-room-id', yDoc)
  },
})

const editor = new Textbus({
  imports: [browserModule, collab],
})
```

```ts [Hocuspocus]
import { Doc as YDoc } from 'yjs'
import { Textbus } from '@textbus/core'
import { BrowserModule } from '@textbus/platform-browser'
import { CollaborateModule, HocuspocusConnector } from '@textbus/collaborate'

const collab = new CollaborateModule({
  createConnector(yDoc: YDoc) {
    return new HocuspocusConnector({
      url: 'wss://your-hocuspocus-server',
      name: 'unique-room-id',
      document: yDoc,
      // token: () => fetch('/auth').then((r) => r.text()),
    })
  },
})

const editor = new Textbus({
  imports: [browserModule, collab],
})
```

:::

## `YWebsocketConnector` {#ywebsocketconnector}

Use when talking to a **y-websocket**-protocol server.

**Constructor:** **`new YWebsocketConnector(url, roomName, yDoc)`** — **`url`** and **`roomName`** must match your server; **`yDoc`** is the **`Y.Doc`** from **`createConnector`**.

**`SyncConnector` surface:** after the first sync with the remote completes, **`onLoad`** fires; on collaborative state changes, **`onStateChange`** fires; **`setLocalStateField`** updates local state broadcast to peers; destroying the editor **disconnects automatically** (no extra **`onDestroy()`** from your code).

## `HocuspocusConnector` {#hocuspocusconnector}

Use with [**`@hocuspocus/provider`**](https://www.npmjs.com/package/@hocuspocus/provider) (common with **Hocuspocus** or compatible servers).

**Constructor:** **`new HocuspocusConnector(config)`** where **`config`** is **`HocuspocusProviderConfiguration`**. **`document`** must be the **`yDoc`** from **`createConnector`**.

**`SyncConnector` surface:** **`onLoad`** after first remote sync; **`onStateChange`** on collaborative state changes; **`setLocalStateField`** for local broadcast fields; teardown **disconnects automatically** (no extra **`onDestroy()`**).

Fill other fields (**`token`**, **`parameters`**, …) per the official docs: [Configure Hocuspocus Provider](https://tiptap.dev/docs/hocuspocus/provider/configuration). Avoid blocking work or throwing inside sync/state callbacks you attach to **`config`**, or editor readiness and state fan-out may suffer.

## `SyncConnector` contract

Custom connectors extend **`SyncConnector`** and implement:

- **`onLoad`**: fires when the first remote sync completes (see **`onlyLoad`**).
- **`onStateChange`**: fires when **collaborative awareness** changes vs other clients.
- **`setLocalStateField(key, data)`**: writes local fields to broadcast.
- **`onDestroy()`**: tears down connections and subscriptions.

If you register [**`MessageBus`**](#message-bus) via **`providers`**, collaboration treats **`get`**’s return value as the **local collaborative payload** to sync out, and calls **`consume`** when other clients change; without registration, **only the document** syncs.

## `CollaborateConfig`: `onlyLoad`

**`onlyLoad`** is optional, default **`false`**.

- **`false` (default):** after the connector’s **`onLoad`**, the **`render`** flow continues.
- **`true`:** after **`onLoad`**, wait until the root collaborative document has editable content before proceeding (when you **must** have remote document first).

Turn it on only when the product needs it; when unsure, keep **`false`**.

## `AsyncSlot` {#async-slot}

**`AsyncSlot`** (**`@textbus/core`**) extends **`Slot`** for cases where **slot body and `state` first becoming ready** depends on external data (e.g. sub-document not arrived yet, shell UI first). Shared **`schema` / `state` / format & attributes** with **`Slot`** are in [Slot](./slot); here we only highlight **async** members.

- **`metadata`**: read-only, observable; holds **stable ids** for sub-documents or sub-rooms (ids, versions, …), often used as **`loadSubModelBySlot`** keys. **`metadata`** changes dirty the slot and participate in collaboration serialization (**`toJSON`** includes **`async: true`** and **`metadata`**).
- **`loader`**: **`AsyncModelLoader`** instance.
  - **`load()`**: call when loading child content **may** start; triggers **`onRequestLoad`**, then collaboration **`loadSubModelBySlot`** if **`getLoadedModelBySlot`** is **`null`**.
  - **`onRequestLoad` / `onLoaded`**: subscribe for UI (loading / done).
  - **`isLoaded`**: whether child content is **ready**; **`markAsLoaded()`** is called by the framework after **sub-document is bound to the slot**.

In multi-document collaboration, **`AsyncSlot`** pairs with **`SubModelLoader`** **`…BySlot`** methods; with root **`CollaborateModule`** only, **do not** use **`AsyncSlot`** inside the collaborative tree (unsupported async sub-model error).

```ts
import { AsyncSlot, ContentType } from '@textbus/core'

// schema, initial state, metadata (prefer stable sub-doc id for SubModelLoader)
const slot = new AsyncSlot([ContentType.Text], {}, { subDocId: 'doc-1' })

// Trigger when sub-document body should be fetched (e.g. user expands, first-screen policy)
slot.loader.load()

slot.loader.onRequestLoad.subscribe(() => {
  // loading requested: tie to “loading” UI
})

slot.loader.onLoaded.subscribe(() => {
  // sub-document bound and editable
})
```

## `AsyncComponent` {#async-component}

**`AsyncComponent`** (**`@textbus/core`**) is an **abstract** **`Component`** subclass for **`state`** first becoming ready from an external sub-document. Shared block model and **`toJSON`** are in [Component basics](./component-basics) and [Concepts](./concepts).

- **`metadata`**: observable; same idea as **`AsyncSlot.metadata`**, for **`loadSubModelByComponent`** and remote sub-docs.
- **`loader`**: **`AsyncModelLoader`**; **`load()`**, **`onRequestLoad` / `onLoaded` / `isLoaded`** match the slot side, paired with **`SubModelLoader`** **`…ByComponent`**.

When restoring **`AsyncComponent`** from a **literal with `metadata`**, use **`static fromJSONAndMetadata(textbus, state, metadata)`** so you get **both `state` and `metadata`**. If you only implement **`fromJSON(textbus, state)`**, **`metadata` is lost** and cannot align with async sub-docs or collaboration. Any async component that participates in **collaboration / deserialization** **must** provide **`fromJSONAndMetadata`** and pass **`state` + `metadata`** into the constructor; **do not** rely on **`fromJSON`** alone as the only restore path.

In multi-document collaboration, **`AsyncComponent`** pairs with **`SubModelLoader`** **`…ByComponent`**; with single-document **`CollaborateModule`**, **do not** use **`AsyncComponent`** as an async sub-model in the collaborative tree.

```ts
import type { Textbus } from '@textbus/core'
import {
  AsyncComponent,
  ComponentStateLiteral,
} from '@textbus/core'

/** Align with AsyncComponentLiteral.metadata */
interface MyBlockMeta {
  subDocId: string
}

interface MyBlockState {
  title: string
}

export class MyAsyncBlock extends AsyncComponent<MyBlockMeta, MyBlockState> {
  static componentName = 'MyAsyncBlock'

  /** Required: restore instance with metadata from JSON; do not rely on fromJSON alone */
  static fromJSONAndMetadata(
    _textbus: Textbus,
    data: ComponentStateLiteral<MyBlockState>,
    metadata: MyBlockMeta,
  ): MyAsyncBlock {
    return new MyAsyncBlock(data, metadata)
  }

  constructor(state: MyBlockState, metadata: MyBlockMeta) {
    super(state, metadata)
  }
}

// Like AsyncSlot: call loader.load() when appropriate
// myBlock.loader.load()
```

## Multiple documents & sub-models {#multiple-doc-submodel}

If the document uses [**`AsyncSlot`**](#async-slot) or [**`AsyncComponent`**](#async-component) and each async block needs its **own child `Y.Doc`**, use **`MultipleDocumentCollaborateModule`** with **`subModelLoader`** configured. **`CollaborateModule`** alone does **not** support these async sub-models.

**`MultipleDocumentCollaborateModule`** extends **`CollaborateConfig`** with **`subModelLoader: SubModelLoader`** (**`createConnector`** stays the same as single-document).

### `SubModelLoader`: when called, what to return

Subclass **`SubModelLoader`** and implement **create / get loaded / load on demand** for **slots** and **components** (paired with [**`AsyncSlot`**](#async-slot) and [**`AsyncComponent`**](#async-component)); types and parameters are in **`@textbus/collaborate`** **`d.ts`**.

| Method | When it runs | Return value |
|--------|----------------|--------------|
| **`createSubModelBySlot`** | A new **`AsyncSlot`** appears locally and joins collaboration | **`Promise<Y.Doc>`** resolving to a **new** sub-document for that slot. |
| **`createSubModelByComponent`** | A new **`AsyncComponent`** appears locally and joins collaboration | **`Promise<Y.Doc>`** resolving to a **new** sub-document for that component. |
| **`getLoadedModelBySlot`** | Collaborative data has restored an **`AsyncSlot`** locally, before async **`load*`** tries | If that slot’s sub-doc **is already** under your loader, return its **`Y.Doc`**; else **`null`**. |
| **`getLoadedModelByComponent`** | Same for **`AsyncComponent`** | **`Y.Doc` \| `null`**, same semantics as slot. |
| **`loadSubModelBySlot`** | **`AsyncSlot`** exists, **`getLoadedModelBySlot`** is **`null`**, and **`AsyncModelLoader.load()`** has fired | **`Promise<Y.Doc>`** resolving to the sub-doc aligned with remote (often keyed by **`metadata` / business id**). |
| **`loadSubModelByComponent`** | Same for **`AsyncComponent`** | **`Promise<Y.Doc>`**, same semantics as slot. |

**`create*`** / **`load*`** **`Y.Doc`** instances must satisfy the **public contract** for **`AsyncSlot` / `AsyncComponent`** collaboration (package types and runtime checks); read **`SubModelLoader`** comments and **`d.ts`** before implementing.

Skeleton (fill bodies in your app; types and comments only here):

```ts
// @ts-nocheck
import type { Doc as YDoc } from 'yjs'
import type { AsyncComponent, AsyncSlot } from '@textbus/core'
import { SubModelLoader } from '@textbus/collaborate'

export class MySubModelLoader extends SubModelLoader {
  getLoadedModelBySlot(_slot: AsyncSlot): YDoc | null {
    // After AsyncSlot is restored and its child Y.Doc is already managed here; else null (may then call loadSubModelBySlot)
  }

  getLoadedModelByComponent(_component: AsyncComponent): YDoc | null {
    // Same for AsyncComponent
  }

  async createSubModelBySlot(_slot: AsyncSlot): Promise<YDoc> {
    // New AsyncSlot joining collaboration; resolve to new child Y.Doc for that slot per collaboration contract
  }

  async createSubModelByComponent(_component: AsyncComponent): Promise<YDoc> {
    // New AsyncComponent joining collaboration; resolve to new child Y.Doc
  }

  async loadSubModelBySlot(_slot: AsyncSlot): Promise<YDoc> {
    // getLoadedModelBySlot was null and AsyncModelLoader.load() fired; resolve to remote-aligned Y.Doc (often fetch by metadata / id)
  }

  async loadSubModelByComponent(_component: AsyncComponent): Promise<YDoc> {
    // Same for AsyncComponent
  }
}
```

## `MessageBus` and cross-client data {#message-bus}

**`MessageBus<T>`** (**`@textbus/collaborate`**) syncs a **structured payload `T`** **outside** the document (display name, avatar color, role tag, …) so **every client** sees **consistent peer data**. With **`CollaborateModule`** or **`MultipleDocumentCollaborateModule`** and **`MessageBus`** registered:

- **`get(textbus)`**: collaboration calls this when **broadcasting local state**; the return value is the current **`T`** to send.
- **`consume(messages, textbus)`**: called when **awareness** updates; **`messages`** is **`Message<T>[]`**, each with **`clientId`** (connection) and **`message`** (that client’s current **`T`**).
- **`onSync`**: subscribe; fires when **`sync()`** runs, and collaboration **immediately** pushes **`get`** again.
- **`sync()`**: call when **you just changed** broadcast data (e.g. nickname) and want an **immediate** push; **selection changes** also **refresh** the outbound payload automatically—you rarely need **`sync()`** on every selection move.

Without **`MessageBus`**, **only the document** syncs. For **other users’ selections / carets**, shape **`T`** with **selection summaries**, etc., and align with **collaboration UI** from **`@textbus/platform-browser`** ([Browser module](./platform-browser)).

### Example: syncing collaboration user info

Below, **`UserPresence`** is **`T`**: **`get`** returns the local user’s display info; **`consume`** merges into **`clientId → UserPresence`** for avatar lists, color bars, etc. In production, replace **`peers`** with **`BehaviorSubject` / store** or data for **`CollaborateCursor`**.

```ts
import { Injectable } from '@viewfly/core'
import { Textbus } from '@textbus/core'
import { Message, MessageBus } from '@textbus/collaborate'

export interface UserPresence {
  userId: string
  displayName: string
  /** Avatar ring, collaboration caret, etc. */
  color: string
}

@Injectable()
export class PresenceMessageBus extends MessageBus<UserPresence> {
  /** Local user’s display info for this room (from auth, settings, …) */
  private local: UserPresence = {
    userId: 'u-001',
    displayName: 'Guest',
    color: '#6366f1',
  }

  /** Latest display info per clientId (example: in-memory Map) */
  readonly peers = new Map<number, UserPresence>()

  get(_textbus: Textbus): UserPresence {
    return { ...this.local }
  }

  consume(messages: Message<UserPresence>[], _textbus: Textbus): void {
    this.peers.clear()
    for (const { clientId, message } of messages) {
      if (message) {
        this.peers.set(clientId, message)
      }
    }
    // e.g. next() an Rx stream or setState to redraw “online members”
  }

  /** After rename / theme color change: update local then push */
  setLocalPresence(patch: Partial<UserPresence>): void {
    Object.assign(this.local, patch)
    this.sync()
  }
}
```

Register next to other **`Provider`**s in **`new Textbus({ ... })`** (**`provide: MessageBus`**, **`useClass`** your implementation):

```ts
import { MessageBus } from '@textbus/collaborate'
import { PresenceMessageBus } from './presence-message-bus'

const editor = new Textbus({
  providers: [{ provide: MessageBus, useClass: PresenceMessageBus }],
  imports: [browserModule, collaborateModule],
})
```

**`clientId`** in **`consume`** **distinguishes online clients**; can align with **`CollaborateCursor`** as the same user key.

## Optional: `CustomUndoManagerConfig`

Register a **`CustomUndoManagerConfig`** implementation under **`providers`** to **control which collaborative transactions enter the undo stack** (see optional methods on that abstract class in **`@textbus/collaborate`**).

## Accessing `Collaborate` in code

After **`render`**, use **`editor.get(Collaborate)`** (type exported from **`@textbus/collaborate`**) for **`yDoc`**, **`onAddSubModel`** subscriptions, and other **public APIs** tied to collaboration and sub-document lifecycle.

## FAQ

- **Peers don’t see each other’s edits:** check WebSocket URL, **`roomName`**, server **`Y.Doc`** protocol; firewall and **WSS** certs.
- **`onlyLoad: true` never finishes:** if remote never writes root **`state`**, wait never ends; verify server seed doc or first write.
- **Async sub-slot error with single-doc collaboration:** switch to **`MultipleDocumentCollaborateModule`** and implement **`SubModelLoader`** ([Multiple documents & sub-models](#multiple-doc-submodel)).
- **Remote has async block but local never loads:** ensure **`loader.load()`** is called at the right time ([**`AsyncSlot`**](#async-slot) / [**`AsyncComponent`**](#async-component)), and **`loadSubModel*`** resolves the correct child **`Y.Doc`** from **`metadata` / business id**.

## See also

- Undo/redo: [History](./history)
- Module & **`providers`** merge order: [Modules & extensions](./editor-and-modules)
