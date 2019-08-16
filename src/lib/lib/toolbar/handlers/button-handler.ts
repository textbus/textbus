import { ButtonHandlerOption } from '../help';
import { Observable, Subject } from 'rxjs';
import { Handler } from './help';
import { Matcher, MatchStatus } from '../../matcher';

export class ButtonHandler implements Handler {
  readonly host = document.createElement('button');
  matcher: Matcher;
  onAction: Observable<void>;
  private eventSource = new Subject<void>();

  constructor(private handler: ButtonHandlerOption) {
    this.matcher = new Matcher(handler.match);
    this.onAction = this.eventSource.asObservable();
    this.host.type = 'button';
    this.host.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    this.host.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;
    this.host.classList.add('tanbo-editor-toolbar-handler', ...(handler.classes || []));
    this.host.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(status: MatchStatus): void {
    if (status.inContainer || status.matchAllChild) {
      this.host.classList.add('tanbo-editor-toolbar-handler-active');
    } else {
      this.host.classList.remove('tanbo-editor-toolbar-handler-active');
    }
  }
}
