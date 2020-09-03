import { Observable } from 'rxjs';
import 'core-js';
import './lib/assets/index.scss';


import { createEditor, fontSizeToolConfig, HighlightState } from './lib/public-api';

const editor = createEditor('#editor', {
  expandComponentLibrary: true,
  deviceWidth: '375px',
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
  editor.toolbar.tools.forEach(tool => {
    if (tool.config === fontSizeToolConfig) {
      const selectionMatchDelta = tool.config.matcher.queryState(editor.selection, editor.renderer, editor);
      const overlap = selectionMatchDelta.state === HighlightState.Highlight;
      tool.instance.commander.command(editor.selection, {}, overlap, editor.renderer, editor.rootFragment);
    }
  })
})


// editor.setContents(`<h1>textbus&nbsp;<span style="font-weight: normal;"><span style="letter-spacing: 5px;">富文本编</span></span><span style="letter-spacing: 5px;">辑器</span></h1>`);
