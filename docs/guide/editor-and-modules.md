# 模块与扩展

在已熟悉 [核心概念](./concepts)、[组件基础](./component-basics) 与 [浏览器平台层](./platform-browser) 的前提下，本篇说明如何把 **`BrowserModule`**、协作包、自定义 **`providers`** 等 **拼进同一个 `Textbus` 实例**：**`Module` / `imports` / `Plugin`** 的职责、**启动与销毁顺序**，以及 **`Registry` 同名注册**、**`providers` 覆盖** 的常见结论与排错。

若当前需求只是增加块类型、格式或属性，请优先查阅 **入门** 与 [组件高级](./component-advanced)；本篇侧重 **配置合并与扩展点时机**。


## `TextbusConfig` 与 `Module`

**`TextbusConfig`**（**`new Textbus({ ... })`** 的参数类型）**继承 `Module`**：根配置本身就可以带 **`components` / `formatters` / `attributes` / `providers` / `plugins`** 以及 **`Module`** 的生命周期钩子。另有 **`imports?: Module[]`**，用于把 **`BrowserModule`**、**`CollaborateModule`** 等预打包模块与根配置 **合并到同一容器**。

**`Module`** 是 **普通对象**（类实例或字面量均可），描述「一批注册项 + 可选钩子」；**不是**必须继承某个基类。


## 常用配置字段

| 字段 | 作用 |
|------|------|
| **`components`** | 文档中会出现的 **组件类**（**`componentName`** 唯一）。 |
| **`formatters`** / **`attributes`** | 编辑器内可用的 **格式** / **属性**；可写 **实例**，或 **`(textbus) => 实例`** 延迟创建。 |
| **`imports`** | 多个 **`Module`** 依次合并进当前编辑器。 |
| **`providers`** | **`@viewfly/core`** 的 **`Provider[]`**，向 IoC 容器注册或 **覆盖** 实现（如替换 **`Adapter`** 需明确 **`provide`** 符号）。 |
| **`plugins`** | 在主视图 **`render` 完成之后** 执行 **`setup`**（见下文 **`Plugin`**）。 |
| **`readonly` / `historyStackSize` / `zenCoding` / `additionalAdapters`** | 只读、历史栈、语法糖、附加 **`Adapter`** 等全局项。 |

浏览器环境必须提供可用的 **`Adapter`** 与 **`NativeSelectionBridge`**（一般由 **`BrowserModule`** 注册）；否则 **`render`** 会失败。


## `imports` 与列表合并

合并时大致规则如下（**组件 / 格式 / 属性** 与 **`providers` / `plugins`** 的「谁覆盖谁」**不完全相同**，请分条记忆）：

- **`components` / `formatters` / `attributes`**：根 **`TextbusConfig`** 上的列表 **在前**，随后按 **`imports` 数组顺序** 追加各模块的列表。最终交给 **`Registry`** 时，**同名以「合并结果中更靠前」的条目为准**（因此 **根配置优先于任意 `import`**；仅在 **`imports` 之间** 比较时，**数组靠前的模块优先**）。
- **`providers`**：根 **`providers`** 先入队，再按 **`imports` 顺序** 追加各模块的 **`providers`**，整段再接到内核默认 **`providers` 之后**。对 **同一 `provide` token**，通常以 **合并结果中更靠后者** 为准（**更晚出现的 `Module` / 更靠后的 `Provider` 条目** 往往覆盖先前绑定；与 **`@viewfly/core`** 版本相关，引入冲突时建议用最小配置验证）。
- **`plugins`**：根与各 **`import` 的 `plugins`** 按相同顺序 **拼成一条数组**，在 **`render` 末尾** 依次 **`setup`**。

**`formatters` / `attributes`** 中的 **工厂写法** **`(textbus) => 实例`** 会在合并时 **`bind` 到当前 `Textbus` 实例** 后再收集。


## `Module` 生命周期（顺序要点）

### `beforeEach`

在 **`Textbus` 构造函数** 内调用：先按 **`imports` 顺序** 调用各模块的 **`beforeEach`**，再调用 **根 `config.beforeEach`**（若有）。适合做 **不依赖完整容器** 的注册前逻辑。

### `setup`

在 **`render`** 流程中 **`await`**：先按 **`imports` 顺序** 调用各模块的 **`setup`**，再调用 **根 `config.setup`**。可返回 **销毁回调**（或返回 **`Promise`**，解析值为回调）；返回值会进入 **`beforeDestroyCallbacks`**，在 **`destroy()`** 时执行。

多个 **`setup`** 以 **`Promise.all`** 等待，**彼此之间没有固定先后顺序**（仅保证全部完成后再继续后续启动步骤）。

