## 安装

通过 npm 安装 TextBus：
```bash
npm install @tanbo/textbus
```

在 html 中准备一个空的元素
```html
<body>
  <div id="editor"></div>
</body>

```

通过 css 选择器，或直接传入一个 DOM 元素初始化 TextBus。
```typescript
import { createEditor } from '@tanbo/textbus';
import { Observable } from 'rxjs';

const editor = createEditor('#editor', {
  uploader(type: string): string | Promise<string> | Observable<string> {
    // switch (type) {
    //   case 'video':
    //     console.log('上传视频');
    //     break;
    //   case 'image':
    //     console.log('上传视频');
    //     break;
    //   case 'audio':
    //     console.log('上传音频');
    //     break;
    // }
    return Promise.resolve().then(() => {
      return '/test'
    })
  },
  content: `<p>欢迎你使用&nbsp;<strong>TextBus</strong> 富文本编辑器...<br></p>`
});

editor.onChange.subscribe(() => {
  console.log(editor.getContents());
});
```
## 官网地址
[TextBus 官网](https://textbus.tanboui.com)
