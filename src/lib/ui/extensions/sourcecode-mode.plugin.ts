import { Injectable } from '@tanbo/di';
import { fromEvent, Subscription } from 'rxjs';
import pretty from 'pretty';
import codemirror from 'codemirror';
import 'codemirror/mode/htmlmixed/htmlmixed';

import { TBPlugin } from '../plugin';
import { EditorController } from '../../editor-controller';
import { Editor, } from '../../editor';
import { Layout } from '../layout';
import { createElement } from '../uikit/_api';

@Injectable()
export class SourcecodeModePlugin implements TBPlugin {
  set switch(b: boolean) {
    this._switch = b;
    this.layout.dashboard.style.display = b ? 'none' : '';
    this.container.style.display = b ? 'block' : 'none'
    this.editorController.readonly = b;
    if (b) {
      this.btn.classList.add('textbus-status-bar-btn-active');
      this.codeMirrorInstance = codemirror(this.container, {
        lineNumbers: true,
        mode: 'text/html',
        theme: 'idea',
        indentUnit: 2,
        lineWrapping: true,
        value: pretty(this.editor.getContents().content)
      })

    } else {
      this.btn.classList.remove('textbus-status-bar-btn-active');
      if (this.codeMirrorInstance) {
        const value = this.codeMirrorInstance.getValue().split('\n').map(i => i.trim()).join('');
        this.editor.setContents(value);
        this.codeMirrorInstance = null;
        this.container.innerHTML = '';
      }
    }
  }

  get switch() {
    return this._switch;
  }

  private _switch = false

  private codeMirrorInstance: codemirror.Editor

  private subs: Subscription[] = [];
  private btn: HTMLButtonElement;
  private container = createElement('div', {
    classes: ['textbus-sourcecode-mode-plugin-container']
  });

  constructor(private layout: Layout,
              private editor: Editor,
              private editorController: EditorController) {
  }

  setup() {
    const el = createElement('div', {
      classes: [],
      children: [
        this.btn = createElement('button', {
          classes: ['textbus-status-bar-btn'],
          attrs: {
            type: 'button'
          },
          props: {
            innerHTML: '源代码'
          }
        }) as HTMLButtonElement
      ]
    });
    this.layout.bottomBar.appendChild(el);
    this.layout.workbench.appendChild(this.container);

    this.subs.push(fromEvent(this.btn, 'click').subscribe(() => {
      this.switch = !this.switch;
    }))
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }
}
