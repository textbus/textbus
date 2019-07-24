import { Toolbar } from './toolbar/toolbar';
import { Editor } from './editor/editor';
import { EditorOptions } from './help';


export class Core {
  toolbar: Toolbar<Core>;
  editor: Editor;
  private hostElement: HTMLElement;

  constructor(selector: string | HTMLElement, private options: EditorOptions = {}) {
    if (typeof selector === 'string') {
      this.hostElement = document.querySelector(selector);
    } else {
      this.hostElement = selector;
    }
    this.toolbar = new Toolbar();
    this.editor = new Editor();
    this.hostElement.appendChild(this.toolbar.host);
    this.hostElement.appendChild(this.editor.host);
  }

}
