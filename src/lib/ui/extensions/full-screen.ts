import { fromEvent, Subscription } from 'rxjs';
import { Injector } from '@tanbo/di';

import { TextBusUI } from '../../ui';
import { UI_BOTTOM_CONTAINER } from '../../inject-tokens';

export class FullScreen implements TextBusUI {
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

  setup(injector: Injector) {
    this.elementRef.type = 'button';
    this.elementRef.title = '切换全屏模式';
    this.elementRef.className = 'textbus-status-bar-btn textbus-full-screen';
    this.elementRef.appendChild(this.icon);

    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.full = !this.full;
      })
    )
    this.full = false;
    injector.get(UI_BOTTOM_CONTAINER).appendChild(this.elementRef);
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
