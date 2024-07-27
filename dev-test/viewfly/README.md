XNote
====================
Xnote 是一个无头、高性能、与框架无关的富文本编辑器，支持多人在线协作。提供了丰富的现代文档编辑功能。

Xnote 底层依赖于开源富文本框架 [Textbus](https://textbus.io) 和前端视图 [Viewfly](https://viewfly.org)。因此，你可以在此基础上继续扩展自己的功能。

## 在线演示

[在线演示](https://textbus.io/playground/)

## 安装

```
npm install @textbus/xnote katex
```

## 使用

```ts
import 'katex/dist/katex.min.css'
import { Editor } from '@textbus/xnote'

const editor = new Editor()
editor.mount(document.getElementById('editor')).then(() => {
  console.log('编辑器准备完成。')
})
```

