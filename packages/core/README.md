TextBus 富文本编辑器
=====================

TextBus 是一套用于构建富交互的富文本编辑框架。和大多数富文本编辑器不同的是，TextBus 以组件为核心，格式为辅助，并大幅简化了富文本编辑器开发中常见 API，且提供了更高的抽象层，使 TextBus 不仅易于上手，同时还能驱动复杂的富文本应用。

本项目为 TextBus 核心实现，提供了跨平台富文本编辑器的基础架构，包括组件、格式、内容及编辑功能等。

本项目并不能直接创建一个富文本编辑器，还需要实现具体平台的桥接接口才可以真正搭建一个富文本编辑器。幸运的是，TextBus 目前开发了 Browser 模块和 Editor 模块，如果你是 PC 端的用户。可以直接使用以上两个模块启动一个所见即所得的编辑器。

### 文档

更多文档请参考：[中文文档](https://github.com/textbus/textbus)

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
