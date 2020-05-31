import { Observable, Subject } from 'rxjs';

import { ButtonConfig, HighlightState } from '../help';
import {  Tool } from './help';
import { KeymapAction } from '../../viewer/_api';

export class ButtonHandler implements Tool {
  readonly elementRef = document.createElement('button');
  onApply: Observable<void>;
  keymapAction: KeymapAction;
  private eventSource = new Subject<void>();

  constructor(private config: ButtonConfig) {
    this.onApply = this.eventSource.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = config.tooltip || '';
    this.elementRef.classList.add('tbus-handler');
    const inner = document.createElement('span');
    inner.innerText = config.label || '';
    inner.classList.add(...(config.classes || []));
    this.elementRef.appendChild(inner);
    if (config.keymap) {
      this.keymapAction = {
        keymap: config.keymap,
        action: () => {
          if (!this.elementRef.disabled) {
            this.eventSource.next();
          }
        }
      };
      this.elementRef.dataset.keymap = JSON.stringify(config.keymap);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(selectionMatchDelta: any): void {
    switch (selectionMatchDelta.state) {
      case HighlightState.Highlight:
        this.elementRef.disabled = false;
        this.elementRef.classList.add('tbus-handler-active');
        break;
      case HighlightState.Normal:
        this.elementRef.disabled = false;
        this.elementRef.classList.remove('tbus-handler-active');
        break;
      case HighlightState.Disabled:
        this.elementRef.classList.remove('tbus-handler-active');
        this.elementRef.disabled = true;
        break
    }
  }
}
