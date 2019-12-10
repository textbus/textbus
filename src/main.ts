import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  docStyle: true,
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<p>111<strong>222</strong></p><p><strong><br></strong></p><p><strong>魂牵梦萦</strong></p><p><strong><br></strong></p><p><strong><br></strong></p><p><strong><br></strong></p><p><strong>魂牵梦萦<br></strong></p>
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
