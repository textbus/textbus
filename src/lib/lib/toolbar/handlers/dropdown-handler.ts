import { Observable } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { DropdownConfig, EventDelegate } from '../help';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { CacheDataConfig } from '../utils/cache-data';

export class DropdownHandler implements Handler {
  elementRef: HTMLElement;
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  cacheDataConfig: CacheDataConfig;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;

  constructor(private config: DropdownConfig, private delegate: EventDelegate) {
    this.onApply = config.onHide;
    this.priority = config.priority;
    this.cacheDataConfig = config.cacheData;

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

  updateStatus(commonMatchDelta: CommonMatchDelta): void {
    this.config.viewer.update(commonMatchDelta.cacheData);
    if (commonMatchDelta.overlap) {
      this.dropdownButton.classList.add('tanbo-editor-handler-active');
    } else {
      this.dropdownButton.classList.remove('tanbo-editor-handler-active');
    }
  }
}
