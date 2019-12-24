import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  docStyle: false,
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<h2>TBus 富文本编辑器</h2><p>TBus 是一个所见即所得的富文本编辑器，致力于创造简单、美观、易扩展的新型 web 文本编辑工具。</p><h4>和一般传统的富文本编辑器不同，TBus 不依赖于 DOM 的 contentEditable 属性，通过自实现抽象数据结构、光标、输入功能，较为完美的绕开了传统富文本很难解决的，如：光标位置、脏标签、相邻同样的标签不能自动合并、编辑数据污染输出结果等一系列问题。同时，因为脱离了传统的编辑模式，TBus 有着简洁的输入出结果。在对同样一段文本做数次格式化操作后，TBus 依然能不受影响的输出最简短的结果（基本少一半的长度），而其它的编辑器，虽然有各种各样的优化，但因为设计上的问题，输入结果却不尽人意。所以，现在赶快试试吧！</h4>`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
