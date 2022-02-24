TextBus 富文本编辑器
=====================

TextBus 是一套用于构建富交互的富文本编辑框架。和大多数富文本编辑器不同的是，TextBus 以组件为核心，格式为辅助，并大幅简化了富文本编辑器开发中常见 API，且提供了更高的抽象层，使 TextBus 不仅易于上手，同时还能驱动复杂的富文本应用。

本项目为 TextBus PC 端浏览器（Browser）中间层实现，通过 Browser 模块，你可以创建一个最基础的编辑器。同时，你还需要在此基础上扩展自己的组件、格式和插件，才能创建一个完整的编辑器。

幸运的是，TextBus 目前在 Browser 的基础上，已创建了一个新的 Editor 模块。你可以直接使用 Editor 模块。或参考开发文档，开发自己的扩展。

### 文档

更多文档请参考：[中文文档](https://textbus.io)

### 安装

TextBus 可能通过两种方式引入到你的项目中。

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

const editor = createEditor(document.getElementById('editor'))

```


#### 通过 script 标签引入

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/path/textbus.min.css">
  <script src="/path/textbus.min.js"></script>
  <title>TextBus 示例</title>
</head>
<body>
<div id="editor"></div>
<script>
  var editor = textbus.createEditor(document.getElementById('editor'))
</script>
</body>
</html>
```
