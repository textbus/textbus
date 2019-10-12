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
    this.elementRef.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    this.elementRef.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;
    this.elementRef.classList.add('tanbo-editor-handler', ...(handler.classes || []));
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(matchDelta: MatchDelta): void {
    this.elementRef.disabled = matchDelta.disable;

    if (matchDelta.inSingleContainer || matchDelta.overlap) {
      this.elementRef.classList.add('tanbo-editor-handler-active');
    } else {
      this.elementRef.classList.remove('tanbo-editor-handler-active');
    }
  }
}
