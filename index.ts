import 'reflect-metadata';

import { Observable } from 'rxjs';
import 'core-js';
import './src/assets/index.scss';


import {
  createEditor,
  fontSizeToolConfig,
  Form,
  FormHidden, FormRadio, FormSwitch,
  FormTextField,
  videoToolConfig,
  defaultOptions, PreComponent
} from './src/public-api';



defaultOptions.styleSheets.push(`
img {max-width: 100%}
`)

PreComponent.theme = 'dark';
const editor = createEditor('#editor', {
  expandComponentLibrary: true,
  deviceType: 'iPad',
  theme: 'dark',
  fullScreen: true,
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

document.getElementById('btn').addEventListener('click', () => {
  (editor as any).rootFragment.sliceContents()[1].slot.append('333')
})

window['editor'] = editor;

editor.onChange.subscribe(() => {
  console.log(editor.getJSONLiteral().json)
})

// document.addEventListener('selectionchange', () => {
//   console.log(4343)
// })

// editor.setContents(`<h1>textbus&nbsp;<span style="font-weight: normal;"><span style="letter-spacing: 5px;">富文本编</span></span><span style="letter-spacing: 5px;">辑器</span></h1>`);
