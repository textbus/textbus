import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `
<strong>111</strong>
  <ul>
  <strong>test</strong>
  <li><a href="javascript:;">aaa</a></li>
  <li>bbb</li>
  <li><img src="https://www.tanboui.com/static/img/logo2.558fcff8d5b49909b4db53f3ca66e823.png" alt=""></li>
</ul>
`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
