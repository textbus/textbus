import { Observable } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { DropdownConfig, EventDelegate, HighlightState } from '../help';
import { SelectionMatchDelta } from '../matcher/matcher';

export class DropdownHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;

  constructor(private config: DropdownConfig,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement) {
    this.onApply = config.onHide;
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
    if (config.viewer.freezeState instanceof Observable) {
      config.viewer.freezeState.subscribe(b => {
        this.dropdown.freeze = b;
      });
    }
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    this.config.viewer.update(selectionMatchDelta.matchData);
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
