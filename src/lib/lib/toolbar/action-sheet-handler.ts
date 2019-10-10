import { merge, Observable, Subject } from 'rxjs';

import { ActionSheetHandlerOption, Handler, SelectHandlerItemOption } from './help';
import { Matcher, MatchDescription } from '../matcher';
import { Formatter } from '../edit-frame/fomatter/formatter';
import { Dropdown } from './utils/dropdown';

export class ActionSheetHandler {
  readonly elementRef: HTMLElement;
  options: ActionSheetOptionHandler[] = [];

  constructor(private handler: ActionSheetHandlerOption) {

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.classList.add('tanbo-editor-handler', ...handler.classes || []);

    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-action-sheet-menu');

    handler.actions.forEach(option => {
      const item = new ActionSheetOptionHandler(option);
      menu.appendChild(item.elementRef);
      this.options.push(item);
    });

    this.elementRef = new Dropdown(
      dropdownButton,
      menu,
      merge(...this.options.map(item => item.onApply))
    ).elementRef;
  }
}

export class ActionSheetOptionHandler implements Handler {
  readonly elementRef = document.createElement('button');
  onApply: Observable<void>;
  onMatched: Observable<SelectHandlerItemOption>;
  matcher: Matcher;
  execCommand: Formatter;
  private eventSource = new Subject<void>();
  private matchedEvent = new Subject<SelectHandlerItemOption>();

  constructor(private option: SelectHandlerItemOption) {
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();
    this.elementRef.classList.add('tanbo-editor-action-sheet-item');
    this.elementRef.type = 'button';
    if (option.classes) {
      this.elementRef.classList.add(...(option.classes || []));
    }
    this.elementRef.innerText = option.label;
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
    this.execCommand = option.execCommand;
    this.matcher = new Matcher(option.match);
  }

  updateStatus(status: MatchDescription): void {
    this.elementRef.disabled = status.disable;
    if (status.inContainer || status.matchAllChild) {
      this.matchedEvent.next(this.option);
    }
  }
}
