# 历史记录

**`History`** 提供 **撤销**（**`back()`**）与 **重做**（**`forward()`**），以及栈状态与事件。通过 **`editor.get(History)`** 获取当前实例即可。

阅读本篇前请已跑通 [快速开始](./getting-started)。下文 **`editor`** 表示已 **`render`** 的 **`Textbus`** 实例。


## 取得 `History`

```ts
import { History } from '@textbus/core'

const history = editor.get(History)
```


## `TextbusConfig`：与历史相关的配置

下列项写在 **`new Textbus({ ... })`** 或与 **`imports`** 合并的 **`Module`** 里（合并顺序见 [模块与扩展（进阶）](./editor-and-modules)）。

### `historyStackSize`

**类型**：`number | undefined`  

**作用**：限制撤销记录的最大条数；未设置时默认为 **`500`**。超过上限后，更早的步骤无法再撤销。

```ts
const editor = new Textbus({
  historyStackSize: 200,
  // ...
})
```

中途撤销后再产生新的编辑时，**重做**列表会被清空（只剩当前分支）。

### `readonly`

**类型**：`boolean | undefined`  

**作用**：编辑器初始是否为只读。运行时可用 **`editor.readonly`** 读写同一状态。

```ts
const editor = new Textbus({
  readonly: true,
  // ...
})

editor.readonly = false
```


## `History`：方法与属性

以下假定 **`const history = editor.get(History)`**。

### `listen(): void`

**作用**：启动历史监听。编辑器在 **`render`** 完成后会调用 **一次**；应用侧 **不要**主动调用 **`listen()`**。

### `back(): void`

**作用**：撤销一步。若 **`canBack === false`**，调用无效。

```ts
history.back()
```

### `forward(): void`

**作用**：重做一步。若 **`canForward === false`**，调用无效。

```ts
history.forward()
```

### `clear(): void`

**作用**：清空撤销与重做记录；之后 **`canBack` / `canForward`** 均为 **`false`**，直到产生新的可撤销编辑。

```ts
history.clear()
```

### `destroy(): void`

**作用**：销毁当前 **`History`** 实例。销毁 **`editor`** 时会调用；日常无需单独调用。

```ts
history.destroy()
```

### `canBack`（只读）

**类型**：`boolean`  

**作用**：当前是否允许 **`back()`**。

```ts
undoBtn.disabled = !history.canBack
```

### `canForward`（只读）

**类型**：`boolean`  

**作用**：当前是否允许 **`forward()`**。

```ts
redoBtn.disabled = !history.canForward
```

### `onChange`

**类型**：`Observable<void>`  

**作用**：撤销 / 重做栈或 **`canBack` / `canForward`** 发生变化时发出（例如 **`clear()`**、新步骤入栈、执行 **`back()` / `forward()`** 等）。

```ts
history.onChange.subscribe(() => {
  undoBtn.disabled = !history.canBack
  redoBtn.disabled = !history.canForward
})
```

### `onPush`

**类型**：`Observable<void>`  

**作用**：有新的撤销步骤加入栈顶时发出。

```ts
history.onPush.subscribe(() => {})
```

### `onBack`

**类型**：`Observable<void>`  

**作用**：一次 **`back()`** 成功执行后发出。

```ts
history.onBack.subscribe(() => {})
```

### `onForward`

**类型**：`Observable<void>`  

**作用**：一次 **`forward()`** 成功执行后发出。

```ts
history.onForward.subscribe(() => {})
```

## 内置快捷键

使用默认快捷键注册时：

- **撤销**：**Mod+Z**
- **重做**：**Mod+Shift+Z** 或 **Mod+Y**

效果等同于调用 **`history.back()`** / **`history.forward()`**。自定义见 [快捷键和语法糖](./shortcuts-and-grammar)。


## 只读与撤销

**`readonly === true`** 时，用户通常难以产生新的编辑；**`history.back()` / `forward()`** 本身 **不**读取 **`readonly`**。若需在只读界面禁止撤销 / 重做，应在 UI 层禁用相应按钮或避免调用上述方法。


## 常见问题

- **重做不可用**：撤销之后又发生了新的编辑时，原先的重做列表会失效。
- **导入新文档后要清空撤销**：调用 **`history.clear()`**。

## 接下来

- **快捷键**：[快捷键和语法糖](./shortcuts-and-grammar)
- **写入与选区**：[状态查询与基础操作](./operations-and-query)、[选区](./selection)
- **协作**：[协作编辑](/integrate/collaborate)
