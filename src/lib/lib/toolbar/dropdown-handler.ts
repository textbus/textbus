import { Observable, Subject } from 'rxjs';

import { DropdownHandlerOption, Handler } from './help';
import { Matcher, MatchStatus } from '../matcher';
import { Dropdown } from './utils/dropdown';

export class DropdownHandler implements Handler {
  host: HTMLElement;
  matcher: Matcher;
  onAction: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private handler: DropdownHandlerOption) {
    this.onAction = this.eventSource.asObservable();
    this.matcher = new Matcher(handler.match);

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;
    dropdownButton.classList.add('tanbo-editor-handler', ...(handler.classes || []));

    this.host = new Dropdown(dropdownButton, handler.viewContents, handler.onHide).host;
  }

  updateStatus(status: MatchStatus): void {

  }
}
