import { fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Injectable } from '@tanbo/di';

import { EditorController } from '../editor-controller';

@Injectable()
export class FullScreen {
  elementRef = document.createElement('button');

  set full(b: boolean) {
    this._full = b;
    this.icon.className = b ? 'textbus-icon-shrink' : 'textbus-icon-enlarge';
  }

  get full() {
    return this._full;
  }

  private _full = false;
  private icon = document.createElement('span');
  private subs: Subscription[] = [];

  constructor(private editorController: EditorController) {
    this.elementRef.type = 'button';
    this.elementRef.title = '切换全屏模式';
    this.elementRef.className = 'textbus-full-screen';
    this.elementRef.appendChild(this.icon);
    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.full = !this.full;
        this.editorController.fullScreen = this.full;
      }),
      editorController.onStateChange.pipe(map(s => {
        return s.fullScreen;
      }), distinctUntilChanged()).subscribe(b => {
        this.full = b;
      })
    )
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
