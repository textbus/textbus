# 协作编辑

在阅读本篇前，请已按 [快速开始](./getting-started) 跑通 **`Textbus`** + **`BrowserModule`** + 某一 [**视图适配器**](./adapter-viewfly)（**Vue** / **React** 见对应指南）。下文假定你已有可 **`render`** 的编辑器实例。

**`@textbus/collaborate`** 把 Textbus 的文档模型与 [**Yjs**](https://github.com/yjs/yjs) 的 **`Doc`** 绑定：经你选择的 **连接器** 与其它客户端同步文档与协同状态。启用协作后，撤销与重做仍通过 **`editor.get(History)`** 的 **`back()` / `forward()`** 等使用，行为与单编辑器场景的差异见 [历史记录](./history)。

协同 **传输层**（WebSocket 服务、鉴权、房间列表等）不在本包内实现：你需要部署与所选连接器协议一致的服务（例如 **`y-websocket`** 配套的 Node 服务、或 **Hocuspocus** 服务端），本包负责 **编辑器侧** 的绑定与生命周期。


## 安装依赖

除 **`@textbus/core`**、**`@textbus/platform-browser`** 与适配器外，安装协作包：

```bash
npm install @textbus/collaborate
```

**`@textbus/collaborate`** 已声明对 **`yjs`**、**`y-websocket`**、**`@hocuspocus/provider`** 等依赖；若你自行实现 **`SyncConnector`**，只需保证与同一 **`Y.Doc`** 实例协同即可。


## 单文档协作：挂载 `CollaborateModule`

在 **`new Textbus({ ... })`** 的 **`imports`** 中加入 **`CollaborateModule`**，并通过 **`createConnector`** 返回一个 **`SyncConnector`**。工厂函数会收到 **`yDoc: Y.Doc`**，须原样交给连接器（**`YWebsocketConnector`** 的第三个参数，或 **`HocuspocusConnector`** 配置里的 **`document`**），保证协同使用同一份根文档。

下面两种接法二选一即可；销毁 **`Textbus`** 时 **`CollaborateModule`** 会 **`disconnect` / `destroy`** 连接器，业务侧不必再调 **`onDestroy()`**。

::: code-group

```ts [y-websocket]
import { Doc as YDoc } from 'yjs'
import { Textbus } from '@textbus/core'
import { BrowserModule } from '@textbus/platform-browser'
import { CollaborateModule, YWebsocketConnector } from '@textbus/collaborate'

const collab = new CollaborateModule({
  createConnector(yDoc: YDoc) {
    return new YWebsocketConnector('wss://你的 y-websocket 服务', 'room-唯一标识', yDoc)
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
      url: 'wss://你的 Hocuspocus 服务',
      name: 'room-唯一标识',
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

对接 **y-websocket** 协议的服务端时使用。

**构造**：**`new YWebsocketConnector(url, roomName, yDoc)`** — **`url`**、**`roomName`** 须与你的服务配置一致；**`yDoc`** 为 **`createConnector`** 传入的 **`Y.Doc`**。

**`SyncConnector` 对外行为**：首次与远端同步完成后触发 **`onLoad`**；协同状态变化时触发 **`onStateChange`**；**`setLocalStateField`** 用于更新本端要向其它端广播的状态；销毁编辑器时会 **自动断开连接**（无需在业务里再调 **`onDestroy()`**）。


## `HocuspocusConnector` {#hocuspocusconnector}

对接 [**`@hocuspocus/provider`**](https://www.npmjs.com/package/@hocuspocus/provider) 时使用（常见于 **Hocuspocus** 或兼容协议的服务端）。

**构造**：**`new HocuspocusConnector(config)`**，**`config`** 类型为 **`HocuspocusProviderConfiguration`**。其中 **`document`** 必须为 **`createConnector`** 收到的 **`yDoc`**。

**`SyncConnector` 对外行为**：与远端首次同步完成后触发 **`onLoad`**；协同状态变化时触发 **`onStateChange`**；**`setLocalStateField`** 用于写入本端要广播的状态；销毁编辑器时会 **自动断开连接**（业务侧不必再调 **`onDestroy()`**）。

其余字段（**`token`**、**`parameters`** 等）按官方文档填写：[Configure Hocuspocus Provider](https://tiptap.dev/docs/hocuspocus/provider/configuration)。若在 **`config`** 中传入 **同步 / 状态更新** 相关的回调，请避免长时间阻塞或抛错，以免影响编辑器就绪与状态分发。


## `SyncConnector` 约定

自定义连接器须继承 **`SyncConnector`**，并实现：

- **`onLoad`**：首次与远端同步完成时发出（见 **`onlyLoad`**）。
- **`onStateChange`**：与其它客户端的 **协同状态** 变化时发出。
- **`setLocalStateField(key, data)`**：写入本端要广播的状态字段。
- **`onDestroy()`**：释放连接与订阅。

若通过 **`providers`** 注册了 [**`MessageBus`**](#message-bus)，协作会把 **`get`** 的返回值 **作为本端协同载荷对外同步**，并在其它端变化时调用 **`consume`**；未注册则 **只同步文档**。


## `CollaborateConfig`：`onlyLoad`

**`onlyLoad`** 为可选布尔值，默认 **`false`**。

- **`false`（默认）**：连接器 **`onLoad`** 触发后，**`render`** 流程继续。
- **`true`**：在 **`onLoad`** 之后仍等待根协同文档具备可编辑内容再继续（适合强依赖「远端先有文档」再展示的场景）。

是否开启以产品需求为准；不确定时保持 **`false`**。


## `AsyncSlot` {#async-slot}

**`AsyncSlot`**（**`@textbus/core`**）继承普通 **`Slot`**，用于 **插槽正文与 `state` 的初次就绪** 依赖外部数据（例如子文档尚未到达、需先展示壳层）的场景。与 **`Slot`** 共有的 **`schema` / `state` / 格式与属性`** 等用法见 [插槽](./slot)；本节只强调 **异步** 相关的公开成员。

- **`metadata`**：只读、可观察；用于放 **子文档或子房间的稳定标识**（如 id、版本号），协同里常作为 **`loadSubModelBySlot`** 的定位依据。`metadata` 变更会标记插槽脏区，参与协同序列化（**`toJSON`** 中带 **`async: true`** 与 **`metadata`**）。
- **`loader`**：**`AsyncModelLoader`** 实例。
  - **`load()`**：由业务在合适时机调用，表示「可以开始加载子内容」；会触发 **`onRequestLoad`**，进而走到协作侧的 **`loadSubModelBySlot`**（若 **`getLoadedModelBySlot`** 为 **`null`**）。
  - **`onRequestLoad` / `onLoaded`**：可订阅；用于 UI 状态（加载中 / 已完成）。
  - **`isLoaded`**：子内容是否 **已就绪**；**`markAsLoaded()`** 由框架在 **子文档与插槽绑定完成** 后调用。

多文档协同下，**`AsyncSlot`** 与 **`SubModelLoader`** 的 **`…BySlot`** 方法一一对应；根文档仍用 **`CollaborateModule`** 时 **不要**在协同树里使用 **`AsyncSlot`**（会触发不支持异步子模型的错误）。

```ts
import { AsyncSlot, ContentType } from '@textbus/core'

// schema、初始 state、metadata（建议含稳定子文档 id，供 SubModelLoader 使用）
const slot = new AsyncSlot([ContentType.Text], {}, { subDocId: 'doc-1' })

// 需要拉取子文档正文时再触发（例如用户展开、或首屏策略）
slot.loader.load()

slot.loader.onRequestLoad.subscribe(() => {
  // 已进入加载请求：可与 UI「加载中」联动
})

slot.loader.onLoaded.subscribe(() => {
  // 子文档已绑定并可编辑
})
```


## `AsyncComponent` {#async-component}

**`AsyncComponent`**（**`@textbus/core`**）是 **抽象类**，继承 **`Component`**，用于 **组件 `state` 的初次就绪** 依赖外部子文档的场景。与 **`Component`** 共有的块模型、**`toJSON`** 等见 [组件基础](./component-basics) 与 [核心概念](./concepts)。

- **`metadata`**：可观察；语义与 **`AsyncSlot.metadata`** 类似，供 **`loadSubModelByComponent`** 等解析远端子文档。
- **`loader`**：同为 **`AsyncModelLoader`**；**`load()`**、**`onRequestLoad` / `onLoaded` / `isLoaded`** 行为与插槽侧一致，对应 **`SubModelLoader`** 的 **`…ByComponent`** 路径。

从 **带 `metadata` 的字面量** 恢复 **`AsyncComponent`** 时，应使用 **`static fromJSONAndMetadata(textbus, state, metadata)`**，以便 **同时拿到 `state` 与 `metadata`**。若 **只**实现 **`fromJSON(textbus, state)`**，**`metadata` 会丢失**，无法与异步子文档、协同侧约定对齐。因此凡参与 **协同 / 反序列化** 的异步组件，**必须**提供 **`fromJSONAndMetadata`**，并把 **`state` + `metadata`** 一并传入构造函数；**不要**再依赖仅含 **`state`** 的 **`fromJSON`** 作为唯一恢复入口。

多文档协同下，**`AsyncComponent`** 与 **`SubModelLoader`** 的 **`…ByComponent`** 方法对应；单文档 **`CollaborateModule`** 下 **不要**在协同树里使用 **`AsyncComponent`** 作为异步子模型。

```ts
import type { Textbus } from '@textbus/core'
import {
  AsyncComponent,
  ComponentStateLiteral,
} from '@textbus/core'

/** 与 AsyncComponentLiteral.metadata 对齐 */
interface MyBlockMeta {
  subDocId: string
}

interface MyBlockState {
  title: string
}

export class MyAsyncBlock extends AsyncComponent<MyBlockMeta, MyBlockState> {
  static componentName = 'MyAsyncBlock'

  /** 必须提供：用于从 JSON 恢复带 metadata 的实例，勿仅用 fromJSON */
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

// 与 AsyncSlot 类似：在合适时机请求加载子文档
// myBlock.loader.load()
```


## 多文档与子模型 {#multiple-doc-submodel}

若文档里使用 [**`AsyncSlot`**](#async-slot) 或 [**`AsyncComponent`**](#async-component)，且需要为 **每个异步块** 提供 **单独的子 `Y.Doc`** 参与协同，应使用 **`MultipleDocumentCollaborateModule`**，并在配置里传入 **`subModelLoader`**。仅使用 **`CollaborateModule`** 时，不支持上述异步子模型。

**`MultipleDocumentCollaborateModule`** 的配置在 **`CollaborateConfig`** 上增加 **`subModelLoader: SubModelLoader`**（**`createConnector`** 写法与单文档相同）。


### `SubModelLoader`：何时调用、返回什么

实现抽象类 **`SubModelLoader`**，为 **插槽** 与 **组件** 各提供 **创建 / 查询已加载 / 按需加载** 三组接口（与 [**`AsyncSlot`**](#async-slot)、[**`AsyncComponent`**](#async-component) 配套）；类型与参数见 **`@textbus/collaborate`** 包内 **`d.ts`**。

| 方法 | 何时会调用 | 返回值 |
|------|------------|--------|
| **`createSubModelBySlot`** | 本地出现新的 **`AsyncSlot`** 并参与协同时 | **`Promise<Y.Doc>`**，解析为该插槽对应的 **新建** 子文档。 |
| **`createSubModelByComponent`** | 本地出现新的 **`AsyncComponent`** 并参与协同时 | **`Promise<Y.Doc>`**，解析为该组件对应的 **新建** 子文档。 |
| **`getLoadedModelBySlot`** | 协同数据已在本地还原出 **`AsyncSlot`** 时，在尝试异步 **`load*`** 之前 | 若该插槽对应的子文档 **已在你的加载器管理范围内**，返回其 **`Y.Doc`**；否则 **`null`**。 |
| **`getLoadedModelByComponent`** | 同上，对象为 **`AsyncComponent`** | **`Y.Doc` \| `null`**，语义与插槽一致。 |
| **`loadSubModelBySlot`** | 本地已有 **`AsyncSlot`**，但 **`getLoadedModelBySlot`** 为 **`null`**，且 **`AsyncModelLoader.load()`** 已触发加载请求之后 | **`Promise<Y.Doc>`**，解析为与远端一致的子文档（通常由 **`metadata` / 业务 id** 等定位）。 |
| **`loadSubModelByComponent`** | 同上，对象为 **`AsyncComponent`** | **`Promise<Y.Doc>`**，语义与插槽一致。 |

**`create*`**、**`load*`** 所返回的 **`Y.Doc`** 须满足与 **`AsyncSlot` / `AsyncComponent`** 协同的 **公开约定**（与包内类型及运行时校验一致）；实现前请对照 **`SubModelLoader`** 注释与 **`d.ts`**。

骨架类示例（方法体在工程中补全；此处仅保留类型与注释）：

```ts
// @ts-nocheck
import type { Doc as YDoc } from 'yjs'
import type { AsyncComponent, AsyncSlot } from '@textbus/core'
import { SubModelLoader } from '@textbus/collaborate'

export class MySubModelLoader extends SubModelLoader {
  getLoadedModelBySlot(_slot: AsyncSlot): YDoc | null {
    // 协同已还原出 AsyncSlot，且该插槽对应的子 Y.Doc 已在你的管理范围内时返回；否则 null（随后可能走 loadSubModelBySlot）
  }

  getLoadedModelByComponent(_component: AsyncComponent): YDoc | null {
    // 同上，对象为 AsyncComponent
  }

  async createSubModelBySlot(_slot: AsyncSlot): Promise<YDoc> {
    // 本地新建 AsyncSlot 并参与协同时调用；须 resolve 为该插槽新建、且结构符合协同约定的子 Y.Doc
  }

  async createSubModelByComponent(_component: AsyncComponent): Promise<YDoc> {
    // 本地新建 AsyncComponent 并参与协同时调用；须 resolve 为该组件新建子 Y.Doc
  }

  async loadSubModelBySlot(_slot: AsyncSlot): Promise<YDoc> {
    // getLoadedModelBySlot 为 null，且 AsyncModelLoader.load() 已触发之后调用；须 resolve 与远端一致的子 Y.Doc（常结合 metadata / 业务 id 拉取）
  }

  async loadSubModelByComponent(_component: AsyncComponent): Promise<YDoc> {
    // 同上，对象为 AsyncComponent
  }
}
```


## `MessageBus` 与跨端数据 {#message-bus}

**`MessageBus<T>`**（**`@textbus/collaborate`**）用来在 **文档之外** 同步一份 **结构化载荷 `T`**（例如当前用户昵称、头像色、角色标签等），使 **各客户端** 都能收到 **同一份对等数据**。启用 **`CollaborateModule`**（或 **`MultipleDocumentCollaborateModule`**）并 **注册 `MessageBus`** 后：

- **`get(textbus)`**：在需要 **把本端状态发给其它端** 时由协作调用；返回值即 **当前要广播的 `T`**。
- **`consume(messages, textbus)`**：当 **各端协同状态更新** 时调用；**`messages`** 为 **`Message<T>[]`**，每项含 **`clientId`**（用于区分连接上的不同客户端）与 **`message`**（该客户端当前的 **`T`**）。
- **`onSync`**：可订阅；调用 **`sync()`** 时会发出，协作也会 **立刻** 再推送一次 **`get`** 的结果。
- **`sync()`**：当你 **刚改了要广播的数据**（例如昵称）并希望 **马上** 同步时调用；**选区变化** 时协作也会 **自动刷新对外载荷**，一般不必每次选区变化都手动 **`sync()`**。

未注册 **`MessageBus`** 时，**只做文档协同**。若还要绘制 **其它用户的选区 / 虚拟光标**，可把 **`T`** 设计成包含 **选区摘要** 等字段，并与 **`@textbus/platform-browser`** 提供的 **协作展示** 能力对齐（见 [浏览器模块](./platform-browser)）。


### 示例：同步协作用户信息

下面用 **`UserPresence`** 作为 **`T`**：**`get`** 返回当前用户展示信息；**`consume`** 里把各端列表合并成 **`clientId → UserPresence`**，供头像列表、颜色条等 UI 使用。生产代码中可把 **`peers`** 换成 **`BehaviorSubject` / 状态管理** 或 **`CollaborateCursor`** 所需的数据源。

```ts
import { Injectable } from '@viewfly/core'
import { Textbus } from '@textbus/core'
import { Message, MessageBus } from '@textbus/collaborate'

export interface UserPresence {
  userId: string
  displayName: string
  /** 用于头像边框、协同光标等 */
  color: string
}

@Injectable()
export class PresenceMessageBus extends MessageBus<UserPresence> {
  /** 当前登录用户在本房的展示信息（可由登录态、个人设置页写入） */
  private local: UserPresence = {
    userId: 'u-001',
    displayName: '访客',
    color: '#6366f1',
  }

  /** 各 clientId 的最新展示信息（示例：内存 Map，可自行换存储） */
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
    // 此处可 next 到 Rx 流、或 setState 触发 React/Vue 重绘「在线成员」列表
  }

  /** 用户改名、换主题色等：更新 local 后立刻同步到其它端 */
  setLocalPresence(patch: Partial<UserPresence>): void {
    Object.assign(this.local, patch)
    this.sync()
  }
}
```

在 **`new Textbus({ ... })`** 里与其它 **`Provider`** 一起注册（**`provide: MessageBus`**，**`useClass`** 为你的实现类）：

```ts
import { MessageBus } from '@textbus/collaborate'
import { PresenceMessageBus } from './presence-message-bus'

const editor = new Textbus({
  providers: [{ provide: MessageBus, useClass: PresenceMessageBus }],
  imports: [browserModule, collaborateModule],
})
```

**`consume`** 里的 **`clientId`** 用于 **区分不同在线客户端**；可与 **`CollaborateCursor`** 等展示约定为 **同一用户标识**。


## 可选：`CustomUndoManagerConfig`

向 **`providers`** 注册 **`CustomUndoManagerConfig`** 的实现，可 **控制哪些协同事务会进入撤销栈**（见 **`@textbus/collaborate`** 中该抽象类的可选方法）。


## 在代码中访问 `Collaborate`

**`render`** 完成后可用 **`editor.get(Collaborate)`**（类型由 **`@textbus/collaborate`** 导出）读取 **`yDoc`**、订阅 **`onAddSubModel`** 等 **公开 API**，用于与协同配置、子文档生命周期相关的逻辑。


## 常见问题

- **两端看不到彼此编辑**：检查 WebSocket 地址、**`roomName`**、服务端是否与 **`Y.Doc`** 协议一致；防火墙与 **WSS** 证书是否正常。
- **`onlyLoad: true` 一直不结束**：远端从未写入根 **`state`** 时，会一直等待；确认服务端种子文档或首写逻辑。
- **单文档协作下使用异步子插槽报错**：改用 **`MultipleDocumentCollaborateModule`** 并实现 **`SubModelLoader`**（见上文 [多文档与子模型](#multiple-doc-submodel)）。
- **远端已有异步块但本地一直不加载**：确认是否在合适时机调用了 **`loader.load()`**（见 [**`AsyncSlot`**](#async-slot) / [**`AsyncComponent`**](#async-component)），且 **`loadSubModel*`** 能根据 **`metadata` / 业务 id** 解析出正确子 **`Y.Doc`**。

## 参考

- 撤销 / 重做 API 说明：[历史记录](./history)
- 模块与 **`providers`** 合并顺序：[模块与扩展](./editor-and-modules)
