import 'core-js';
import { createEditor } from './lib/create';
import './lib/assets/index.scss';
import { Observable } from 'rxjs';

// document.body.insertBefore(form.elementRef, document.body.children[0]);

const editor = createEditor('#editor', {
  // expandComponentLibrary: true,
  // deviceWidth: '768px',
  theme: 'dark',
  // fullScreen: true,
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
  },
  contents: document.getElementById('table').innerHTML
});
let i = 0;
editor.onChange.subscribe(() => {
  // console.log(i, Date.now());
  i++;
})

document.getElementById('btn').addEventListener('click', () => {
  console.log(editor.getContents().html)
})

// editor.setContents(`<h1>textbus&nbsp;<span style="font-weight: normal;"><span style="letter-spacing: 5px;">富文本编</span></span><span style="letter-spacing: 5px;">辑器</span></h1>`);
