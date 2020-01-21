import { merge, Observable, Subject } from 'rxjs';

import { SelectionMatchDelta, createKeymapHTML, Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { EditableOptions, HighlightState, SelectConfig, SelectOptionConfig } from '../help';
import { Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { Hook } from '../../viewer/help';
import { Keymap } from '../../viewer/events';

export class SelectHandler implements Handler {
  readonly elementRef: HTMLElement;
  options: SelectOptionHandler[] = [];
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook: Hook;
  keymap: Keymap[] = [];
  private applyEventSource = new Subject<any>();
  private value = '';
  private textContainer: HTMLElement;
  private dropdown: Dropdown;

  constructor(private config: SelectConfig) {
    this.priority = config.priority;
    this.execCommand = config.execCommand;
    this.hook = config.hook;
    this.matcher = (config.match instanceof Matcher) ? config.match : new Matcher(config.match);
    this.editableOptions = config.editable;
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
              this.execCommand.updateValue(option.value);
              this.applyEventSource.next();
            }
          }
        })
      }

      item.onCheck.subscribe(v => {
        this.value = v.value;
        this.execCommand.updateValue(v.value);
        this.applyEventSource.next();
      });
      this.options.push(item);
    });

    this.dropdown = new Dropdown(
      dropdownInner,
      menu,
      merge(...this.options.map(item => item.onCheck)),
      config.tooltip
    );
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    if (selectionMatchDelta.abstractData) {
      const option = this.config.highlight(this.config.options, selectionMatchDelta.abstractData);
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
