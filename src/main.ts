import 'core-js';
// import { createEditor } from './lib/create';
import {
  AudioTemplateTranslator,
  audioTool,
  blockBackgroundTool, BlockStyleFormatter,
  BlockTemplateTranslator,
  boldFormatter,
  boldTool,
  cleanTool,
  CodeTemplateTranslator,
  codeTool,
  colorFormatter,
  colorTool,
  DefaultHook,
  defaultStyleSheets,
  Editor,
  emojiTool,
  fontFamilyFormatter,
  fontFamilyTool,
  fontSizeFormatter,
  fontSizeTool,
  FormatAbstractData,
  FormatDelta,
  FormatEffect,
  headingTool,
  historyBackTool,
  historyForwardTool, HistoryHook,
  ImageTemplateTranslator,
  imageTool,
  italicFormatter,
  italicTool,
  letterSpacingFormatter,
  letterSpacingTool,
  lineHeightFormatter,
  lineHeightTool, linkFormatter,
  linkTool,
  ListTemplateTranslator,
  olTool,
  SingleTemplateTranslator,
  strikeThroughFormatter,
  strikeThroughTool,
  subscriptFormatter,
  subscriptTool,
  superscriptFormatter,
  superscriptTool,
  tableEditTool,
  TableTemplateTranslator,
  tableTool,
  textAlignTool,
  textBackgroundTool,
  textIndentFormatter,
  textIndentTool,
  ulTool,
  underlineFormatter,
  underlineTool,
  VideoTemplateTranslator,
  videoTool
} from './lib/public-api';

import './lib/assets/index.scss';
// import { Observable } from 'rxjs';

const a: FormatDelta = {
  abstractData: new FormatAbstractData(),
  state: FormatEffect.Invalid,
  renderer: new BlockStyleFormatter('a', {}),
  // startIndex: 0,
  // endIndex: 9
}

const editor = new Editor('#editor', {
  theme: 'dark',
  styleSheets: defaultStyleSheets,
  hooks: [
    new DefaultHook(),
    new HistoryHook()
  ],
  templateTranslators: [
    new ListTemplateTranslator('ul'),
    new ListTemplateTranslator('ol'),
    new BlockTemplateTranslator('div,p,h1,h2,h3,h4,h5,h6'.split(',')),
    new SingleTemplateTranslator('br'),
    new CodeTemplateTranslator(),
    new AudioTemplateTranslator(),
    new VideoTemplateTranslator(),
    new ImageTemplateTranslator(),
    new TableTemplateTranslator()
  ],
  formatters: [
    fontFamilyFormatter,
    boldFormatter,
    italicFormatter,
    strikeThroughFormatter,
    underlineFormatter,
    fontSizeFormatter,
    linkFormatter,
    lineHeightFormatter,
    letterSpacingFormatter,
    textIndentFormatter,
    colorFormatter,
    subscriptFormatter,
    superscriptFormatter,
  ],
  toolbar: [
    [historyBackTool, historyForwardTool],
    [headingTool],
    [boldTool, italicTool, strikeThroughTool, underlineTool],
    [codeTool],
    [olTool, ulTool],
    [fontSizeTool, lineHeightTool, letterSpacingTool, textIndentTool],
    [subscriptTool, superscriptTool],
    [colorTool, textBackgroundTool, blockBackgroundTool, emojiTool],
    [fontFamilyTool],
    [linkTool, imageTool, audioTool, videoTool],
    [textAlignTool],
    [tableTool, tableEditTool],
    [cleanTool]
  ]
});

editor.setContents(`
 <h1>te&nbsp;&nbsp;&nbsp;st</h1>&nbsp;&nbsp;<p>19世纪非欧几何理论诞生，广义相对论说明了这种空间的真实存在。然而对于人们来说，想像诡异的非欧空间是困难的。我们从微分流形的角度<a href="/test">BlockStyleCommander</a>出发，对给定度规、Christoffel记号的参数空间，提出局部渲染和全局渲染两个方法：利用OpenGL进行局部渲染，通过调整为求解测地线方程的Ray Marching算法进行全局渲染。展示非欧空间下的图形，拓展人类的空间想象力。</p>
`);

editor.onChange.subscribe(() => {
  console.log(editor.getContents().contents);
})

// const editor = createEditor('#editor', {
//   theme: 'dark',
//   usePaperModel: true,
//   uploader(type: string): string | Promise<string> | Observable<string> {
//     const fileInput = document.createElement('input');
//     fileInput.setAttribute('type', 'file');
//     fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
//     fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0';
//     document.body.appendChild(fileInput);
//     fileInput.click();
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve('/test')
//       }, 3000)
//     })
//   },
//   content: ``
// });

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// const box = document.getElementById('box');
// editor.onChange.subscribe(result => {
//   console.log(result);
//   box.innerText = result;
// });

// setTimeout(() => {
//   editor.setContents(`<html><body><div>测试</div></body></html>`)
// }, 3000);
