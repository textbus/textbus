import { Observable, Subject } from 'rxjs';

import { SelectHandlerOption, SelectHandlerItemOption, Handler } from './help';
import { Matcher, MatchStatus } from '../matcher';
import { Formatter } from '../editor/fomatter/formatter';

export class SelectHandler {
  readonly host = document.createElement('span');
  options: SelectOptionHandler[] = [];

  constructor(private handler: SelectHandlerOption) {
    const dropdown = this.host;
    dropdown.classList.add('tanbo-editor-toolbar-select');

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.classList.add('tanbo-editor-toolbar-handler');
    dropdownButton.classList.add('tanbo-editor-toolbar-select-button');

    const dropdownInner = document.createElement('span');
    const dropdownArrow = document.createElement('span');
    dropdownInner.classList.add('tanbo-editor-toolbar-select-button-inner');
    dropdownArrow.classList.add('tanbo-editor-toolbar-select-button-caret');

    dropdownButton.appendChild(dropdownInner);
    dropdownButton.appendChild(dropdownArrow);
    let isSelfClick = false;
    document.addEventListener('click', () => {
      if (!isSelfClick) {
        dropdown.classList.remove('tanbo-editor-toolbar-select-open');
      }
      isSelfClick = false;
    });
    dropdownButton.addEventListener('click', () => {
      isSelfClick = true;
      dropdown.classList.toggle('tanbo-editor-toolbar-select-open');
    });

    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('tanbo-editor-toolbar-select-menu');
    handler.options.forEach(option => {
      const item = new SelectOptionHandler(option);
      dropdownMenu.appendChild(item.host);
      if (option.default) {
        dropdownInner.innerText = option.label;
      }
      item.onMatched.subscribe(option => {
        dropdownInner.innerText = option.label;
      });
      this.options.push(item);
    });

    dropdown.appendChild(dropdownButton);
    dropdown.appendChild(dropdownMenu);
  }
}

export class SelectOptionHandler implements Handler {
  readonly host = document.createElement('button');
  onAction: Observable<void>;
  onMatched: Observable<SelectHandlerItemOption>;
  matcher: Matcher;
  execCommand: Formatter;
  private eventSource = new Subject<void>();
  private matchedEvent = new Subject<SelectHandlerItemOption>();

  constructor(private option: SelectHandlerItemOption) {
    this.onAction = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();
    this.host.classList.add('tanbo-editor-toolbar-select-menu-item');
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
