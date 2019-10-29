import { EditorOptions } from '../_lib/help';
import { Viewer } from './viewer/viewer';
import { HandlerOption, HandlerType } from '../_lib/toolbar/help';

export class Editor {
  readonly elementRef = document.createElement('div');

  private viewer = new Viewer();
  private readonly toolbar = document.createElement('div');
  private readonly container: HTMLElement;

  constructor(selector: string | HTMLElement, options: EditorOptions = {}) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    // if (Array.isArray(options.handlers)) {
    //   options.handlers.forEach(handler => {
    //     if (Array.isArray(handler)) {
    //       this.addGroup(handler);
    //     } else {
    //       this.addHandler(handler);
    //     }
    //   });
    // }

    this.toolbar.classList.add('tanbo-editor-toolbar');

    this.elementRef.appendChild(this.toolbar);
    this.elementRef.appendChild(this.viewer.elementRef);
    // this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tanbo-editor-container');
    this.container.appendChild(this.elementRef);
  }

  // addHandler(option: HandlerOption) {
  //   this.isFirst = false;
  //   switch (option.type) {
  //     case HandlerType.Button:
  //       this.addButtonHandler(option);
  //       break;
  //     case HandlerType.Select:
  //       this.addSelectHandler(option);
  //       break;
  //     case HandlerType.Dropdown:
  //       this.addDropdownHandler(option);
  //       break;
  //     case HandlerType.ActionSheet:
  //       this.addActionSheetHandler(option);
  //   }
  //   if (option.hooks) {
  //     this.run(() => {
  //       this.editor.use(option.hooks);
  //     });
  //   }
  // }
  //
  // addGroup(handlers: HandlerOption[]) {
  //   if (!this.isFirst) {
  //     this.toolbar.appendChild(Editor.createSplitLine());
  //   }
  //   handlers.forEach(handler => {
  //     this.addHandler(handler);
  //   });
  // }
}
