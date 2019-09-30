import { Observable } from 'rxjs';

export class Dropdown {
  readonly elementRef = document.createElement('span');

  constructor(private button: HTMLElement,
              private menuContents: HTMLElement | DocumentFragment,
              private hideEvent: Observable<void>) {
    this.elementRef.classList.add('tanbo-editor-dropdown');

    this.elementRef.appendChild(button);
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
