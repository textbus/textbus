import { Injectable } from '@tanbo/di';

import { createElement } from './uikit/uikit';
import { TBPlugin } from './plugin';
import { Layout } from './layout';

@Injectable()
export class UIDialog implements TBPlugin {
  private elementRef: HTMLElement;
  private dialogWrapper: HTMLElement;
  private timer: any = null;

  constructor(private layout: Layout) {
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
    this.layout.viewer.appendChild(this.elementRef);
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
  }
}
