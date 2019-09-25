import { DropdownHandlerOption } from '../help';
import { Handler } from './help';
import { Observable, Subject } from 'rxjs';
import { Matcher, MatchStatus } from '../../matcher';

export class DropdownHandler implements Handler {
  host = document.createElement('span');
  matcher: Matcher;
  onAction: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private handler: DropdownHandlerOption) {
    this.onAction = this.eventSource.asObservable();
    const dropdown = this.host;

    dropdown.classList.add('tanbo-editor-toolbar-dropdown');

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;
    dropdownButton.classList.add('tanbo-editor-toolbar-handler', ...(handler.classes || []));

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
    dropdownMenu.appendChild(handler.viewContents);

    dropdown.appendChild(dropdownButton);
    dropdown.appendChild(dropdownMenu);
  }

  updateStatus(status: MatchStatus): void {

  }
}
