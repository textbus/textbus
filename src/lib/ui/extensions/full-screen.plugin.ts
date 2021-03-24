import { fromEvent, Subscription } from 'rxjs';
import { Injectable } from '@tanbo/di';

import { TBPlugin } from '../plugin';
import { Layout } from '../layout';
import { createElement } from '../uikit/uikit';

@Injectable()
export class FullScreenPlugin implements TBPlugin {
  set full(b: boolean) {
    this._full = b;
    this.fullScreen(b);
    this.icon.className = b ? 'textbus-icon-shrink' : 'textbus-icon-enlarge';
  }

  get full() {
    return this._full;
  }

  private elementRef: HTMLElement;
  private btn: HTMLButtonElement;
  private icon: HTMLElement;

  private _full = false;
  private subs: Subscription[] = [];

  constructor(private layout: Layout) {
  }

  setup() {
    this.elementRef = createElement('div', {
      classes: ['textbus-full-screen'],
      children: [
        this.btn = createElement('button', {
          attrs: {
            type: 'button',
            title: '切换全屏模式'
          },
          classes: ['textbus-status-bar-btn'],
          children: [
            this.icon = createElement('span')
          ]
        }) as HTMLButtonElement
      ]
    })

    this.subs.push(
      fromEvent(this.btn, 'click').subscribe(() => {
        this.full = !this.full;
      })
    )
    this.full = false;
    this.layout.bottomBar.appendChild(this.elementRef);
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private fullScreen(is: boolean) {
    is ?
      this.layout.container.classList.add('textbus-container-full-screen') :
      this.layout.container.classList.remove('textbus-container-full-screen')
  }
}
