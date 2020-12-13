import { Injectable } from '@tanbo/di';

import { createElement } from '../uikit/uikit';

@Injectable()
export class Dialog {
  elementRef: HTMLElement;
  private dialogWrapper: HTMLElement;

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
    setTimeout(() => {
      this.dialogWrapper.classList.add('textbus-dialog-wrapper-active');
    }, 200)
  }

  close() {
    this.dialogWrapper.classList.remove('textbus-dialog-wrapper-active');
    setTimeout(() => {
      this.elementRef.classList.remove('textbus-dialog-active');
      this.dialogWrapper.innerHTML = '';
    }, 200)
  }
}