### `onAfterStartup`

在 **`History.listen()`**、**`scheduler.run()`**、主 **`Adapter.render`** 完成之后，先按 **`imports` 顺序**、再调用根 **`onAfterStartup`**。适合 **依赖调度器已运行、主视图已挂载** 的逻辑（例如自动聚焦、埋点）。

### `onDestroy`

在 **`textbus.destroy()`** 中，大致顺序为：根 **`config.onDestroy`** → 各 **`plugins` 的 `onDestroy`** → 各 **`imports` 模块的 `onDestroy`** → **`setup` 返回的清理函数** → 再断开根组件与 **`History` / `Selection` / `Scheduler`** 等。编写 **`onDestroy`** 时不要假设 **`plugins` 仍可用**，按上述顺序释放资源。

**页面卸载时务必调用 `destroy()`**，避免输入层与订阅泄漏。


## `Plugin` 与 `Module.plugins`

**`Plugin`** 只有 **`setup(textbus)`** 与可选 **`onDestroy()`**，**没有** **`components` / `providers`** 等字段。

**执行时机**：**`Plugin.setup`** 在 **主 `Adapter` 渲染完成之后** 才执行，晚于所有 **`Module.setup`**。适合 **只依赖已就绪 DOM / 已挂载视图** 的扩展（例如挂载工具栏、调试浮层）。与 **`Module`** 的分工：**`Module`** 负责「注册模型与平台依赖、搭好容器」；**`Plugin`** 负责「在视图就绪后挂接 UI 或副作用」。


## `Registry` 与同名解析

**`textbus.get(Registry)`** 根据 **`componentName`**、格式名、属性名解析字面量并 **`createComponent` / `createSlot`** 等。同名项的 **有效实现** 由上一节 **「`components` / `formatters` / `attributes` 合并顺序」** 决定：需要 **覆盖** 某内置块或格式时，把 **自己的类或实例** 写在 **`new Textbus` 根配置** 上，或把 **`Module` 放在 `imports` 更前**（在 **仅调整 `imports` 顺序** 时）。


## `providers` 自定义与覆盖

**`providers`** 与 **`@textbus/core`** 使用的 **`@viewfly/core`** **`Provider`** 形态一致（**`provide` / `useClass` / `useFactory` / `useValue` / `deps`** 等）。用于：

- 由 **`BrowserModule`** 提供 **`Adapter`**、**`NativeSelectionBridge`** 等浏览器默认实现；
- 由协作等模块 **替换 `History`** 等 token；
- 由业务 **注册 `MessageBus`**、**`CustomUndoManagerConfig`** 等（见 [协作编辑](./collaborate)）。

覆盖某 token 时，必须 **与内核或模块使用的 `provide` 符号完全一致**；不确定时可在类型提示中查找 **`provide: Xxx`** 的 **`Xxx`**。


## 示例：自定义 `Module` 与 `Plugin`

::: code-group

```ts [feature-module.ts]
import type { Module, Textbus } from '@textbus/core'

export const featureModule: Module = {
  setup(textbus: Textbus) {
    const sub = textbus.onReady.subscribe(() => {
      // 就绪后再访问 DOM / Commander 等
    })
    return () => sub.unsubscribe()
  },
}
```

```ts [plugin-toolbar.ts]
import type { Plugin, Textbus } from '@textbus/core'

export const toolbarPlugin: Plugin = {
  setup(textbus: Textbus) {
    // 主视图已挂载，可安全 querySelector、挂外部 UI
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

实际工程须再并入 **`BrowserModule`**（或自行提供 **`Adapter`** 与 **`NativeSelectionBridge`**），见 [浏览器平台层](./platform-browser)。

:::


## 排错摘要

- **未配 `BrowserModule`（或等价 `Adapter` + `NativeSelectionBridge`）**：**`render`** 报错，提示缺少 **`NativeSelectionBridge`** / **`Adapter`**。
- **同名组件不生效**：检查 **`components` 合并顺序**（根与 **`imports` 先后**），确认 **`componentName`** 与数据字面量一致。
- **`providers` 未覆盖预期**：检查 **同名 `provide` 是否被更晚的 `Module` 覆盖**；必要时调整 **`imports` 顺序** 或把绑定挪到 **最后加载的模块**。
- **未 `destroy()`**：监听与 **`setup` 返回的清理函数** 不会执行，易造成泄漏或二次挂载异常。


## 接下来

- 选区与命令：[选区](./selection)、[状态查询与基础操作](./operations-and-query)
- 浏览器集成：[浏览器平台层](./platform-browser)
- 协作与 **`providers`**：[协作编辑](./collaborate)
- 包索引：[包参考概览](./packages)
