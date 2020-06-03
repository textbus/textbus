import 'core-js';
import { createEditor } from './lib/create';
import './lib/assets/index.scss';
import { Observable } from 'rxjs';

const editor = createEditor('#editor', {
  theme: 'dark',
  uploader(type: string): string | Promise<string> | Observable<string> {
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
    fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0';
    document.body.appendChild(fileInput);
    fileInput.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('/test')
      }, 3000)
    })
  }
});

editor.setContents(`<h1 style="text-align: center; color: rgb(16, 125, 184);">T</h1><h4 style="text-align: center; color: rgb(73, 80, 96);">—— 基于 Typescript，轻量，易扩展 ——</h4><p style="font-size: 15px; color: rgb(73, 80, 96);">和传统富文本编辑器不同，TBus 未使用 DOM 的 contentEditable 属性，并且采用分层设计，抽象了出了&nbsp;<strong>Fragment</strong>（片段） 数据模型、<strong>TBSelection</strong>（选区），使开发及扩展&nbsp;<strong>Commander</strong>（命令）无需关心浏览器的行为及差异，只需要关注当前的&nbsp;<strong>Contents</strong>（内容）和&nbsp;<strong>FormatRange</strong>（格式），这种高层次的抽象，使普通开发者也可以很容易的扩展出自己的功能。甚至，在富文本中实现代码高亮这样的功能，也变得很容易。</p><pre lang="Typescript" style="font-size: 15px;"><strong style="color: rgb(51, 51, 51);">import</strong>&nbsp;{ createEditor }&nbsp;<strong style="color: rgb(51, 51, 51);">from</strong>&nbsp;<span style="color: rgb(221, 17, 68);">'@tanbo/tbus'</span>;<br><br><strong style="color: rgb(51, 51, 51);">const</strong>&nbsp;editor = createEditor(<span style="color: rgb(0, 134, 179);">document</span>.getElementById(<span style="color: rgb(221, 17, 68);">'editor'</span>));<br>editor.onChange.subscribe(result =&gt; {<br>&nbsp;&nbsp;<span style="color: rgb(0, 134, 179);">console</span>.log(result);<br>})<br></pre>`);

// createEditor('#box')

// editor.onChange.subscribe(() => {
//   console.log(editor.getContents().contents);
// })
// editor.onChange.subscribe(() => {
//   console.log(editor.getContents().contents);
// })

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

