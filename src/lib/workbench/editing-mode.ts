import { Injectable } from '@tanbo/di';
import { fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { EditorController } from '../editor-controller';

@Injectable()
export class EditingMode {
  elementRef = document.createElement('button');

  set sourceCode(b: boolean) {
    this._sourceCode = b;
    if (b) {
      this.elementRef.classList.add('textbus-status-bar-btn-active');
    } else {
      this.elementRef.classList.remove('textbus-status-bar-btn-active');
    }
    this.elementRef.title = b ? '切换为富文本编辑模式' : '切换为源代码编辑模式';
  }

  get sourceCode() {
    return this._sourceCode;
  }

  private _sourceCode = false;
  private icon = document.createElement('span');
  private subs: Subscription[] = [];

  constructor(private editorController: EditorController) {
    this.elementRef.type = 'button';
    this.elementRef.title = '切换为源代码编辑模式';
    this.elementRef.className = 'textbus-status-bar-btn';
    this.icon.className = 'textbus-icon-code';
    this.elementRef.appendChild(this.icon);

    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.sourceCode = !this.sourceCode;
        this.editorController.sourceCodeMode = this.sourceCode;
      }),
      editorController.onStateChange.pipe(map(s => {
        return s.sourceCodeMode;
      }), distinctUntilChanged()).subscribe(b => {
        this.sourceCode = b;
      })
    )
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
