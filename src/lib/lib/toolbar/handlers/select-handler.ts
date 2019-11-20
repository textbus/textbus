import { merge, Observable, Subject } from 'rxjs';

import { Handler } from './help';
import { Dropdown } from './utils/dropdown';
import { CacheDataConfig, SelectConfig, SelectOptionConfig } from '../help';
import { Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';

export class SelectHandler implements Handler {
  readonly elementRef: HTMLElement;
  options: SelectOptionHandler[] = [];
  matcher: Matcher = new Matcher();
  onApply: Observable<any>;
  execCommand: Commander;
  priority: number;
  cacheDataConfig: CacheDataConfig;
  private applyEventSource = new Subject<any>();

  constructor(private config: SelectConfig) {
    this.priority = config.priority;
    this.execCommand = config.execCommand;
    this.cacheDataConfig = config.cacheData;
    this.onApply = this.applyEventSource.asObservable();

    const dropdownInner = document.createElement('span');
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

  updateStatus(h: boolean): void {
  }
}

export class SelectOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<SelectOptionConfig>;
  matcher: Matcher;
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
    this.matcher = new Matcher(option.match);
  }
}
