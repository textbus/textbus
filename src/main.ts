import 'core-js';
import { createEditor } from './lib/create';
import './lib/assets/index.scss';
import { Observable } from 'rxjs';

const editor = createEditor('#editor', {
  // theme: 'dark',
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

editor.setContents(`<h1>TBus&nbsp;<span style="letter-spacing: 5px;">富文本编辑器</span></h1><table><tbody><tr><td><br></td><td>111<br></td><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td>222<br></td><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td>3333<br></td><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td>444<br></td><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td>555<br></td><td><br></td><td><br></td><td><br></td></tr></tbody></table>`);
