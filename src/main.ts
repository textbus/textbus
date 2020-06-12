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

editor.setContents(`<div><div><div>未完成</div><div>按最近创建</div></div><em>新建</em></div>`);
