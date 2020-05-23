import { merge, Observable, Subject } from 'rxjs';

import { createKeymapHTML, Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { HighlightState, SelectConfig, SelectOptionConfig } from '../help';
import { Keymap } from '../../viewer/events';
import { SelectionMatchDelta } from '../matcher/matcher';

export class SelectHandler implements Handler {
  readonly elementRef: HTMLElement;
  options: SelectOptionHandler[] = [];
  onApply: Observable<any>;
  keymap: Keymap[] = [];
  private applyEventSource = new Subject<any>();
  private value = '';
  private textContainer: HTMLElement;
  private dropdown: Dropdown;

  constructor(private config: SelectConfig,
              private stickyElement: HTMLElement) {
    this.onApply = this.applyEventSource.asObservable();

    const dropdownInner = document.createElement('span');
    this.textContainer = dropdownInner;
    dropdownInner.classList.add('tbus-select-button', ...config.classes || []);
    config.mini && dropdownInner.classList.add('tbus-select-button-mini');

    const menu = document.createElement('div');
    menu.classList.add('tbus-toolbar-menu');

    config.options.forEach(option => {
      const item = new SelectOptionHandler(option);
      menu.appendChild(item.elementRef);
      if (option.default) {
        dropdownInner.innerText = option.label || option.value;
      }

      if (option.keymap) {
        this.keymap.push({
          config: option.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              this.value = option.value;
              config.execCommand.updateValue(option.value);
              this.applyEventSource.next();
            }
          }
        })
      }

      item.onCheck.subscribe(v => {
        this.value = v.value;
        config.execCommand.updateValue(v.value);
        this.applyEventSource.next();
      });
      this.options.push(item);
    });

    this.dropdown = new Dropdown(
      dropdownInner,
      menu,
      merge(...this.options.map(item => item.onCheck)),
      config.tooltip,
      stickyElement
    );
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    if (selectionMatchDelta.matchData) {
      const option = this.config.highlight(this.config.options, selectionMatchDelta.matchData);
      if (option) {
        this.textContainer.innerText = option.label || option.value;
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        return;
      }
    }
    this.dropdown.highlight = false;
    this.dropdown.disabled = selectionMatchDelta.state === HighlightState.Disabled;
    let defaultOption: SelectOptionConfig;
    for (const op of this.config.options) {
      if (op.default) {
        defaultOption = op;
        break;
      }
    }
    if (defaultOption) {
      this.textContainer.innerText = defaultOption.label || defaultOption.value;
    }
  }
}

export class SelectOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<SelectOptionConfig>;
  private eventSource = new Subject<SelectOptionConfig>();

  constructor(private option: SelectOptionConfig) {
    this.onCheck = this.eventSource.asObservable();

    this.elementRef.classList.add('tbus-toolbar-menu-item');
    this.elementRef.type = 'button';

    const label = document.createElement('span');
    label.classList.add('tbus-toolbar-menu-item-label');
    if (option.classes) {
      label.classList.add(...(option.classes || []));
    }
    label.innerText = option.label || option.value;
    this.elementRef.appendChild(label);
    if (option.keymap) {
      const keymapHTML = document.createElement('span');
      keymapHTML.classList.add('tbus-toolbar-menu-item-keymap');
      keymapHTML.innerHTML = createKeymapHTML(option.keymap);
      this.elementRef.appendChild(keymapHTML);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option);
    });
  }
}
