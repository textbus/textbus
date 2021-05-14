import { Observable } from 'rxjs';
import 'core-js';
import './src/assets/index.scss';


import {
  createEditor,
} from './src/public-api';
import { EditorController } from './src/public-api';
import { PreComponent } from '@textbus/components';
PreComponent.theme = 'dark';
const editor = createEditor('#editor', {
  theme: 'dark',
  // i18n: i18n_en_US,
  // contents: '<p><br></p>'
  // contents: document.getElementById('table').innerHTML
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

