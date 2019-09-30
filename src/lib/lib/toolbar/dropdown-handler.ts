import { Observable } from 'rxjs';

import { DropdownHandlerOption, Handler } from './help';
import { Matcher, MatchStatus } from '../matcher';
import { Dropdown } from './utils/dropdown';
import { EventDelegate } from '../help';

export class DropdownHandler implements Handler {
  host: HTMLElement;
  matcher: Matcher;
  onCompleted: Observable<any>;
  private dropdownButton = document.createElement('button');
  private dropdown: Dropdown;

  constructor(private handler: DropdownHandlerOption, private delegate: EventDelegate) {
    this.onCompleted = handler.onHide;

    this.matcher = new Matcher(handler.match);
    this.dropdownButton.type = 'button';
    this.dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    this.dropdownButton.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;

    this.dropdownButton.classList.add('tanbo-editor-handler', ...(handler.classes || []));
    this.dropdown = new Dropdown(this.dropdownButton, handler.viewer.host, handler.onHide);
    this.host = this.dropdown.host;

    if (typeof handler.viewer.setEventDelegator === 'function') {
      handler.viewer.setEventDelegator(delegate);
    }
  }

  updateStatus(status: MatchStatus): void {
    if (status.inContainer) {
      this.dropdownButton.classList.add('tanbo-editor-handler-active');
      this.handler.viewer.updateStateByElement(status.container as HTMLElement);
    } else {
      this.dropdownButton.classList.remove('tanbo-editor-handler-active');
    }
  }
}
