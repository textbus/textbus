import { Injectable } from '@tanbo/di';

import { createElement } from '../uikit/uikit';

@Injectable()
export class Dialog {
  elementRef: HTMLElement;
  private dialogWrapper: HTMLElement;
  private timer: any = null;

  constructor() {
    this.elementRef = createElement('div', {
      classes: ['textbus-dialog'],
      children: [
        this.dialogWrapper = createElement('div', {
          classes: ['textbus-dialog-wrapper']
        })
      ]
    })
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

  destroy() {
    clearTimeout(this.timer);
  }
}
