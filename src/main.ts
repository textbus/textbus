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
  <li><img src="http://121.43.187.16/open-platform/static/img/logo04.c43a9376db1f80ca39f2e28c210fe10e.png" alt=""></li>
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
