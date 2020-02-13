import { Observable } from 'rxjs';

import { SelectionMatchDelta, Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { DropdownConfig, EditableOptions, EventDelegate, HighlightState } from '../help';
import { Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { Hook } from '../../viewer/help';

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

  constructor(private config: DropdownConfig,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement) {
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
      config.tooltip,
      stickyElement
    );
    this.elementRef = this.dropdown.elementRef;

    if (typeof config.viewer.setEventDelegator === 'function') {
      config.viewer.setEventDelegator(delegate);
    }
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    this.config.viewer.update(selectionMatchDelta.abstractData);
    switch (selectionMatchDelta.state) {
      case HighlightState.Highlight:
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        break;
      case HighlightState.Normal:
        this.dropdown.disabled = false;
        this.dropdown.highlight = false;
        break;
      case HighlightState.Disabled:
        this.dropdown.disabled = true;
        this.dropdown.highlight = false;
        break
    }
  }
}
