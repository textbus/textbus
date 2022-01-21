开始
=======================


### TextBus 是什么

TextBus 是一套用于构建富交互的富文本编辑框架。和大多数富文本编辑器不同的是，TextBus 以组件为核心，格式为辅助，并大幅简化了富文本编辑器开发中常见 API，且提供了更高的抽象层，使 TextBus 不仅易于上手，同时还能驱动复杂的富文本应用。

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

### 常用方法

#### 编辑器准备

```ts
editor.onReady.subscribe(() => {
  //
})
```

#### 获取编辑结果

需要编辑器准备好后方可调用

```ts
const contents = editor.getContents()
```
通过 getContents 方法获取的结果是一个对象，其中
+ content 为 HTML 内容
+ resourcesList 为组件的资源，其中有样式表，脚本等
+ styleSheets 为默认的样式表

#### 监听编辑器变化

当编辑器准备好后才会触发
```ts
editor.onChange.subscribe(() => {
  //
})
```

#### 销毁编辑器

```ts
editor.destroy()
```

### 配置项

通过配置，你可以定制编辑器的行为、功能、插件、格式等。自定义配置的方式如下

```ts
import { createEditor } from '@textbus/editor';

const options = {
  // 这里是配置项
}

const editor = createEditor(document.getElementById('editor'), options)
```
通过 createEditor 函数创建编辑器时，你配置的字段会覆盖默认的配置，如你配置了 placeholder，则会覆盖掉默认的 placeholder，但其它的配置项还会使用默认值。

#### 组件 componentLoaders

componentLoaders 为一个数组，可以配置编辑器支持的组件。TextBus 开发了常见的组件，如果你有自定义组件，你应该把你的组件和 TextBus 的组件一起放在这里。你也可以不配置 TextBus 默认的组件，则编辑器只会支持你自定义的组件。

```ts
const options = {
  componentLoaders: [
    // 组件列表
  ]
}
```
查看[组件开发](./componet.md)文档

#### 格式 formatLoaders

formatLoaders 为一个数组，可以配置编辑器支持的格式。TextBus 已开发了常见的格式，如果你有自定义格式，你应该把你的格式和 TextBus 的格式一起放在这里。
你也可以不配置 TextBus 默认的格式，则编辑器只会支持你自定义的格式。
```ts
const options = {
  formatLoaders: [
    // 格式列表
  ]
}
```
查看[格式开发](./formatter.md)文档

#### 默认内容 content

在创建编辑器时，你可以设置编辑器的默认内容。内容可以为一个 HTML 字符串，或 TextBus 指定的 JSON 数据。

```ts
const options = {
  content: '<p>你好，我是 TextBus 富文本编辑器！</p>'
}
```

#### 样式表 styleSheets

styleSheets 为一组 css 样式表，可以配置编辑器内文档的默认样式。在调用 getContents 方法时，这里的样式表会返回在结果中。

```ts
const options = {
  styleSheets: [
    'body { background: #ccc; color: #333}'
  ]
}
```

#### 编辑时样式表 editingStyleSheets

editingStyleSheets 为一组 css 样式表，可以配置编辑器内文档的在编辑时的默认样式。在调用 getContents 方法时，这里的样式表不会返回在结果中。

```ts
const options = {
  styleSheets: [
    'p { font-size: 14px}'
  ]
}
```

#### 插件 plugins

plugins 为一个数组，可以配置编辑器的插件。如果你有自定义的插件，你应该把你的插件和 TextBus 的插件一起放在这里。你也可以不配置 TextBus 默认的插件，则编辑器只会支持你自定义的插件。

```ts
const options = {
  plugins: [
    // 你的插件
  ]
}
```

查看[插件开发](./plugin.md)文档

#### 提供者 providers

providers 为一个数组，专为高级开发提供的配置入口，providers 里面的类，可以使用 TextBus 内核中的依赖注入能力。方便扩展高级应用，一般使用者可以忽略。

#### 主题 theme

配置主题，可以配置 TextBus 的用户界面。

```ts
const options = {
  theme: 'dark'
}
```

#### 国际化 i18n

i18n 为一个 JSON 对象，可以配置 TextBus 中的文案文本。TextBus 默认为中文，同时提供了英语配置。你也可以根据自己的需要，改为其它语言。

```ts
import { i18n_en_US } from '@textbus/editor'

const options = {
  i18n: i18n_en_US
}
```

#### 提示文字 placeholder

配置编辑器内容为空时的提示文字。
```ts
const options = {
  placeholder: '请输入内容...'
}
```

#### 文件上传 uploader

uploader 为一个函数，TextBus 未实现任何与 ajax 相关的功能。如果你需要资源上传，则必须配置此项，当需要文件上传时，TextBus 会调用此函数，并根据返回值做相应处理。

```ts
const options = {
  uploader(uploadConfig) {
    // 你的上传实现
  }
}
```

其中 uploadConfig 为如下结构
```ts
export interface UploadConfig {
  /** 上传类型 */
  uploadType: string
  /** 当前值 */
  currentValue: string
  /** 是否支持返回多个结果 */
  multiple: boolean
}
```

如果 multiple 为 `false`，则表示你只能返回一个 url 字符串，或返回一个 Promise<string>，否则表示你可以返回多张图片的 url，或 Promise<string[]>。

下面以 jQuery 上传单张图片为例
```ts
const options = {
  uploader(uploadConfig) {
    switch (uploadConfig.uploadType) {
      case 'image':
        var fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
        fileInput.multiple = uploadConfig.multiple
        fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0';
        var promise = new Promise(function (resolve) {
          fileInput.addEventListener('change', function (event) {
            var form = new FormData();
            var files = event.target.files;
            for (var i = 0; i < files.length; i++) {
              // 这里的 file 字符串为后台接收 FormData 的字段名，可以改成自己需要的名字
              form.append('file', files[i]);
            }
            document.body.removeChild(fileInput);
            // 下面以 jQuery 为例实现上传
            $.ajax({
              type: "post",
              url: '/api/upload',
              data: form,
              dataType: 'json',
              processData: false,
              success: function (response) {
                if (response.success) {
                  resolve(response.imageUrl)
                }
              },
              error: function () {
                console.log('上传失败！');
              }
            })
          })
        })
        document.body.appendChild(fileInput);
        fileInput.click();
        return promise;
    }
  }
}
```
