## 安装

通过 npm 安装 TBus：
```bash
npm install @tanbo/tbus
```

在 html 中准备一个空的元素
```html
<body>
  <div id="editor"></div>
</body>

```

通过 css 选择器，或直接传入一个 DOM 元素初始化 TBus。
```typescript
import { createEditor } from '@tanbo/tbus';
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
  content: `<p>欢迎你使用&nbsp;<strong>TBus</strong> 富文本编辑器...<br></p>`
});

editor.onChange.subscribe(() => {
  console.log(editor.getContents());
});
```
## 官网地址
[TBus 官网](https://www.tanboui.com/tbus/home)

## 功能定制

一般情况下，直接通过 `createEditor` 函数初始化 TBus 即可，要定制工具条，你需要手动实例化 TBus。如果你不清楚 TBus 提供了哪些工具，你只需要到 `/node_modules/@tanbo/tbus/bundles/lib/toolbar/tools` 下查看即可；
```typescript
import {
  TBus,
  audioTool,
  blockBackgroundTool,
  blockquoteTool,
  boldTool,
  cleanTool,
  preTool,
  colorTool,
  emojiTool,
  fontFamilyTool,
  fontSizeTool,
  headingTool,
  historyBackTool,
  historyForwardTool,
  imageTool,
  italicTool,
  letterSpacingTool,
  lineHeightTool,
  linkTool,
  olTool,
  strikeThroughTool,
  subscriptTool,
  superscriptTool,
  tableEditTool,
  tableTool,
  textAlignTool,
  textBackgroundTool,
  textIndentTool,
  ulTool,
  underlineTool,
  videoTool,
  codeTool,
  leftToRightTool,
  rightToLeftTool, 
  tableAddParagraphTool, 
  tableRemoveTool
} from '@tanbo/tbus';

const editor = new TBus(document.getElementById('editor'), {
  toolbar: [
    [historyBackTool, historyForwardTool],
    [headingTool],
    [boldTool, italicTool, strikeThroughTool, underlineTool],
    [blockquoteTool, codeTool],
    [preTool],
    [olTool, ulTool],
    [fontSizeTool, lineHeightTool, letterSpacingTool, textIndentTool],
    [subscriptTool, superscriptTool],
    [leftToRightTool, rightToLeftTool],
    [colorTool, textBackgroundTool, blockBackgroundTool, emojiTool],
    [fontFamilyTool],
    [linkTool, imageTool, audioTool, videoTool],
    [textAlignTool],
    [tableTool, tableEditTool, tableAddParagraphTool, tableRemoveTool],
    [cleanTool]
  ]
});
editor.onChange.subscribe(() => {
  console.log(editor.getContents());
});
```
