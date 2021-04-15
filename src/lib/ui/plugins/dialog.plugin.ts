import { Injectable } from '@tanbo/di';

import { createElement } from '../_utils/uikit';
import { TBPlugin } from '../plugin';
import { Layout } from '../layout';
import { EditorController } from '../../editor-controller';
import { Subscription } from 'rxjs';

@Injectable()
export class UIDialog implements TBPlugin {
  private elementRef: HTMLElement;
  private dialogWrapper: HTMLElement;
  private timer: any = null;

  private subs: Subscription[] = [];

  constructor(private layout: Layout,
              private editorController: EditorController) {
  }

  setup() {
    this.elementRef = createElement('div', {
      classes: ['textbus-dialog'],
      children: [
        this.dialogWrapper = createElement('div', {
          classes: ['textbus-dialog-wrapper']
        })
      ]
    })
    this.layout.workbench.appendChild(this.elementRef);
    this.subs.push(this.editorController.onStateChange.subscribe(status => {
      if (status.readonly || status.sourcecodeMode) {
        this.close();
      }
    }))
  }

  dialog(element: HTMLElement) {
    this.dialogWrapper.innerHTML = '';
    this.dialogWrapper.appendChild(element);
    this.elementRef.classList.add('textbus-dialog-active');
    this.timer = setTimeout(() => {
      this.dialogWrapper.classList.add('textbus-dialog-wrapper-active');
    }, 200)
  }

  close() {
    this.dialogWrapper.classList.remove('textbus-dialog-wrapper-active');
    this.timer = setTimeout(() => {
      this.elementRef.classList.remove('textbus-dialog-active');
      this.dialogWrapper.innerHTML = '';
    }, 200)
  }

  onDestroy() {
    clearTimeout(this.timer);
    this.subs.forEach(i => i.unsubscribe());
  }
}
