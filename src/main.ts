import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  theme: 'mac-os',
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<p><em><strong><u><del>欢迎你使用</del></u></strong>&nbsp;TBus 富文本编辑器...</em></p><p><em>gfdsgfds</em></p><p><em>11111111<strong><u><del>gfds</del></u></strong></em></p><p><br></p><p><br></p><p><br></p>`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
