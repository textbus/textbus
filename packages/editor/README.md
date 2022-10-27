Textbus 富文本编辑器
=====================

Textbus 是一套用于构建富交互的富文本编辑框架。和大多数富文本编辑器不同的是，Textbus 以组件为核心，格式为辅助，并大幅简化了富文本编辑器开发中常见
API，且提供了更高的抽象层，使 Textbus 不仅易于上手，同时还能驱动复杂的富文本应用。

### 文档

更多文档请参考：[中文文档](https://textbus.io)

### 安装

Textbus 可能通过两种方式引入到你的项目中。

#### 通过 npm 安装

```
npm install @textbus/core @textbus/browser @textbus/editor
```

在 DOM 中准备好一个空的标签

```html
<div id="editor"></div>
```

创建编辑器实例

```ts
import '@textbus/editor/bundles/textbus.min.css';
import { createEditor } from '@textbus/editor';

const editor = createEditor()
editor.mount(document.getElementById('editor'))

```

#### 通过 script 标签引入

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/path/textbus.min.css">
  <script src="/path/textbus.min.js"></script>
  <title>Textbus 示例</title>
</head>
<body>
<div id="editor"></div>
<script>
  var editor = textbus.editor.createEditor()
  editor.mount(document.getElementById('editor'))
</script>
</body>
</html>
```
