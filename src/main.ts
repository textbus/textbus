import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  theme: 'dark',
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<body><p>欢迎你<strong>使用 T<u>Bu<del>s 富文</del></u></strong><u><del>本编辑</del>器...</u><br></p><table><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p></body>`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
const box = document.getElementById('box');
editor.onChange.subscribe(result => {
  box.innerText = result.contents;
});

// setTimeout(() => {
//   editor.setContents(`<html><body><div>测试</div></body></html>`)
// }, 3000);
