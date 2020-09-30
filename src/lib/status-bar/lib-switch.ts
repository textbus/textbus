import { createElement, createTextNode } from '../uikit/uikit';
import { Observable, Subject } from 'rxjs';

export class LibSwitch {
  onSwitch: Observable<boolean>;
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
      this.switchEvent.next(false);
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
  private switchEvent = new Subject<boolean>();

  constructor() {
    this.onSwitch = this.switchEvent.asObservable();

    this.elementRef.addEventListener('click', () => {
      this.expand = !this.expand;
      this.switchEvent.next(this.expand);
    })
  }
}
