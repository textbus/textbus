import { merge, Observable, Subject } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { SelectConfig, SelectOptionConfig } from '../help';
import { CommonMatchDelta, Matcher, MatchState } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { EditableOptions } from '../utils/abstract-data';
import { Hook } from '../../viewer/help';
import { Editor } from '../../editor';

export class SelectHandler implements Handler {
  readonly elementRef: HTMLElement;
  options: SelectOptionHandler[] = [];
  matcher: Matcher;
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook: Hook;
  private applyEventSource = new Subject<any>();
  private value = '';
  private textContainer: HTMLElement;
  private dropdown: Dropdown;

  constructor(private config: SelectConfig, public context: Editor) {
    this.priority = config.priority;
    this.execCommand = config.execCommand;
    this.hook = config.hook;
    this.matcher = (config.match instanceof Matcher) ? config.match : new Matcher(config.match);
    this.editableOptions = config.editable;
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
        dropdownInner.innerText = option.label || option.value;
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

  updateStatus(commonMatchDelta: CommonMatchDelta): void {
    if (commonMatchDelta.abstractData) {
      const option = this.config.highlight(this.config.options, commonMatchDelta.abstractData);
      if (option) {
        this.textContainer.innerText = option.label || option.value;
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        return;
      }
    }
    this.dropdown.highlight = false;
    this.dropdown.disabled = commonMatchDelta.state === MatchState.Disabled;
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

    this.elementRef.classList.add('tanbo-editor-toolbar-menu-item');
    this.elementRef.type = 'button';
    if (option.classes) {
      this.elementRef.classList.add(...(option.classes || []));
    }
    this.elementRef.innerText = option.label || option.value;
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option);
    });
  }
}
