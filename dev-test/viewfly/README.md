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

## 文件上传

要实现文件上传需实现 FileUploader 接口

```ts
import { FileUploader } from '@textbus/xnote'

class YourUploader extends FileUploader {
  uploadFile(type: string): string | Promise<string> {
    if (type === 'image') {
      return 'imageUrl'
    }
    if (type === 'video') {
      return 'videoUrl'
    }
  }
}

const editor = new Editor({
  providers: [{
    provide: FileUploader,
    useFactory() {
      return new YourFileUplader()
    }
  }]
})
```

## 粘贴图片 Base64 转 URL

```ts
import { Commander } from '@textbus/core'
import { Injectable } from '@viewfly/core'
import { ImageComponent } from '@textbus/xnote'

@Injectable()
class YourCommander extends Commander {
  paste(slot: Slot, text: string) {
    slot.sliceContent().forEach(content => {
      if (content instanceof ImageComponent) {
        const base64 = content.state.url
        // base64 转 url，请自行实现
        content.state.url = 'https://xxx.com/xxx.jpg'
      }
    })
    
    // 待图片转换完成后，可调用超类的 paste 方法
    super.paste(slot, text)
    return true
  }
}

const editor = new Editor({
  providers: [{
    provide: Commander,
    useClass: YourCommander
  }]
})
```

## 获取 HTML

```ts
const html = editor.getHTML()
```

## 设置初始 HTML

```ts
const editor = new Editor({
  content: '<div>HTML 内容</div>'
})
```

## @ 人

在文档中 @ 人功能需实现以下接口，以对接用户信息

```ts
export abstract class Organization {
  abstract getMembers(name?: string): Promise<Member[]>

  abstract getMemberById(id: string): Promise<Member | null>
}
```
然后在编辑器初始化时传入你的实现
```ts
const editor = new Editor({
  providers: [{
    provide: Organization,
    useValue: new YourOrganization()
  }]
})
```

## 协作支持

Textbus 天然支持协作，只需要在编辑器配置项中添加协作配置信息即可，具体配置你可以参考 [https://textbus.io/guide/collab/](https://textbus.io/guide/collab/)

```ts
const editor = new Editor({
  collaborateConfig: {
    userinfo: user, // 用户信息
    createConnector(yDoc): SyncConnector {
      // 返回连接器
      return new YWebsocketConnector('wss://example.com', 'docName', yDoc)
    }
  }
})
```



