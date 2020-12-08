import { Injectable } from '@tanbo/di';
import { createElement, createTextNode } from '../uikit/uikit';
import { EditorController } from '../editor-controller';

@Injectable()
export class LibSwitch {
  elementRef = createElement('button', {
    attrs: {
      type: 'button',
      title: '展开或收起组件库',
    },
    classes: ['textbus-lib-switch'],
    children: [createTextNode('组件库')]
  }) as HTMLButtonElement;

  set disabled(b: boolean) {
    this._disabled = b;
    this.elementRef.disabled = b;
    if (b) {
      this.expand = false;
      this.elementRef.classList.remove('textbus-lib-switch-active');
    }
  }

  get disabled() {
    return this._disabled;
  }

  set expand(b: boolean) {
    this._expand = b;
    if (b) {
      this.elementRef.classList.add('textbus-lib-switch-active');
    } else {
      this.elementRef.classList.remove('textbus-lib-switch-active');
    }
  }

  get expand() {
    return this._expand;
  }

  private _disabled = false;
  private _expand = false;

  constructor(private editorController: EditorController) {
    this.elementRef.addEventListener('click', () => {
      this.expand = !this.expand;
      editorController.expandComponentLibrary = this.expand;
    })
    editorController.onStateChange.subscribe(status => {
      this.expand = status.expandComponentLibrary;
    })
  }
}
