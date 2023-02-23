Textbus 内核模块
=====================

Textbus 是一套用于构建富交互的富文本编辑框架。和大多数富文本编辑器不同的是，Textbus 以组件为核心，格式为辅助，并大幅简化了富文本编辑器开发中常见
API，且提供了更高的抽象层，使 Textbus 不仅易于上手，同时还能驱动复杂的富文本应用。

本项目为 Textbus 核心实现，提供了跨平台富文本编辑器的基础架构，包括组件、格式、内容及数据驱动架构设计等功能。

只有 core 模块还不足以创建一个富文本编辑器，还需要搭配一个视图层的实现。目前 Textbus
官方已实现了 [@textbus/browser](https://www.npmjs.com/package/@textbus/browser) 模块用于在 pc
端浏览器创建编辑器基础能力。随着后面的开发，还会提供小程序和移动端浏览器的视图层。

如果你需要一个开箱即用的编辑器，请参考[官方文档](https://textbus.io)。

## 安装

```
npm install @textbus/core
```

## 搭建视图层实现

启动 Textbus 内核需要从 Starter 类开始，Starter 是一个IoC 容器，继承自 [@tanbo/di](https://github.com/tbhuabi/di)
中的 `ReflectiveInjector` 类。

```ts
import { Starter } from '@textbus/core'

const config: TextbusConfig = {
  // ... 配置项
}

const core = new Starter(config)
```

### 配置项

```ts
/**
 * Textbus 模块配置
 */
export interface Module {
  /** 组件列表 */
  components?: Component[]
  /** 格式列表 */
  formatters?: Formatter[]
  /** 跨平台及基础扩展实现的提供者 */
  providers?: Provider[]
  /** 插件集合 */
  plugins?: Array<() => Plugin>

  /**
   * 初始化之前的设置，返回一个函数，当 Textbus 销毁时调用
   * @param starter
   */
  setup?(starter: Starter): Promise<(() => void) | void> | (() => void) | void
}

/**
 * Textbus 核心配置
 */
export interface TextbusConfig extends Module {
  /** 导入第三方包 */
  imports?: Module[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
  /** 开启 Zen Coding 支持 */
  zenCoding?: boolean
  /** 最大历史记录栈 */
  historyStackSize?: number
  /** 是否只读 */
  readonly?: boolean
}
```

TextbusConfg 接口所有选项都是可选的，但由于 core 模块并不包含视图实现，所以要正常启动，还需要实现两个视图层的接口。

#### 原生选区桥接

原生选区桥接接口如下：

```ts
/**
 * 用于跨平台实现的原生选区抽象类
 */
export abstract class NativeSelectionBridge {
  /**
   * 连接方法，Textbus 在需要桥接原生选区时调用，并传入连接器
   * @param connector
   */
  abstract connect(connector: NativeSelectionConnector): void

  /**
   * 取消连接方法，Textbus 会在不需要桥接选区时调用
   */
  abstract disConnect(): void

  /**
   * Textbus 选区变化时调用，同时传入选区位置，用于原生选区实现具体平台的拖蓝效果
   * @param range
   * @param changeFromLocal 是否是本地引起的变化
   */
  abstract restore(range: AbstractSelection | null, changeFromLocal: boolean): void

  /**
   * 获取原生选区的坐标位置，用于 Textbus 计算光标移动相关功能
   * @param position
   */
  abstract getRect(position: SelectionPosition): RangeViewPosition | null
}
```

实现

```ts
import { NativeSelectionBridge } from '@textbus/core'

export class YourSelectionBridge extends NativeSelectionBridge {
  // 具体平台实现...
}
```

#### 原生渲染能力桥接

接口如下：

```ts
**
 * 原生渲染器抽象类，由具体平台提供具体实现
 */
export abstract class NativeRenderer {
  abstract createElement(name: string): NativeNode

  abstract createTextNode(textContent: string): NativeNode

  abstract appendChild(parent: NativeNode, newChild: NativeNode): void

  abstract addClass(target: NativeNode, name: string): void

  abstract removeClass(target: NativeNode, name: string): void

  abstract setAttribute(target: NativeNode, key: string, value: string): void

  abstract removeAttribute(target: NativeNode, key: string): void

  abstract setStyle(target: NativeNode, key: string, value: any): void

  abstract removeStyle(target: NativeNode, key: string): void

  abstract replace(newChild: NativeNode, oldChild: NativeNode): void

  abstract remove(node: NativeNode): void

  abstract insertBefore(newNode: NativeNode, ref: NativeNode): void

  abstract getChildByIndex(parent: NativeNode, index: number): NativeNode | null

  abstract listen<T = any>(node: NativeNode, type: string, callback: (ev: T) => any): void

  abstract unListen(node: NativeNode, type: string, callback: (ev: any) => any): void

  abstract copy(): void
}
```

实现

```ts
import { NativeRenderer } from '@textbus/core'

export class YourRenderer extends NativeRenderer {
  // 原生渲染能力实现...
}
```

### 启动

初始化

```ts
import { rootComponent } from './root.component'

const host = document.getElementById('editor')

core.mount(rootComponent, host).then(() => {
  console.log('编辑器创建成功！')
})
```

其中，`rootComponent` 的实现请参考[官方文档](https://textbus.io/docs/guide)。

### 销毁

```ts
core.destroy()
```

## Textbus 其它模块

+ [browser 模块](https://www.npmjs.com/package/@textbus/platform-browser) —— PC 端富文本编辑器中间层
+ [editor 模块](https://www.npmjs.com/package/@textbus/editor) —— PC 端富文本编辑器
+ [collaborate 模块](https://www.npmjs.com/package/@textbus/collaborate) —— 协作编辑支持模块
+ [node 模块](https://www.npmjs.com/package/@textbus/platform-node) —— node 后台支持工具包

### 官方文档

更多文档请参考：[中文文档](https://textbus.io)
