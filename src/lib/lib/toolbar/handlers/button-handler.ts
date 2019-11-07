import { Observable, Subject } from 'rxjs';

import { ButtonConfig } from '../help';
import { Handler } from './help';
import { Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';

export class ButtonHandler implements Handler {
  readonly elementRef = document.createElement('button');
  matcher: Matcher;
  onApply: Observable<void>;
  execCommand: Commander;
  private eventSource = new Subject<void>();

  constructor(private config: ButtonConfig) {
    this.matcher = new Matcher(config.match);
    this.execCommand = config.execCommand;
    this.onApply = this.eventSource.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = config.tooltip || '';
    this.elementRef.classList.add('tanbo-editor-handler');
    const inner = document.createElement('span');
    inner.innerText = config.label || '';
    inner.classList.add(...(config.classes || []));
    this.elementRef.appendChild(inner);
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(h: boolean): void {
    if (h) {
      this.elementRef.classList.add('tanbo-editor-handler-active');
    } else {
      this.elementRef.classList.remove('tanbo-editor-handler-active');
    }
  }

  // updateStatus(matchDelta: MatchDelta): void {
  //   this.elementRef.disabled = matchDelta.disable;
  //
  //   if (matchDelta.overlap) {
  //     this.elementRef.classList.add('tanbo-editor-handler-active');
  //   } else {
  //     this.elementRef.classList.remove('tanbo-editor-handler-active');
  //   }
  // }
}
