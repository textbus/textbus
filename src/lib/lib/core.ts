import { Toolbar } from './toolbar/toolbar';
import { Editor } from './editor/editor';
import { EditorOptions } from './help';


export class Core {
  readonly host = document.createElement('div');
  readonly toolbar: Toolbar;
  readonly editor: Editor;
  private container: HTMLElement;

  constructor(selector: string | HTMLElement, private options: EditorOptions = {}) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.editor = new Editor();
    this.toolbar = new Toolbar(this.editor);
    if (Array.isArray(options.handlers)) {
      options.handlers.forEach(handler => {
        if (Array.isArray(handler)) {
          this.toolbar.addGroup(handler);
        } else {
          this.toolbar.addHandler(handler);
        }
      });
    }

    this.host.appendChild(this.toolbar.host);
    this.host.appendChild(this.editor.host);

    this.host.classList.add('tanbo-editor-container');
    this.container.appendChild(this.host);
  }

}
