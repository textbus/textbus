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
  defaultOptions, PreComponent, TBHistory, BlockBackgroundColorFormatter, Layout, Commander
} from './src/public-api';
import { ComponentStagePlugin } from './src/public-api';
import { EditorController } from './src/public-api';
import { i18n_en_US } from './src/lib/i18n/en_US';
// PreComponent.theme = 'dark';
const editor = createEditor('#editor', {
  // deviceType: 'iPad',
  // theme: 'dark',
  // i18n: i18n_en_US,
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
  // contents: '<p><br></p>'
  contents: document.getElementById('table').innerHTML
});

document.getElementById('btn').addEventListener('click', () => {
  (editor as any).rootFragment.sliceContents()[1].slot.append('333')
})

window['editor'] = editor;

editor.onReady.subscribe(() => {
  window['editorController'] = editor.injector.get(EditorController)
})
//
// editor.onChange.subscribe(() => {
//   console.log(editor.getContents().content)
// })

// document.addEventListener('selectionchange', () => {
//   console.log(4343)
// })

// editor.setContents(`<h1>textbus&nbsp;<span style="font-weight: normal;"><span style="letter-spacing: 5px;">富文本编</span></span><span style="letter-spacing: 5px;">辑器</span></h1>`);

