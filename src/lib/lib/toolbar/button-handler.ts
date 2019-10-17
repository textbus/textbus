import { Observable, Subject } from 'rxjs';

import { ButtonHandlerOption, Handler } from './help';
import { Matcher, MatchDelta } from '../matcher';
import { Formatter } from '../edit-frame/_api';

export class ButtonHandler implements Handler {
  readonly elementRef = document.createElement('button');
  matcher: Matcher;
  onApply: Observable<void>;
  execCommand: Formatter;
  private eventSource = new Subject<void>();

  constructor(private handler: ButtonHandlerOption) {
    this.matcher = new Matcher(handler.match);
    this.execCommand = handler.execCommand;
    this.onApply = this.eventSource.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = handler.tooltip || '';
    this.elementRef.classList.add('tanbo-editor-handler');
    const inner = document.createElement('span');
    inner.innerText = handler.label || '';
    inner.classList.add(...(handler.classes || []));
    this.elementRef.appendChild(inner);
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(matchDelta: MatchDelta): void {
    this.elementRef.disabled = matchDelta.disable;

    if (matchDelta.overlap) {
      this.elementRef.classList.add('tanbo-editor-handler-active');
    } else {
      this.elementRef.classList.remove('tanbo-editor-handler-active');
    }
  }
}
