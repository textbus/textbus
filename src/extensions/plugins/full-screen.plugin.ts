import { fromEvent, Subscription } from 'rxjs';
import { Injectable } from '@tanbo/di';

import { TBPlugin } from '../../lib/ui/plugin';
import { Layout } from '../../lib/ui/layout';
import { I18n } from '../../lib/i18n';
import { createElement } from '../../lib/ui/_api';

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

  constructor(private layout: Layout,
              private i18n: I18n) {
  }

  setup() {
    this.elementRef = createElement('div', {
      classes: ['textbus-full-screen'],
      children: [
        this.btn = createElement('button', {
          attrs: {
            type: 'button',
            title: this.i18n.get('plugins.fullScreen.switchFullScreen')
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
