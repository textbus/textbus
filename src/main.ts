import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  theme: 'mac-os',
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<h1 style="text-align: center; color: rgb(16, 125, 184);">TBus <span style="letter-spacing: 5px;">富文本编辑器</span></h1><h4 style="text-align: center; color: rgb(73, 80, 96);">—— 基于 Typescript，轻量，易扩展 ——</h4><p style="font-size: 15px; color: rgb(73, 80, 96);">和传统富文本编辑器不同，TBus 未使用 DOM 的 contentEditable 属性，并且采用分层设计，抽象了出了&nbsp;<strong>Fragment</strong>（片段） 数据模型、<strong>TBSelection</strong>（选区），使开发及扩展&nbsp;<strong>Commander</strong>（命令）无需关心浏览器的行为及差异，只需要关注当前的&nbsp;<strong>Contents</strong>（内容）和&nbsp;<strong>FormatRange</strong>（格式），这种高层次的抽象，使普通开发者也可以很容易的扩展出自己的功能。甚至，在富文本中实现代码高亮这样的功能，也变得很容易。</p><p style="font-size: 15px; color: rgb(73, 80, 96);">要使用 TBus，你需要先从 npm 安装：<br></p><pre lang="bash" style="font-size: 15px;">npm install @tanbo/tbus<br></pre><p style="color: rgb(73, 80, 96); font-size: 15px;">初始化 TBus：</p><pre lang="Typescript" style="font-size: 15px;"><strong style="color: rgb(51, 51, 51);">import</strong>&nbsp;{ createEditor }&nbsp;<strong style="color: rgb(51, 51, 51);">from</strong>&nbsp;<span style="color: rgb(221, 17, 68);">'@tanbo/tbus'</span>;<br><br><strong style="color: rgb(51, 51, 51);">const</strong>&nbsp;editor = createEditor(<span style="color: rgb(0, 134, 179);">document</span>.getElementById(<span style="color: rgb(221, 17, 68);">'editor'</span>));<br>editor.onChange.subscribe(result =&gt; {<br>&nbsp;&nbsp;<span style="color: rgb(0, 134, 179);">console</span>.log(result);<br>})<br></pre><h3 style="color: rgb(73, 80, 96);">TBus 的亮点<br></h3><ul><li><p style="color: rgb(73, 80, 96); font-size: 15px;">得益于优秀的设计，TBus 天然支持极简的输出结果。<br></p></li><li><p style="color: rgb(73, 80, 96); font-size: 15px;">支持代码高亮，程序员写文档的利器。<br></p></li><li><p style="color: rgb(73, 80, 96); font-size: 15px;">支持表格，提供如合并、拆分、增加、删除操作，并支持框选单元格后，执行批量格式化。</p></li><li><p style="font-size: 15px;"><span style="color: rgb(73, 80, 96);">隔离浏览器行为及差异，高度抽象，使普通开发者也可以方便的扩展自己所需的功能。</span><br></p></li></ul><p><br></p>`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
