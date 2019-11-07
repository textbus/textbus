import { Observable } from 'rxjs';
import { EventDelegate } from '../../help';

export interface DropdownHandlerView {
  elementRef: HTMLElement | DocumentFragment;

  updateStateByElement(el: HTMLElement): void;

  reset?(): void;

  setEventDelegator?(delegate: EventDelegate): void;
}

export class Dropdown {
  readonly elementRef = document.createElement('span');

  set disabled(v: boolean) {
    this.button.disabled = v;
  }

  set highlight(v: boolean) {
    if (v) {
      this.button.classList.add('tanbo-editor-handler-active');
    } else {
      this.button.classList.remove('tanbo-editor-handler-active');
    }
  }

  private button = document.createElement('button');

  constructor(private inner: HTMLElement,
              private menuContents: HTMLElement | DocumentFragment,
              private hideEvent: Observable<void>,
              private tooltip = '') {
    this.elementRef.classList.add('tanbo-editor-dropdown');

    this.button.classList.add('tanbo-editor-handler');
    this.button.type = 'button';
    this.button.title = tooltip;
    this.button.appendChild(inner);
    const dropdownArrow = document.createElement('span');
    dropdownArrow.classList.add('tanbo-editor-dropdown-caret');
    this.button.appendChild(dropdownArrow);

    this.elementRef.appendChild(this.button);

    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-dropdown-menu');
    menu.appendChild(menuContents);
    this.elementRef.appendChild(menu);

    const updatePosition = () => {
      if (this.elementRef.classList.contains('tanbo-editor-dropdown-open')) {
        const distance = document.body.clientWidth - (this.elementRef.getBoundingClientRect().left + menu.offsetWidth);
        menu.style.left = `${Math.min(0, distance)}px`;
      }
    };

    let isSelfClick = false;
    menu.addEventListener('click', () => {
      isSelfClick = true;
    });

    document.addEventListener('click', () => {
      if (!isSelfClick) {
        this.elementRef.classList.remove('tanbo-editor-dropdown-open');
      }
      isSelfClick = false;
    });
    this.button.addEventListener('click', () => {
      isSelfClick = true;
      this.elementRef.classList.toggle('tanbo-editor-dropdown-open');
      updatePosition();
    });

    window.addEventListener('resize', updatePosition);

    this.hideEvent.subscribe(() => {
      this.elementRef.classList.remove('tanbo-editor-dropdown-open');
    });
  }
}
