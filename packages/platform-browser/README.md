Textbus PC 浏览器支持模块
=====================

Textbus 是一套用于构建富交互的富文本编辑框架。和大多数富文本编辑器不同的是，Textbus 以组件为核心，格式为辅助，并大幅简化了富文本编辑器开发中常见
API，且提供了更高的抽象层，使 Textbus 不仅易于上手，同时还能驱动复杂的富文本应用。

本项目为 Textbus PC 端浏览器中间层实现，提供了 Textbus PC 端所需要的编辑器基本支持能力。如光标、选区桥接、DOM 解析及渲染能力桥接等。

如果你需要一个开箱即用的编辑器，请参考[官方文档](https://textbus.io)。

## 安装

```
npm install @textbus/core @textbus/platform-browser
```

## 创建编辑器

```ts
import { Viewer, ViewOptions } from '@textbus/browser'

import { rootComponent, rootComponentLoader } from './root.component'

const config: ViewOptions = {
  // ...配置项
}

const editor = new Viewer(rootComponent, rootComponentLoader, config)
```

其中 `rootComponent`，`rootComponentLoader` 实现请参考[官方文档](https://textbus.io/docs/guide)。

### 配置项

配置项接口如下：

```ts
export interface ViewModule extends Module {
  componentLoaders?: ComponentLoader[]
  formatLoaders?: FormatLoader[]
}

/**
 * Textbus PC 端配置接口
 */
export interface ViewOptions extends TextbusConfig {
  imports?: ViewModule[]
  /** 自动获取焦点 */
  autoFocus?: boolean
  /** 编辑区最小高度 */
  minHeight?: string
  /** 组件加载器 */
  componentLoaders?: ComponentLoader[]
  /** 格式加载器 */
  formatLoaders?: FormatLoader[]
  /** 默认内容 */
  content?: string | ComponentLiteral
  /** 文档默认样式表 */
  styleSheets?: string[]
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[]
}
```

### 启动

```ts
const host = document.getElementById('editor')

editor.mount(host).then(() => {
  console.log('编辑器创建成功！')
})
```

### 销毁编辑器

```ts
editor.destroy()
```

### 获取焦点

```ts
editor.focus()
```

### 取消焦点

```ts
editor.blur()
```

### 获取 HTML 内容

```ts
const content = editor.getContents().content
```

### 获取 JSON 内容

```ts
const json = editor.getJSON().content
```

### 替换内容

```ts
editor.replaceContent('<p>新内容！</p>')

editor.replaceContent({
  // 必须为 Textbus 导出的 JSON 格式
})
```

### 清空编辑器

```ts
editor.replaceContent('')
```

### 官方文档

更多文档请参考：[中文文档](https://textbus.io)
