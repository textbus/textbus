import { Observable } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { DropdownConfig, EventDelegate } from '../help';
import { Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';

export class DropdownHandler implements Handler {
  elementRef: HTMLElement;
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;

  constructor(private config: DropdownConfig, private delegate: EventDelegate) {
    this.onApply = config.onHide;
    this.priority = config.priority;

    this.matcher = new Matcher(config.match);
    this.execCommand = config.execCommand;
    this.dropdownButton.innerText = config.label || '';

    this.dropdownButton.classList.add(...(config.classes || []));

    this.dropdown = new Dropdown(
      this.dropdownButton,
      config.viewer.elementRef,
      config.onHide,
      config.tooltip
    );
    this.elementRef = this.dropdown.elementRef;

    if (typeof config.viewer.setEventDelegator === 'function') {
      config.viewer.setEventDelegator(delegate);
    }
  }

  updateStatus(h: boolean): void {
  }

  // updateStatus(matchDelta: MatchDelta): void {
  //   this.dropdown.disabled = matchDelta.disable;
  //   if (matchDelta.inSingleContainer) {
  //     this.dropdown.highlight = true;
  //     this.handler.viewer.updateStateByElement(matchDelta.scopeContainer as HTMLElement);
  //   } else if (matchDelta.overlap) {
  //     this.dropdown.highlight = true;
  //     this.handler.viewer.updateStateByElement(matchDelta.range.cloneContents().children[0] as HTMLElement);
  //   } else {
  //     this.dropdown.highlight = false;
  //     if (typeof this.handler.viewer.reset === 'function') {
  //       this.handler.viewer.reset();
  //     }
  //   }
  // }
}
