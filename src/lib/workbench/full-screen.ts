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

  constructor(private editorController: EditorController) {
    this.elementRef.type = 'button';
    this.elementRef.title = '切换全屏模式';
    this.elementRef.className = 'textbus-full-screen';
    this.elementRef.appendChild(this.icon);

    this.elementRef.addEventListener('click', () => {
      this.full = !this.full;
      this.editorController.fullScreen = this.full;
    });
    editorController.onStateChange.subscribe(status => {
      this.full = status.fullScreen;
    })
  }
}
