import { Observable } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { DropdownConfig, EventDelegate } from '../help';
import { CommonMatchDelta, Matcher, MatchState } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { EditableOptions } from '../utils/cache-data';
import { Hook } from '../../viewer/help';
import { TBus } from '../../tbus';

export class DropdownHandler implements Handler {
  elementRef: HTMLElement;
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook: Hook;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;

  constructor(private config: DropdownConfig, private delegate: EventDelegate, public context: TBus) {
    this.onApply = config.onHide;
    this.priority = config.priority;
    this.editableOptions = config.editable;
    this.hook = config.hook;

    this.matcher = (config.match instanceof Matcher) ? config.match : new Matcher(config.match);
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

  updateStatus(commonMatchDelta: CommonMatchDelta): void {
    this.config.viewer.update(commonMatchDelta.cacheData);
    switch (commonMatchDelta.state) {
      case MatchState.Highlight:
        this.dropdown.highlight = true;
        break;
      case MatchState.Normal:
        this.dropdown.highlight = false;
        break;
      case MatchState.Disabled:
        this.dropdown.disabled = true;
        break
    }
  }
}
