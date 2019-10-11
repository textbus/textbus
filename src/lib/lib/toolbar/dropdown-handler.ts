import { Observable } from 'rxjs';

import { DropdownHandlerOption, Handler } from './help';
import { Matcher, MatchDelta } from '../matcher';
import { Dropdown } from './utils/dropdown';
import { EventDelegate } from '../help';

export class DropdownHandler implements Handler {
  elementRef: HTMLElement;
  matcher: Matcher;
  onApply: Observable<any>;
  private dropdownButton = document.createElement('button');
  private dropdown: Dropdown;

  constructor(private handler: DropdownHandlerOption, private delegate: EventDelegate) {
    this.onApply = handler.onHide;

    this.matcher = new Matcher(handler.match);
    this.dropdownButton.type = 'button';
    this.dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    this.dropdownButton.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;

    this.dropdownButton.classList.add('tanbo-editor-handler', ...(handler.classes || []));
    this.dropdown = new Dropdown(this.dropdownButton, handler.viewer.elementRef, handler.onHide);
    this.elementRef = this.dropdown.elementRef;

    if (typeof handler.viewer.setEventDelegator === 'function') {
      handler.viewer.setEventDelegator(delegate);
    }
  }

  updateStatus(matchDelta: MatchDelta): void {
    this.dropdownButton.disabled = matchDelta.disable;
    if (matchDelta.inSingleContainer) {
      this.dropdownButton.classList.add('tanbo-editor-handler-active');
      this.handler.viewer.updateStateByElement(matchDelta.container as HTMLElement);
    } else if (matchDelta.overlap) {
      this.dropdownButton.classList.add('tanbo-editor-handler-active');
      this.handler.viewer.updateStateByElement(matchDelta.range.cloneContents().children[0] as HTMLElement);
    } else {
      this.dropdownButton.classList.remove('tanbo-editor-handler-active');
      if (typeof this.handler.viewer.reset === 'function') {
        this.handler.viewer.reset();
      }
    }
  }
}
