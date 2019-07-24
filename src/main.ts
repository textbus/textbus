import { Core, Editor } from './lib/index';

import './lib/assets/index.scss';
import './assets/icon/style.css';

const editor = new Core('#editor');

editor.toolbar.addHandler({
  type: 'button',
  label: '加粗',
  format: 'icon-bold',
  handler(editor: Editor): void {
    console.log(editor);
  }
});
