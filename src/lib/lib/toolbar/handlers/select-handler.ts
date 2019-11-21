import { merge, Observable, Subject } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { SelectConfig, SelectOptionConfig } from '../help';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { EditableOptions } from '../utils/cache-data';

export class SelectHandler implements Handler {
  readonly elementRef: HTMLElement;
  options: SelectOptionHandler[] = [];
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  cacheDataConfig: EditableOptions;
  private applyEventSource = new Subject<any>();
  private value = '';
  private textContainer: HTMLElement;

  constructor(private config: SelectConfig) {
    this.priority = config.priority;
    this.execCommand = config.execCommand;
    this.matcher = new Matcher(config.match);
    this.cacheDataConfig = config.editable;
    this.onApply = this.applyEventSource.asObservable();

    const dropdownInner = document.createElement('span');
    this.textContainer = dropdownInner;
    dropdownInner.classList.add('tanbo-editor-select-button', ...config.classes || []);
    config.mini && dropdownInner.classList.add('tanbo-editor-select-button-mini');

    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-toolbar-menu');

    config.options.forEach(option => {
      const item = new SelectOptionHandler(option);
      menu.appendChild(item.elementRef);
      if (option.default) {
        dropdownInner.innerText = option.label;
      }

      item.onCheck.subscribe(v => {
        this.value = v.value;
        this.execCommand.updateValue(v.value);
        this.applyEventSource.next();
      });
      this.options.push(item);
    });

    this.elementRef = new Dropdown(
      dropdownInner,
      menu,
      merge(...this.options.map(item => item.onCheck)),
      config.tooltip
    ).elementRef;
  }

  updateStatus(commonMatchDelta: CommonMatchDelta): void {
    if (commonMatchDelta.cacheData) {
      const option = this.config.highlight(this.config.options, commonMatchDelta.cacheData);
      if (option) {
        this.textContainer.innerText = option.label;
        return;
      }
    }
    let defaultOption: SelectOptionConfig;
    for (const op of this.config.options) {
      if (op.default) {
        defaultOption = op;
        break;
      }
    }
    if (defaultOption) {
      this.textContainer.innerText = defaultOption.label;
    }
  }
}

export class SelectOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<SelectOptionConfig>;
  private eventSource = new Subject<SelectOptionConfig>();

  constructor(private option: SelectOptionConfig) {
    this.onCheck = this.eventSource.asObservable();

    this.elementRef.classList.add('tanbo-editor-toolbar-menu-item');
    this.elementRef.type = 'button';
    if (option.classes) {
      this.elementRef.classList.add(...(option.classes || []));
    }
    this.elementRef.innerText = option.label;
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option);
    });
  }
}
