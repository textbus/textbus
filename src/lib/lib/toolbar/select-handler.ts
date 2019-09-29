import { merge, Observable, Subject } from 'rxjs';

import { SelectHandlerOption, SelectHandlerItemOption, Handler } from './help';
import { Matcher, MatchStatus } from '../matcher';
import { Formatter } from '../frame/fomatter/formatter';
import { Dropdown } from './utils/dropdown';

export class SelectHandler {
  readonly host: HTMLElement;
  options: SelectOptionHandler[] = [];

  constructor(private handler: SelectHandlerOption) {

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.classList.add('tanbo-editor-handler');
    dropdownButton.classList.add('tanbo-editor-select-button');

    const dropdownInner = document.createElement('span');
    const dropdownArrow = document.createElement('span');
    dropdownInner.classList.add('tanbo-editor-select-button-inner');
    dropdownArrow.classList.add('tanbo-editor-select-button-caret');

    dropdownButton.appendChild(dropdownInner);
    dropdownButton.appendChild(dropdownArrow);

    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-select-menu');

    handler.options.forEach(option => {
      const item = new SelectOptionHandler(option);
      menu.appendChild(item.host);
      if (option.default) {
        dropdownInner.innerText = option.label;
      }
      item.onMatched.subscribe(option => {
        dropdownInner.innerText = option.label;
      });
      this.options.push(item);
    });

    this.host = new Dropdown(
      dropdownButton,
      menu,
      merge(...this.options.map(item => item.onCompleted))
    ).host;
  }
}

export class SelectOptionHandler implements Handler {
  readonly host = document.createElement('button');
  onCompleted: Observable<void>;
  onMatched: Observable<SelectHandlerItemOption>;
  matcher: Matcher;
  execCommand: Formatter;
  private eventSource = new Subject<void>();
  private matchedEvent = new Subject<SelectHandlerItemOption>();

  constructor(private option: SelectHandlerItemOption) {
    this.onCompleted = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();
    this.host.classList.add('tanbo-editor-select-menu-item');
    this.host.type = 'button';
    if (option.classes) {
      this.host.classList.add(...(option.classes || []));
    }
    this.host.innerText = option.label;
    this.host.addEventListener('click', () => {
      this.eventSource.next();
    });
    this.execCommand = option.execCommand;
    this.matcher = new Matcher(option.match);
  }

  updateStatus(status: MatchStatus): void {
    if (status.inContainer || status.matchAllChild) {
      this.matchedEvent.next(this.option);
    }
  }
}
