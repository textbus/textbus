import { merge, Observable, Subject } from 'rxjs';

import { ActionSheetConfig, ActionConfig } from '../help';

import { Dropdown } from './utils/dropdown';
import { Handler } from './help';
import { Matcher } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { EditableOptions } from '../utils/cache-data';
import { map } from 'rxjs/operators';
import { Hook } from '../../viewer/help';
import { TBus } from '../../tbus';

export class ActionSheetHandler implements Handler {
  readonly elementRef: HTMLElement;
  onMatched: Observable<ActionConfig>;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook: Hook;

  private matchedEvent = new Subject<ActionConfig>();
  private options: ActionSheetOptionHandler[] = [];
  private eventSource = new Subject<any>();

  constructor(private config: ActionSheetConfig, public context: TBus) {
    this.priority = config.priority;
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();
    this.execCommand = config.execCommand;
    this.matcher = (config.match instanceof Matcher) ? config.match : new Matcher(config.match);
    this.hook = config.hook;

    const dropdownButton = document.createElement('span');
    dropdownButton.classList.add(...config.classes || []);

    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-toolbar-menu');

    config.actions.forEach(option => {
      const item = new ActionSheetOptionHandler(option);
      menu.appendChild(item.elementRef);
      this.options.push(item);
    });

    this.elementRef = new Dropdown(
      dropdownButton,
      menu,
      merge(...this.options.map(item => item.onCheck)).pipe(map(v => {
        config.execCommand.actionType = v;
        this.eventSource.next();
        return v;
      })),
      config.tooltip
    ).elementRef;
  }
}

export class ActionSheetOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private option: ActionConfig) {
    this.onCheck = this.eventSource.asObservable();
    this.elementRef.classList.add('tanbo-editor-toolbar-menu-item');
    this.elementRef.type = 'button';
    if (option.classes) {
      this.elementRef.classList.add(...(option.classes || []));
    }
    this.elementRef.innerText = option.label;
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option.value);
    });
  }
}
