import { Observable } from 'rxjs';

import { DropdownHandlerOption, Handler } from './help';
import { Matcher, MatchDelta } from '../matcher';
import { Dropdown } from './utils/dropdown';
import { EventDelegate } from '../help';
import { Formatter } from '../edit-frame/_api';

export class DropdownHandler implements Handler {
  elementRef: HTMLElement;
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Formatter;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;

  constructor(private handler: DropdownHandlerOption, private delegate: EventDelegate) {
    this.onApply = handler.onHide;

    this.matcher = new Matcher(handler.match);
    this.execCommand = handler.execCommand;
    this.dropdownButton.innerText = handler.label || '';

    this.dropdownButton.classList.add(...(handler.classes || []));

    this.dropdown = new Dropdown(
      this.dropdownButton,
      handler.viewer.elementRef,
      handler.onHide,
      handler.tooltip
    );
    this.elementRef = this.dropdown.elementRef;

    if (typeof handler.viewer.setEventDelegator === 'function') {
      handler.viewer.setEventDelegator(delegate);
    }
  }

  updateStatus(matchDelta: MatchDelta): void {
    this.dropdown.disabled = matchDelta.disable;
    if (matchDelta.inSingleContainer) {
      this.dropdown.highlight = true;
      this.handler.viewer.updateStateByElement(matchDelta.scopeContainer as HTMLElement);
    } else if (matchDelta.overlap) {
      this.dropdown.highlight = true;
      this.handler.viewer.updateStateByElement(matchDelta.range.cloneContents().children[0] as HTMLElement);
    } else {
      this.dropdown.highlight = false;
      if (typeof this.handler.viewer.reset === 'function') {
        this.handler.viewer.reset();
      }
    }
  }
}
