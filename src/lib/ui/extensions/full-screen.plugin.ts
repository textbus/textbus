import { fromEvent, Subscription } from 'rxjs';
import { Injectable } from '@tanbo/di';

import { TBPlugin } from '../plugin';
import { Layout } from '../layout';

@Injectable()
export class FullScreenPlugin implements TBPlugin {
  set full(b: boolean) {
    this._full = b;
    this.icon.className = b ? 'textbus-icon-shrink' : 'textbus-icon-enlarge';
  }

  get full() {
    return this._full;
  }

  private elementRef = document.createElement('button');

  private _full = false;
  private icon = document.createElement('span');
  private subs: Subscription[] = [];

  constructor(private layout: Layout) {
  }

  setup() {
    this.elementRef.type = 'button';
    this.elementRef.title = '切换全屏模式';
    this.elementRef.className = 'textbus-status-bar-btn textbus-full-screen';
    this.elementRef.appendChild(this.icon);

    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.full = !this.full;
        this.fullScreen(this.full);
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
