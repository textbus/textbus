import { Observable } from 'rxjs';

import { EventDelegate } from '../../help';
import { FormatAbstractData } from '../../../core/format-abstract-data';

export interface DropdownHandlerView {
  elementRef: HTMLElement | DocumentFragment;
  freezeState?: Observable<boolean>;

  update(value?: FormatAbstractData): void;

  reset?(): void;

  setEventDelegator?(delegate: EventDelegate): void;
}

export class Dropdown {
  readonly elementRef = document.createElement('span');
  freeze = false;

  set disabled(v: boolean) {
    this.button.disabled = v;
  }

  set highlight(v: boolean) {
    if (v) {
      this.button.classList.add('tbus-handler-active');
    } else {
      this.button.classList.remove('tbus-handler-active');
    }
  }

  private button = document.createElement('button');

  constructor(private inner: HTMLElement,
              private menuContents: HTMLElement | DocumentFragment,
              private hideEvent: Observable<any>,
              private tooltip = '',
              private limitDisplay: HTMLElement) {
    this.elementRef.classList.add('tbus-dropdown');

    this.button.classList.add('tbus-handler');
    this.button.type = 'button';
    this.button.title = tooltip;
    this.button.appendChild(inner);
    const dropdownArrow = document.createElement('span');
    dropdownArrow.classList.add('tbus-dropdown-caret');
    this.button.appendChild(dropdownArrow);

    this.elementRef.appendChild(this.button);

    const menu = document.createElement('div');
    menu.classList.add('tbus-dropdown-menu');
    menu.appendChild(menuContents);
    this.elementRef.appendChild(menu);

    const updatePosition = () => {
      if (this.elementRef.classList.contains('tbus-dropdown-open')) {
        const distance = this.limitDisplay.getBoundingClientRect().right - (this.elementRef.getBoundingClientRect().left + menu.offsetWidth);
        menu.style.left = `${Math.min(0, distance)}px`;
      }
    };

    let isSelfClick = false;
    menu.addEventListener('click', () => {
      isSelfClick = true;
    });

    document.addEventListener('click', () => {
      if (this.freeze) {
        return;
      }
      if (!isSelfClick) {
        this.elementRef.classList.remove('tbus-dropdown-open');
      }
      isSelfClick = false;
    });
    this.button.addEventListener('click', () => {
      isSelfClick = true;
      this.elementRef.classList.toggle('tbus-dropdown-open');
      updatePosition();
    });

    window.addEventListener('resize', updatePosition);

    this.hideEvent.subscribe(() => {
      this.freeze = false;
      this.elementRef.classList.remove('tbus-dropdown-open');
    });
  }
}
