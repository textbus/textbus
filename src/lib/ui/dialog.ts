import { Inject, Injectable } from '@tanbo/di';

import { createElement } from './uikit/uikit';
import { UI_VIEWER_CONTAINER } from '../inject-tokens';

@Injectable()
export class Dialog {
  private elementRef: HTMLElement;
  private dialogWrapper: HTMLElement;
  private timer: any = null;

  constructor(@Inject(UI_VIEWER_CONTAINER) private viewer: HTMLElement) {
    this.elementRef = createElement('div', {
      classes: ['textbus-dialog'],
      children: [
        this.dialogWrapper = createElement('div', {
          classes: ['textbus-dialog-wrapper']
        })
      ]
    })
    viewer.appendChild(this.elementRef);
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
