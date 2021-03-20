import { Injectable } from '@tanbo/di';
import { fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { createElement, createTextNode } from '../uikit/uikit';
import { EditorController } from '../editor-controller';

@Injectable()
export class LibSwitch {
  elementRef = createElement('button', {
    attrs: {
      type: 'button',
      title: '展开或收起组件库',
    },
    classes: ['textbus-status-bar-btn'],
    children: [
      createElement('span', {
        classes: ['textbus-icon-components']
      }),
      createTextNode(' 组件库')
    ]
  }) as HTMLButtonElement;

  set expand(b: boolean) {
    this._expand = b;
    if (b) {
      this.elementRef.classList.add('textbus-status-bar-btn-active');
    } else {
      this.elementRef.classList.remove('textbus-status-bar-btn-active');
    }
  }

  get expand() {
    return this._expand;
  }

  private _expand = false;

  private subs: Subscription[] = [];

  constructor(private editorController: EditorController) {
    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.expand = !this.expand;
        editorController.expandComponentLibrary = this.expand;
      }),
      editorController.onStateChange.pipe(map(s => {
        return s.expandComponentLibrary;
      }), distinctUntilChanged()).subscribe(b => {
        this.expand = b;
      })
    )
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
