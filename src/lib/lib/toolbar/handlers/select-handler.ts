import { SelectHandlerOption, SelectHandlerItemOption } from '../help';
import { Observable, Subject } from 'rxjs';
import { Handler } from './help';
import { Matcher, MatchStatus } from '../../matcher';

export class SelectHandler implements Handler {
  readonly host = document.createElement('span');
  matcher: Matcher[];
  onAction: Observable<SelectHandlerItemOption>;
  private eventSource = new Subject<SelectHandlerItemOption>();

  constructor(private handler: SelectHandlerOption) {
    this.onAction = this.eventSource.asObservable();
    const dropdown = this.host;
    dropdown.classList.add('tanbo-editor-toolbar-dropdown');

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.classList.add('tanbo-editor-toolbar-handler');
    dropdownButton.classList.add('tanbo-editor-toolbar-dropdown-button');

    const dropdownInner = document.createElement('span');
    const dropdownArrow = document.createElement('span');
    dropdownArrow.classList.add('tanbo-editor-toolbar-dropdown-button-caret');

    dropdownButton.appendChild(dropdownInner);
    dropdownButton.appendChild(dropdownArrow);
    let isSelfClick = false;
    document.addEventListener('click', () => {
      if (!isSelfClick) {
        dropdown.classList.remove('tanbo-editor-toolbar-dropdown-open');
      }
      isSelfClick = false;
    });
    dropdownButton.addEventListener('click', () => {
      isSelfClick = true;
      dropdown.classList.toggle('tanbo-editor-toolbar-dropdown-open');
    });

    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('tanbo-editor-toolbar-dropdown-menu');
    handler.options.forEach(option => {
      const item = document.createElement('button');
      item.classList.add('tanbo-editor-toolbar-dropdown-menu-item');
      item.type = 'button';
      if (option.classes) {
        item.classList.add(...(option.classes || []));
      }
      item.innerText = option.label;
      item.addEventListener('click', () => {
        this.eventSource.next(option)
      });
      dropdownMenu.appendChild(item);
      this.matcher.push(new Matcher(option.match));
    });

    dropdown.appendChild(dropdownButton);
    dropdown.appendChild(dropdownMenu);
    this.host.appendChild(dropdown);
  }

  updateStatus(status: MatchStatus[]): void {
    // if (status.container || status.matchAllChild) {
    //   this.host.classList.add('tanbo-editor-toolbar-handler-active');
    // } else {
    //   this.host.classList.remove('tanbo-editor-toolbar-handler-active');
    // }
  }
}
