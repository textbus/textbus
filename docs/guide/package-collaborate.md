# @textbus/collaborate

**`@textbus/collaborate`** 提供基于 **Yjs** 的多人编辑绑定、协作用 **`History`** 实现，以及 **WebSocket / Hocuspocus** 等内置连接器。接入步骤、服务端要求与 **`onlyLoad`**、多文档等说明见指南 [**协作编辑**](./collaborate)。

## 模块

| 导出 | 说明 |
|------|------|
| **`CollaborateModule`** | 单文档协作：注册 **`Collaborate`**、**`CollabHistory`**（顶替 **`History`**）、**`SyncConnector`**、**`NonSubModelLoader`**。构造入参 **`CollaborateConfig`**。 |
| **`MultipleDocumentCollaborateModule`** | 多子文档 / 异步子模型：注册 **`MultipleDocCollabHistory`** 与自定义 **`SubModelLoader`**。构造入参 **`MultipleDocCollaborateConfig`**（含 **`subModelLoader`**）。 |

**`CollaborateConfig`**：`createConnector(yDoc)` 返回 **`SyncConnector`**；可选 **`onlyLoad?: boolean`**。

**`MultipleDocCollaborateConfig`**：在 **`CollaborateConfig`** 上增加 **`subModelLoader: SubModelLoader`**。

## 连接器

| 导出 | 说明 |
|------|------|
| **`SyncConnector`**（抽象类） | **`onLoad`**、**`onStateChange`**、**`setLocalStateField`**、**`onDestroy`**；自定义传输层时从此类派生。 |
| **`YWebsocketConnector`** | **`y-websocket`**：**`new YWebsocketConnector(url, roomName, yDoc)`**。 |
| **`HocuspocusConnector`** | **`@hocuspocus/provider`**：**`new HocuspocusConnector(HocuspocusProviderConfiguration)`**；**`document`** 须为 **`createConnector`** 收到的 **`yDoc`**。行为说明见 [协作编辑 · `HocuspocusConnector`](./collaborate#hocuspocusconnector)。 |

## 协作服务与扩展点

| 导出 | 说明 |
|------|------|
| **`Collaborate`** | 可注入服务：**`yDoc`**、**`slotMap`**、**`onAddSubModel`**；与 Yjs 同步根组件与子结构。 |
| **`CollabHistory`** | 实现 **`History`**；由 **`CollaborateModule`** 注册为 **`History`** 实现。 |
| **`MultipleDocCollabHistory`** | 多文档场景下的 **`History`** 实现。 |
| **`MessageBus`**（抽象类 **`MessageBus<T>`**） | 跨端消息：**`get`**、**`consume`**、**`sync`**、**`onSync`**；用法与示例见 [协作编辑 · `MessageBus`](./collaborate#message-bus)。 |
| **`SubModelLoader`**（抽象类） | 子 **`Y.Doc`** 与 **`AsyncSlot`**、**`AsyncComponent`** 的创建与加载；见 [协作编辑 · `AsyncSlot`](./collaborate#async-slot)、[协作编辑 · `AsyncComponent`](./collaborate#async-component) 与 [多文档与子模型](./collaborate#multiple-doc-submodel)。 |
| **`NonSubModelLoader`** | 单文档占位实现；不支持异步子模型。 |
| **`CustomUndoManagerConfig`**（抽象类） | 为 Yjs **`UndoManager`** 提供可选 **`captureTransaction`**、**`deleteFilter`**。 |

## 类型（节选）

与选区在协同撤销栈中的记录、子模型通知等相关：

- **`SubModelLoaded`**：**`yType`**、**`yDoc`**
- **`Message<T>`**：**`clientId`**、**`message`**
- **`CursorPosition`**、**`CollaborateHistorySelectionPosition`**、**`RelativePositionRecord`**

完整签名以包内 **`d.ts`** 为准。
